-- ============ Part 6: early-bird prices, GST per product, class types and schedule, manual entries, to-dos ============
-- Run after v5. Safe to run twice.

-- 1. workshops: early-bird price (and the day it ends)
alter table workshops add column if not exists early_price_paise integer check (early_price_paise is null or early_price_paise >= 0);
alter table workshops add column if not exists early_until date;

-- 2. products: GST treatment ('none' = no GST, 'add' = 18% added on top, 'included' = price already includes GST)
alter table products add column if not exists gst_mode text not null default 'none';
alter table products drop constraint if exists products_gst_mode_check;
alter table products add constraint products_gst_mode_check check (gst_mode in ('none','add','included'));
alter table order_items add column if not exists gst_paise integer not null default 0;

-- 3. class types (the drop-down on the class form) and class schedule (shown in the calendar)
create table if not exists class_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  sort_order integer not null default 0
);
insert into class_types (name, sort_order) values ('Handwriting', 1), ('Handwriting + Calligraphy', 2) on conflict (name) do nothing;
alter table class_levels drop constraint if exists class_levels_track_check;
update class_levels set track = 'Handwriting' where track = 'handwriting';
update class_levels set track = 'Handwriting + Calligraphy' where track = 'calligraphy';
alter table class_levels add column if not exists starts_on date;
alter table class_levels add column if not exists days integer[] not null default '{}';   -- 0 = Sunday ... 6 = Saturday
alter table class_levels add column if not exists time_text text;
alter table class_types enable row level security;
drop policy if exists "public read class types" on class_types;
create policy "public read class types" on class_types for select using (true);
drop policy if exists "admin write class types" on class_types;
create policy "admin write class types" on class_types for all using (is_admin()) with check (is_admin());
grant all on class_types to service_role;

-- 4. children are 5 to 15 (older rows are left alone)
alter table class_enrolments drop constraint if exists class_enrolments_student_age_check;
alter table class_enrolments add constraint class_enrolments_student_age_check check (student_age is null or student_age between 5 and 15) not valid;

-- 5. orders, workshop sign-ups and class enrolments added by hand
alter table orders add column if not exists channel text not null default 'website';
alter table bookings add column if not exists channel text not null default 'website';
alter table class_enrolments add column if not exists channel text not null default 'website';
alter table orders add column if not exists payment_method text;
alter table bookings add column if not exists payment_method text;
alter table class_enrolments add column if not exists payment_method text;
drop policy if exists "admin manage orders" on orders;
create policy "admin manage orders" on orders for all using (is_admin()) with check (is_admin());
drop policy if exists "admin manage bookings" on bookings;
create policy "admin manage bookings" on bookings for all using (is_admin()) with check (is_admin());
drop policy if exists "admin manage enrolments" on class_enrolments;
create policy "admin manage enrolments" on class_enrolments for all using (is_admin()) with check (is_admin());
drop policy if exists "admin manage order items" on order_items;
create policy "admin manage order items" on order_items for all using (is_admin()) with check (is_admin());

-- 6. invoices: when and how they were paid
alter table invoices add column if not exists paid_on date;
alter table invoices add column if not exists payment_method text;

-- 7. to-do list and reminders
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text,
  due_on date,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
alter table todos enable row level security;
drop policy if exists "admin todos" on todos;
create policy "admin todos" on todos for all using (is_admin()) with check (is_admin());
grant all on todos to service_role;

-- 8. sign-ups now also give a name and phone number: save both, and list the member under customers
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  nm text := coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'),''), nullif(btrim(new.raw_user_meta_data->>'name'),''));
  ph text := nullif(btrim(new.raw_user_meta_data->>'phone'),'');
begin
  insert into profiles (id, full_name, email, phone) values (new.id, nm, new.email, ph) on conflict (id) do nothing;
  if new.email is not null then
    insert into customers (name, email, phone, user_id, source) values (coalesce(nm, split_part(new.email,'@',1)), new.email, ph, new.id, 'website')
    on conflict (email) do update set user_id = coalesce(customers.user_id, excluded.user_id), phone = coalesce(customers.phone, excluded.phone),
      name = case when customers.name = split_part(customers.email,'@',1) and excluded.name <> '' then excluded.name else customers.name end;
  end if;
  return new;
end $$;

-- 9. a few indexes so the Manager opens faster
create index if not exists orders_status_created on orders (status, created_at desc);
create index if not exists bookings_status_created on bookings (status, created_at desc);
create index if not exists enrol_status_created on class_enrolments (status, created_at desc);
create index if not exists enquiries_created on enquiries (created_at desc);
create index if not exists customers_phone on customers (phone);
create index if not exists ledger_kind_date on ledger_entries (kind, entry_date desc);
create index if not exists todos_open on todos (done, due_on);

-- 10. the public workshop list must also carry the new early-bird columns
drop view if exists workshops_public;
create view workshops_public with (security_invoker = false) as
select w.*, (w.starts_at < now()) as is_past,
  greatest(w.capacity - coalesce((select sum(b.seats) from bookings b
     where b.workshop_id = w.id and b.status in ('paid','pending')
       and (b.status = 'paid' or b.created_at > now() - interval '30 minutes')),0),0) as seats_left
from workshops w where w.status in ('published','cancelled');
grant select on workshops_public to anon, authenticated;
