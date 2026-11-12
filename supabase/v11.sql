-- ============ Part 11: rent-outs, order numbers, classes without batches, editable manual orders, cancelled workshops hidden ============
-- Run after v10. Safe to run twice.

-- 1. studio rent-outs (the studio is hired by someone else). Paid ones go into the accounts as income.
create table if not exists rentouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,                              -- who hired the studio
  phone text, email text, purpose text,
  on_date date not null, end_date date, time_text text,
  amount_paise integer not null default 0 check (amount_paise >= 0),
  paid boolean not null default false, paid_on date, method text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists rentouts_date on rentouts (on_date);
alter table rentouts enable row level security;
drop policy if exists "admin rentouts" on rentouts; create policy "admin rentouts" on rentouts for all using (is_admin()) with check (is_admin());
grant all on rentouts to service_role;
alter table ledger_entries drop constraint if exists ledger_entries_source_check;
alter table ledger_entries add constraint ledger_entries_source_check check (source in ('manual','invoice','order','booking','enrolment','refund','fee','rentout'));

-- 2. order numbers (shown to the owner and on receipts; the look of the number is set in Settings)
create sequence if not exists order_seq start 1;
alter table orders add column if not exists order_no bigint;
do $$
declare r record;
begin
  for r in select id from orders where order_no is null order by created_at, id loop
    update orders set order_no = nextval('order_seq') where id = r.id;
  end loop;
end $$;
alter table orders alter column order_no set default nextval('order_seq');
create unique index if not exists orders_order_no on orders (order_no);
create or replace function set_order_start(n bigint) returns void language plpgsql security definer set search_path = public as $$
declare cur bigint;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  select case when is_called then last_value else 0 end into cur from order_seq;
  perform setval('order_seq', greatest(n - 1, cur), true);
end $$;
revoke all on function set_order_start(bigint) from public, anon; grant execute on function set_order_start(bigint) to authenticated;
insert into settings (key, value, is_public) values ('order', '{"format":"ORD-####","start":1}', false) on conflict (key) do nothing;
insert into settings (key, value, is_public) values ('store', '{"shipping_note":"","return_note":""}', false) on conflict (key) do nothing;

-- 3. classes are one-on-one: each class belongs to the student (the enrolment) directly, no batch needed
alter table class_sessions add column if not exists enrolment_id uuid references class_enrolments(id) on delete cascade;
alter table class_sessions alter column batch_id drop not null;
create index if not exists sessions_enrolment on class_sessions (enrolment_id, on_date);
update class_sessions s set enrolment_id = (select e.id from class_enrolments e where e.batch_id = s.batch_id order by e.created_at limit 1)
  from class_batches b where b.id = s.batch_id and b.solo and s.enrolment_id is null;
-- a student cannot "miss" a class any more: one that was marked missed goes back to scheduled
update class_sessions set status = 'scheduled'
  where enrolment_id is not null and status = 'done' and exists (select 1 from class_attendance a where a.session_id = class_sessions.id and a.present = false);
create unique index if not exists sessions_enrolment_no on class_sessions (enrolment_id, no) where enrolment_id is not null;

-- 4. a cancelled workshop is never shown on the website (only published ones are)
drop view if exists workshops_public;
create view workshops_public with (security_invoker = false) as
select w.*, (w.starts_at < now()) as is_past,
  greatest(w.capacity - coalesce((select sum(b.seats) from bookings b
     where b.workshop_id = w.id and b.status in ('paid','pending')
       and (b.status = 'paid' or b.created_at > now() - interval '30 minutes')),0),0) as seats_left
from workshops w where w.status = 'published';
grant select on workshops_public to anon, authenticated;

-- 5. manual orders: "added manually" wording, and they can be edited (items, customer, address, shipping)
update ledger_entries set description = 'Order added manually' where description = 'Order added by hand';
create or replace function admin_add_order(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare oid uuid; it jsonb; paid boolean := (p->>'pay') = 'paid'; gst int := 0; total int := (p->>'total_paise')::int;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  insert into orders (name, email, phone, shipping_address, subtotal_paise, shipping_paise, total_paise, status, channel, payment_method, paid_at)
  values (p->>'name', coalesce(p->>'email',''), coalesce(p->>'phone',''), coalesce(p->'address','{}'::jsonb), (p->>'subtotal_paise')::int, (p->>'shipping_paise')::int, total,
          case when paid then 'paid' else 'pending' end, 'manual', case when paid then p->>'method' end, case when paid then now() end)
  returning id into oid;
  for it in select * from jsonb_array_elements(p->'items') loop
    insert into order_items (order_id, product_id, title, unit_paise, qty, gst_paise)
    values (oid, nullif(it->>'product_id','')::uuid, it->>'title', (it->>'unit_paise')::int, (it->>'qty')::int, coalesce((it->>'gst_paise')::int, 0));
    gst := gst + coalesce((it->>'gst_paise')::int, 0);
  end loop;
  if paid then
    perform order_stock_internal(oid, true);
    if total > 0 then
      insert into ledger_entries (entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id)
      values ((now() at time zone 'Asia/Kolkata')::date, 'in', 'Store sales', 'Order added manually', total, gst, coalesce(p->>'method','other'), p->>'name', 'order', oid) on conflict do nothing;
    end if;
  end if;
  return oid;
end $$;
revoke all on function admin_add_order(jsonb) from public; grant execute on function admin_add_order(jsonb) to authenticated;

create or replace function admin_update_order(p jsonb) returns void language plpgsql security definer set search_path = public as $$
declare oid uuid := (p->>'id')::uuid; o orders%rowtype; it jsonb; gst int := 0; total int := (p->>'total_paise')::int; had boolean;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  select * into o from orders where id = oid for update;
  if not found then raise exception 'order not found'; end if;
  if o.channel <> 'manual' then raise exception 'only orders added manually can be edited'; end if;
  had := o.status in ('paid','packed','shipped','delivered');
  if had then perform order_stock_internal(oid, false); end if;              -- the old items go back to stock first
  delete from order_items where order_id = oid;
  update orders set name = p->>'name', email = coalesce(p->>'email',''), phone = coalesce(p->>'phone',''), shipping_address = coalesce(p->'address','{}'::jsonb),
    subtotal_paise = (p->>'subtotal_paise')::int, shipping_paise = (p->>'shipping_paise')::int, total_paise = total where id = oid;
  for it in select * from jsonb_array_elements(p->'items') loop
    insert into order_items (order_id, product_id, title, unit_paise, qty, gst_paise)
    values (oid, nullif(it->>'product_id','')::uuid, it->>'title', (it->>'unit_paise')::int, (it->>'qty')::int, coalesce((it->>'gst_paise')::int, 0));
    gst := gst + coalesce((it->>'gst_paise')::int, 0);
  end loop;
  if had then                                                                -- ...and the new items are taken, and the accounts entry follows the new total
    perform order_stock_internal(oid, true);
    if total > 0 then
      update ledger_entries set amount_paise = total, gst_paise = gst, party = p->>'name' where source = 'order' and source_id = oid;
      if not found then insert into ledger_entries (entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id)
        values ((now() at time zone 'Asia/Kolkata')::date, 'in', 'Store sales', 'Order added manually', total, gst, coalesce(o.payment_method,'other'), p->>'name', 'order', oid); end if;
    else delete from ledger_entries where source = 'order' and source_id = oid; end if;
  end if;
end $$;
revoke all on function admin_update_order(jsonb) from public, anon; grant execute on function admin_update_order(jsonb) to authenticated;

-- 6. index for the calendar
create index if not exists events_date on events (on_date);
