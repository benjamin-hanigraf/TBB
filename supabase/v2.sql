-- ============ Thin Black Brush: database part 2 (admin app, payments, accounting) ============

-- 1. customer email on profiles (so the admin app can list customers)
alter table profiles add column if not exists email text;
update profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
-- make sure existing members already have a profile row
insert into profiles (id, email) select id, email from auth.users on conflict (id) do nothing;

-- 2. money in / money out (accounting)
create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  kind text not null check (kind in ('in','out')),
  category text not null,
  description text,
  amount_paise integer not null check (amount_paise > 0),   -- full amount, GST included
  gst_paise integer not null default 0 check (gst_paise >= 0), -- GST contained in the amount
  method text default 'other' check (method in ('upi','cash','card','bank','razorpay','other')),
  party text,                                                -- customer or supplier name
  source text not null default 'manual' check (source in ('manual','order','booking','invoice')),
  source_id uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists ledger_source_once on ledger_entries (source, source_id) where source_id is not null;
create index if not exists ledger_date on ledger_entries (entry_date);

-- 3. invoices made with the invoice generator
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text unique not null,
  issue_date date not null default current_date,
  due_date date,
  customer_name text not null, customer_email text, customer_phone text, customer_address text, customer_gstin text,
  items jsonb not null default '[]',        -- [{desc, qty, unit_paise}]
  discount_paise integer not null default 0,
  gst_enabled boolean not null default false, gst_rate numeric not null default 18,
  subtotal_paise integer not null, gst_paise integer not null default 0, total_paise integer not null,
  notes text,
  status text not null default 'draft' check (status in ('draft','sent','paid')),
  created_at timestamptz not null default now()
);

alter table ledger_entries enable row level security;
alter table invoices enable row level security;
drop policy if exists "admin ledger" on ledger_entries;
create policy "admin ledger" on ledger_entries for all using (is_admin()) with check (is_admin());
drop policy if exists "admin invoices" on invoices;
create policy "admin invoices" on invoices for all using (is_admin()) with check (is_admin());

-- 4. safe server-only helpers (only the website's server can call these)
create or replace function decrement_stock(p_id uuid, p_qty integer) returns boolean
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update products set stock = stock - p_qty where id = p_id and stock >= p_qty;
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function book_seats(p_workshop uuid, p_user uuid, p_name text, p_email text, p_phone text, p_seats integer, p_amount integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare w workshops; taken integer; new_id uuid;
begin
  select * into w from workshops where id = p_workshop for update;       -- lock so two people cannot take the last seat
  if not found or w.status <> 'published' or w.starts_at <= now() then raise exception 'closed'; end if;
  select coalesce(sum(seats),0) into taken from bookings
    where workshop_id = p_workshop and (status = 'paid' or (status = 'pending' and created_at > now() - interval '30 minutes'));
  if taken + p_seats > w.capacity then raise exception 'sold_out'; end if;
  insert into bookings (workshop_id, user_id, name, email, phone, seats, amount_paise)
    values (p_workshop, p_user, p_name, p_email, p_phone, p_seats, p_amount) returning id into new_id;
  return new_id;
end $$;

revoke all on function decrement_stock(uuid, integer) from public, anon, authenticated;
revoke all on function book_seats(uuid, uuid, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function decrement_stock(uuid, integer) to service_role;
grant execute on function book_seats(uuid, uuid, text, text, text, integer, integer) to service_role;

-- 5. make sure the server (service role) and admin can reach every table
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
