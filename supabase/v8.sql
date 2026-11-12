-- ============ Part 8: class batches and attendance, calendar events, waitlist, GST on workshops and classes,
-- one invoice number series, quotations and part payments, safer manual orders, faster customer totals, clean-up ============
-- Run after v7. Safe to run twice.

-- 1. GST on workshops and class levels ('none', 'add' = 18% on top, 'included'), and the GST on each booking and enrolment
alter table workshops add column if not exists gst_mode text not null default 'none';
alter table workshops drop constraint if exists workshops_gst_mode_check;
alter table workshops add constraint workshops_gst_mode_check check (gst_mode in ('none','add','included'));
alter table class_levels add column if not exists gst_mode text not null default 'none';
alter table class_levels drop constraint if exists class_levels_gst_mode_check;
alter table class_levels add constraint class_levels_gst_mode_check check (gst_mode in ('none','add','included'));
alter table bookings add column if not exists gst_paise integer not null default 0;
alter table class_enrolments add column if not exists gst_paise integer not null default 0;

-- 2. clean-up: the saved-address table and an unused workshop column are removed (the public workshop list is rebuilt below)
drop view if exists workshops_public;
drop table if exists addresses cascade;
alter table workshops drop column if exists terms;
create view workshops_public with (security_invoker = false) as
select w.*, (w.starts_at < now()) as is_past,
  greatest(w.capacity - coalesce((select sum(b.seats) from bookings b
     where b.workshop_id = w.id and b.status in ('paid','pending')
       and (b.status = 'paid' or b.created_at > now() - interval '30 minutes')),0),0) as seats_left
from workshops w where w.status in ('published','cancelled');
grant select on workshops_public to anon, authenticated;

-- 3. accounts: payment gateway fees can be recorded automatically; an internal note on orders
alter table ledger_entries drop constraint if exists ledger_entries_source_check;
alter table ledger_entries add constraint ledger_entries_source_check check (source in ('manual','invoice','order','booking','enrolment','refund','fee'));
alter table orders add column if not exists notes text;
insert into settings (key, value, is_public) values ('gateway', '{"fee_percent": 2}', false) on conflict (key) do nothing;

-- 4. class batches, their dated classes, and who attended
create table if not exists class_batches (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references class_levels(id) on delete cascade,
  name text,
  starts_on date not null,
  days integer[] not null default '{}',                 -- 0 = Sunday ... 6 = Saturday
  time_text text,
  sessions integer not null default 8 check (sessions between 1 and 200),
  capacity integer check (capacity is null or capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists class_sessions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references class_batches(id) on delete cascade,
  no integer not null,
  on_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled','done','cancelled')),
  moved_from date,
  note text,
  unique (batch_id, no)
);
create table if not exists class_attendance (
  session_id uuid not null references class_sessions(id) on delete cascade,
  enrolment_id uuid not null references class_enrolments(id) on delete cascade,
  present boolean not null,
  primary key (session_id, enrolment_id)
);
alter table class_enrolments add column if not exists batch_id uuid references class_batches(id) on delete set null;
create index if not exists enrol_batch on class_enrolments (batch_id);
create index if not exists sessions_date on class_sessions (on_date);
alter table class_batches enable row level security; alter table class_sessions enable row level security; alter table class_attendance enable row level security;
drop policy if exists "admin batches" on class_batches;    create policy "admin batches" on class_batches for all using (is_admin()) with check (is_admin());
drop policy if exists "admin sessions" on class_sessions;  create policy "admin sessions" on class_sessions for all using (is_admin()) with check (is_admin());
drop policy if exists "admin attendance" on class_attendance; create policy "admin attendance" on class_attendance for all using (is_admin()) with check (is_admin());
grant all on class_batches, class_sessions, class_attendance to service_role;

-- classes already scheduled on a level become its first batch
do $$
declare lv record; b uuid; d date; n int; ds int[];
begin
  for lv in select * from class_levels where starts_on is not null loop
    if exists (select 1 from class_batches where class_id = lv.id) then continue; end if;
    ds := case when coalesce(array_length(lv.days,1),0) > 0 then lv.days else array[extract(dow from lv.starts_on)::int] end;
    insert into class_batches (class_id, name, starts_on, days, time_text, sessions) values (lv.id, 'First batch', lv.starts_on, ds, lv.time_text, lv.sessions) returning id into b;
    d := lv.starts_on; n := 0;
    while n < lv.sessions and d < lv.starts_on + 800 loop
      if extract(dow from d)::int = any(ds) then n := n + 1; insert into class_sessions (batch_id, no, on_date) values (b, n, d); end if;
      d := d + 1;
    end loop;
    update class_enrolments set batch_id = b where class_id = lv.id and status in ('paid','transferred');
  end loop;
end $$;

-- 5. calendar events added by hand, and the workshop waitlist
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null, note text,
  on_date date not null, end_date date, time_text text,
  created_at timestamptz not null default now()
);
alter table events enable row level security;
drop policy if exists "admin events" on events; create policy "admin events" on events for all using (is_admin()) with check (is_admin());
grant all on events to service_role;
create table if not exists workshop_waitlist (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references workshops(id) on delete cascade,
  name text not null, email text not null, phone text,
  seats integer not null default 1 check (seats between 1 and 10),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists waitlist_workshop on workshop_waitlist (workshop_id);
alter table workshop_waitlist enable row level security;
drop policy if exists "admin waitlist" on workshop_waitlist; create policy "admin waitlist" on workshop_waitlist for all using (is_admin()) with check (is_admin());
grant all on workshop_waitlist to service_role;

-- 6. one invoice number series for website receipts and invoices made by hand
create or replace function next_invoice_number() returns bigint language plpgsql security definer set search_path = public as $$
begin if not is_admin() then raise exception 'not allowed'; end if; return nextval('invoice_seq'); end $$;
create or replace function set_invoice_start(n bigint) returns void language plpgsql security definer set search_path = public as $$
declare cur bigint;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  select case when is_called then last_value else 0 end into cur from invoice_seq;
  perform setval('invoice_seq', greatest(n - 1, cur), true);
end $$;
revoke all on function next_invoice_number() from public; revoke all on function set_invoice_start(bigint) from public;
grant execute on function next_invoice_number() to authenticated; grant execute on function set_invoice_start(bigint) to authenticated;

-- 7. invoices: quotations, credit notes, part payments, reminders
alter table invoices add column if not exists doc_type text not null default 'invoice';
alter table invoices drop constraint if exists invoices_doc_type_check;
alter table invoices add constraint invoices_doc_type_check check (doc_type in ('invoice','quotation','credit_note'));
alter table invoices add column if not exists against_no text;
alter table invoices add column if not exists last_reminder_at timestamptz;
alter table invoices drop constraint if exists invoices_status_check;
alter table invoices add constraint invoices_status_check check (status in ('draft','sent','paid','accepted','cancelled'));
create table if not exists invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount_paise integer not null check (amount_paise > 0),
  paid_on date not null default current_date,
  method text, note text,
  created_at timestamptz not null default now()
);
create index if not exists invoice_payments_invoice on invoice_payments (invoice_id);
alter table invoice_payments enable row level security;
drop policy if exists "admin invoice payments" on invoice_payments; create policy "admin invoice payments" on invoice_payments for all using (is_admin()) with check (is_admin());
grant all on invoice_payments to service_role;
-- invoices already marked paid become one full payment (the payment keeps the invoice's id, so its accounts entry stays linked)
insert into invoice_payments (id, invoice_id, amount_paise, paid_on, method)
  select i.id, i.id, i.total_paise, coalesce(i.paid_on, i.issue_date), i.payment_method from invoices i
  where i.status = 'paid' and not exists (select 1 from invoice_payments p where p.invoice_id = i.id) on conflict do nothing;

-- 8. a manual order is saved in one step: order, items, stock and the accounts entry all together
create or replace function admin_add_order(p jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare oid uuid; it jsonb; paid boolean := (p->>'pay') = 'paid'; gst int := 0; total int := (p->>'total_paise')::int;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  insert into orders (name, email, phone, shipping_address, subtotal_paise, shipping_paise, total_paise, status, channel, payment_method, paid_at, notes)
  values (p->>'name', coalesce(p->>'email',''), coalesce(p->>'phone',''), coalesce(p->'address','{}'::jsonb), (p->>'subtotal_paise')::int, (p->>'shipping_paise')::int, total,
          case when paid then 'paid' else 'pending' end, 'manual', case when paid then p->>'method' end, case when paid then now() end, nullif(p->>'notes',''))
  returning id into oid;
  for it in select * from jsonb_array_elements(p->'items') loop
    insert into order_items (order_id, product_id, title, unit_paise, qty, gst_paise)
    values (oid, nullif(it->>'product_id','')::uuid, it->>'title', (it->>'unit_paise')::int, (it->>'qty')::int, coalesce((it->>'gst_paise')::int, 0));
    gst := gst + coalesce((it->>'gst_paise')::int, 0);
    if paid and nullif(it->>'product_id','') is not null then update products set stock = greatest(stock - (it->>'qty')::int, 0) where id = (it->>'product_id')::uuid; end if;
  end loop;
  if paid then
    insert into ledger_entries (entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id)
    values ((now() at time zone 'Asia/Kolkata')::date, 'in', 'Store sales', 'Order added by hand', total, gst, coalesce(p->>'method','other'), p->>'name', 'order', oid) on conflict do nothing;
  end if;
  return oid;
end $$;
revoke all on function admin_add_order(jsonb) from public; grant execute on function admin_add_order(jsonb) to authenticated;

-- 9. what each customer has bought, counted in the database (matched by email or phone) so the Customers page stays fast
create or replace function customer_summary() returns table (customer_id uuid, orders int, bookings int, classes int, spent_paise bigint, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  with c as (select id, lower(coalesce(email,'')) e, right(regexp_replace(coalesce(phone,''),'\D','','g'),10) ph from customers),
  p as (
    select 'o' k, lower(coalesce(email,'')) e, right(regexp_replace(coalesce(phone,''),'\D','','g'),10) ph, total_paise amt, coalesce(paid_at, created_at) at from orders where status in ('paid','packed','shipped','delivered')
    union all select 'b', lower(coalesce(email,'')), right(regexp_replace(coalesce(phone,''),'\D','','g'),10), amount_paise, coalesce(paid_at, created_at) from bookings where status = 'paid'
    union all select 'c', lower(coalesce(email,'')), right(regexp_replace(coalesce(phone,''),'\D','','g'),10), amount_paise, coalesce(paid_at, created_at) from class_enrolments where status = 'paid')
  select c.id, count(*) filter (where p.k = 'o')::int, count(*) filter (where p.k = 'b')::int, count(*) filter (where p.k = 'c')::int, coalesce(sum(p.amt), 0)::bigint, max(p.at)
  from c left join p on (c.e <> '' and p.e = c.e) or (length(c.ph) = 10 and p.ph = c.ph)
  where is_admin() group by c.id
$$;
revoke all on function customer_summary() from public; grant execute on function customer_summary() to authenticated;

-- 10. studio address: footer and receipts use two lines, the contact page box uses three. Prefixes for quotations and credit notes.
update settings set value = value || jsonb_build_object('address', E'2nd Floor, Berachah Building, 13/7, 1st Cross St,\nTrustpuram, Kodambakkam, Chennai - 600024.'::text,
  'address_contact', E'2nd Floor, Berachah Building,\n13/7, 1st Cross St, Trustpuram,\nKodambakkam, Chennai - 600024.'::text) where key = 'business';
update settings set value = jsonb_build_object('quotation_prefix', 'TBB-Q/YYYY-YY', 'credit_prefix', 'TBB-CN/YYYY-YY') || value where key = 'invoice';

-- 11. more indexes
create index if not exists ledger_source on ledger_entries (source, source_id);
create index if not exists enrol_class on class_enrolments (class_id, status);
