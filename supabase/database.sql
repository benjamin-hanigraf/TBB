-- ============================================================================================
-- THIN BLACK BRUSH DATABASE: ONE FILE, ALWAYS THE COMPLETE LATEST VERSION
--
-- How to use: open Supabase > SQL Editor, paste this whole file, press Run.
--   * On a new empty project it builds everything.
--   * On your existing database it brings it up to date. Nothing you entered is deleted or reset.
--   * It is safe to run again at any time. If anything fails, nothing at all is changed.
-- For a future database change, this same file is edited (no new files), then run again.
-- Money is stored in paise (Rs 1 = 100 paise) to avoid rounding errors.
-- Test data (optional): supabase/dummy.sql, removed again with supabase/dummy-remove.sql.
-- ============================================================================================
begin;
create extension if not exists pgcrypto;
create sequence if not exists invoice_seq start 1001;     -- receipt and invoice numbers
create sequence if not exists order_seq start 1;          -- order numbers
drop view if exists workshops_public;                     -- rebuilt at the end (it depends on the workshops columns)

-- ---------------------------------------------------------------- people
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, email text,
  role text not null default 'customer' check (role in ('customer','admin')),
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);
alter table profiles add column if not exists email text;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

-- stop customers from making themselves admin
create or replace function protect_role() returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and not is_admin() and auth.uid() is not null then raise exception 'Not allowed'; end if;
  return new;
end $$;
drop trigger if exists profiles_protect_role on profiles;
create trigger profiles_protect_role before update on profiles for each row execute function protect_role();

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  phone text,
  address_line1 text, address_line2 text, city text, state text, pincode text,
  notes text,
  source text not null default 'website' check (source in ('website','wix','manual','import')),
  marketing_opt_in boolean not null default false,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists customers_phone on customers (phone);
create or replace function customers_tidy() returns trigger language plpgsql as $$
begin new.email := nullif(lower(btrim(new.email)), ''); new.name := btrim(new.name); return new; end $$;
drop trigger if exists customers_tidy_trg on customers;
create trigger customers_tidy_trg before insert or update on customers for each row execute function customers_tidy();

-- every new sign-up gets a profile and is listed under customers (with the name and phone they gave)
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
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------------------------------------------------------------- workshops
create table if not exists workshops (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null, summary text, description text,
  kind text not null default 'workshop' check (kind in ('workshop','course')),
  venue_name text, venue_address text, map_link text,
  starts_at timestamptz not null, ends_at timestamptz,
  price_paise integer not null check (price_paise >= 0),
  friend_price_paise integer,                              -- "bring a friend" price per person
  early_price_paise integer check (early_price_paise is null or early_price_paise >= 0), early_until date,
  gst_mode text not null default 'none' check (gst_mode in ('none','add','included')),   -- 'add' = 18% on top, 'included' = price already contains it
  capacity integer not null default 12 check (capacity > 0),
  includes text[] default '{}',                            -- what is in the kit
  learn text[] default '{}', note text,
  image_path text,
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  created_at timestamptz not null default now()
);
alter table workshops add column if not exists learn text[] default '{}';
alter table workshops add column if not exists note text;
alter table workshops add column if not exists early_price_paise integer;
alter table workshops add column if not exists early_until date;
alter table workshops add column if not exists gst_mode text not null default 'none';
alter table workshops drop constraint if exists workshops_early_price_paise_check;
alter table workshops add constraint workshops_early_price_paise_check check (early_price_paise is null or early_price_paise >= 0);
alter table workshops drop constraint if exists workshops_gst_mode_check;
alter table workshops add constraint workshops_gst_mode_check check (gst_mode in ('none','add','included'));
alter table workshops drop column if exists terms;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references workshops(id),
  user_id uuid references auth.users(id) on delete set null,
  name text not null, email text not null, phone text not null,
  seats integer not null default 1 check (seats between 1 and 10),
  amount_paise integer not null,
  gst_paise integer not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded','transferred')),
  channel text not null default 'website',                 -- 'website' or 'manual' (added in the Manager)
  payment_method text,
  razorpay_order_id text unique, razorpay_payment_id text unique,   -- the payment provider's ids (names kept from the first provider)
  invoice_no bigint default nextval('invoice_seq'),
  notes text, created_at timestamptz not null default now(), paid_at timestamptz
);
alter table bookings add column if not exists channel text not null default 'website';
alter table bookings add column if not exists payment_method text;
alter table bookings add column if not exists gst_paise integer not null default 0;
create index if not exists bookings_workshop_id_status_idx on bookings (workshop_id, status);
create index if not exists bookings_status_created on bookings (status, created_at desc);

-- the waiting list feature was removed; its table goes
drop table if exists workshop_waitlist cascade;

-- ---------------------------------------------------------------- classes (one-on-one: every student has their own class dates)
create table if not exists class_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  sort_order integer not null default 0
);
create table if not exists class_levels (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  track text not null,                                     -- the class type, e.g. Handwriting
  title text not null, level text not null, description text,
  covers text[] not null default '{}',
  price_paise integer not null check (price_paise >= 0),
  gst_mode text not null default 'none' check (gst_mode in ('none','add','included')),
  sessions integer not null default 8,
  active boolean not null default true,
  sort_order integer not null default 0
);
alter table class_levels add column if not exists gst_mode text not null default 'none';
alter table class_levels drop constraint if exists class_levels_gst_mode_check;
alter table class_levels add constraint class_levels_gst_mode_check check (gst_mode in ('none','add','included'));
alter table class_levels drop constraint if exists class_levels_track_check;

create table if not exists class_enrolments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references class_levels(id),
  user_id uuid references auth.users(id) on delete set null,
  student_name text not null,
  student_group text not null check (student_group in ('child','adult')),
  student_age integer,
  name text not null, email text not null, phone text not null,
  amount_paise integer not null,
  gst_paise integer not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded','transferred')),
  channel text not null default 'website',
  payment_method text,
  razorpay_order_id text unique, razorpay_payment_id text unique,
  invoice_no bigint default nextval('invoice_seq'),
  notes text, created_at timestamptz not null default now(), paid_at timestamptz
);
alter table class_enrolments add column if not exists channel text not null default 'website';
alter table class_enrolments add column if not exists payment_method text;
alter table class_enrolments add column if not exists gst_paise integer not null default 0;
alter table class_enrolments drop constraint if exists class_enrolments_student_age_check;
alter table class_enrolments add constraint class_enrolments_student_age_check check (student_age is null or student_age between 5 and 15) not valid;   -- children are 5 to 15
create index if not exists enrol_user on class_enrolments (user_id);
create index if not exists enrol_class on class_enrolments (class_id, status);
create index if not exists enrol_status_created on class_enrolments (status, created_at desc);

-- the dated classes of one student
create table if not exists class_sessions (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references class_enrolments(id) on delete cascade,
  no integer not null,                                     -- 1, 2, 3... in date order
  on_date date not null, time_text text,
  status text not null default 'scheduled' check (status in ('scheduled','done','cancelled')),   -- done = attended
  moved_from date, note text
);
alter table class_sessions add column if not exists enrolment_id uuid references class_enrolments(id) on delete cascade;
alter table class_sessions add column if not exists time_text text;

-- Older databases had class batches (groups). Classes are one-on-one now: each class moves to its student, then the batch structures go.
do $$
begin
  if to_regclass('public.class_batches') is not null then
    -- a private schedule (one student) keeps its classes; a class that was marked "missed" goes back to scheduled
    update class_sessions s set enrolment_id = (select e.id from class_enrolments e where e.batch_id = s.batch_id order by e.created_at limit 1)
      from class_batches b where b.id = s.batch_id and b.solo and s.enrolment_id is null;
    if to_regclass('public.class_attendance') is not null then
      update class_sessions set status = 'scheduled' where enrolment_id is not null and status = 'done'
        and exists (select 1 from class_attendance a where a.session_id = class_sessions.id and a.present = false);
    end if;
    delete from class_sessions where enrolment_id is null;   -- classes of a group have no single student any more
  end if;
end $$;
drop table if exists class_attendance;
drop table if exists class_batches cascade;
alter table class_sessions drop column if exists batch_id;
alter table class_enrolments drop column if exists batch_id;
alter table class_levels drop column if exists starts_on;
alter table class_levels drop column if exists days;
alter table class_levels drop column if exists time_text;
delete from class_sessions where enrolment_id is null;
alter table class_sessions alter column enrolment_id set not null;
create unique index if not exists sessions_enrolment_no on class_sessions (enrolment_id, no) where enrolment_id is not null;
create index if not exists sessions_enrolment on class_sessions (enrolment_id, on_date);
create index if not exists sessions_date on class_sessions (on_date);

-- ---------------------------------------------------------------- store and orders
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null, description text,
  details text[] default '{}',                             -- bullet points (size, paper...)
  price_paise integer not null check (price_paise >= 0),
  gst_mode text not null default 'none' check (gst_mode in ('none','add','included')),
  stock integer not null default 0 check (stock >= 0),
  allow_preorder boolean not null default false,
  images text[] default '{}',                              -- first = cover
  shipping_note text, return_note text,
  active boolean not null default true,
  sort_order integer default 0,
  created_at timestamptz not null default now()
);
alter table products add column if not exists gst_mode text not null default 'none';
alter table products drop constraint if exists products_gst_mode_check;
alter table products add constraint products_gst_mode_check check (gst_mode in ('none','add','included'));

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null, email text not null, phone text not null,
  shipping_address jsonb not null,
  subtotal_paise integer not null, shipping_paise integer not null default 0,
  total_paise integer not null,
  gift_message text,
  status text not null default 'pending' check (status in ('pending','paid','packed','shipped','delivered','cancelled','refunded')),
  tracking_carrier text, tracking_number text,
  channel text not null default 'website',                 -- 'website' or 'manual'
  payment_method text,
  notes text,
  razorpay_order_id text unique, razorpay_payment_id text unique,
  invoice_no bigint default nextval('invoice_seq'),        -- the receipt number
  order_no bigint default nextval('order_seq'),            -- the order number (its look is chosen in Settings)
  created_at timestamptz not null default now(), paid_at timestamptz
);
alter table orders add column if not exists channel text not null default 'website';
alter table orders add column if not exists payment_method text;
alter table orders add column if not exists notes text;
alter table orders add column if not exists order_no bigint;
do $$
declare r record;
begin
  for r in select id from orders where order_no is null order by created_at, id loop update orders set order_no = nextval('order_seq') where id = r.id; end loop;
end $$;
alter table orders alter column order_no set default nextval('order_seq');
create unique index if not exists orders_order_no on orders (order_no);
create index if not exists orders_status_created on orders (status, created_at desc);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  title text not null, unit_paise integer not null, qty integer not null check (qty > 0),
  gst_paise integer not null default 0,
  stock_taken integer                                      -- how many units this line took from stock (so a cancel or refund can give back exactly that many)
);
alter table order_items add column if not exists gst_paise integer not null default 0;
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'order_items' and column_name = 'stock_taken') then
    alter table order_items add column stock_taken integer;
    update order_items i set stock_taken = i.qty from orders o where o.id = i.order_id and i.product_id is not null and o.status in ('paid','packed','shipped','delivered');
  end if;
end $$;

-- ---------------------------------------------------------------- money
create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  kind text not null check (kind in ('in','out')),
  category text not null,
  description text,
  amount_paise integer not null check (amount_paise > 0),  -- full amount, GST included
  gst_paise integer not null default 0 check (gst_paise >= 0),   -- GST contained in the amount
  method text default 'other' check (method in ('upi','cash','card','bank','tds','razorpay','other')),
  party text,                                              -- customer or supplier name
  source text not null default 'manual',
  source_id uuid,
  created_at timestamptz not null default now()
);
alter table ledger_entries drop constraint if exists ledger_entries_method_check;
alter table ledger_entries add constraint ledger_entries_method_check check (method is null or method in ('upi','cash','card','bank','tds','razorpay','other'));      -- tds added; card is shown as Bank/Card
alter table ledger_entries drop constraint if exists ledger_entries_source_check;
alter table ledger_entries add constraint ledger_entries_source_check check (source in ('manual','invoice','order','booking','enrolment','refund','fee','rentout'));
create unique index if not exists ledger_source_once on ledger_entries (source, source_id) where source_id is not null;
create index if not exists ledger_date on ledger_entries (entry_date);
create index if not exists ledger_kind_date on ledger_entries (kind, entry_date desc);
create index if not exists ledger_source on ledger_entries (source, source_id);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null default 'invoice' check (doc_type in ('invoice','quotation','credit_note')),
  invoice_no text unique not null,
  against_no text,
  issue_date date not null default current_date,
  due_date date,
  customer_name text not null, customer_email text, customer_phone text, customer_address text, customer_gstin text,
  items jsonb not null default '[]',                       -- [{desc, qty, unit_paise, gst_rate, hsn}]
  discount_paise integer not null default 0,
  gst_enabled boolean not null default false, gst_rate numeric not null default 18,
  subtotal_paise integer not null, gst_paise integer not null default 0, total_paise integer not null,
  notes text,
  status text not null default 'draft',
  paid_on date, payment_method text,
  last_reminder_at timestamptz,
  created_at timestamptz not null default now()
);
alter table invoices add column if not exists paid_on date;
alter table invoices add column if not exists payment_method text;
alter table invoices add column if not exists doc_type text not null default 'invoice';
alter table invoices add column if not exists against_no text;
alter table invoices add column if not exists last_reminder_at timestamptz;
alter table invoices drop constraint if exists invoices_doc_type_check;
alter table invoices add constraint invoices_doc_type_check check (doc_type in ('invoice','quotation','credit_note'));
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
-- an invoice already marked paid (for example imported) counts as one full payment
insert into invoice_payments (id, invoice_id, amount_paise, paid_on, method)
  select i.id, i.id, i.total_paise, coalesce(i.paid_on, i.issue_date), i.payment_method from invoices i
  where i.status = 'paid' and i.total_paise > 0 and not exists (select 1 from invoice_payments p where p.invoice_id = i.id) on conflict do nothing;

-- the studio hired out to other people; paid ones are income in the accounts
create table if not exists rentouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,                                      -- who hired the studio
  phone text, email text, purpose text,
  on_date date not null, end_date date, time_text text,
  amount_paise integer not null default 0 check (amount_paise >= 0),
  paid boolean not null default false, paid_on date, method text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists rentouts_date on rentouts (on_date);

-- a rent-out can be paid in parts: each payment is one row here (and one income entry in the accounts)
do $$
begin
  if to_regclass('public.rentout_payments') is null then
    create table rentout_payments (
      id uuid primary key default gen_random_uuid(),
      rentout_id uuid not null references rentouts(id) on delete cascade,
      amount_paise integer not null check (amount_paise > 0),
      paid_on date not null default current_date,
      method text, note text,
      created_at timestamptz not null default now()
    );
    -- once only: a rent-out that was already marked paid becomes one payment (same id, so its accounts entry stays attached to it)
    insert into rentout_payments (id, rentout_id, amount_paise, paid_on, method)
      select id, id, amount_paise, coalesce(paid_on, on_date), method from rentouts where paid and amount_paise > 0;
  end if;
end $$;
create index if not exists rentout_payments_rentout on rentout_payments (rentout_id);

-- ---------------------------------------------------------------- the rest
create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact','invitation','service','collaboration','hiring')),
  name text, email text, phone text, message text,
  details jsonb default '{}',
  handled boolean not null default false,                  -- "attended" in the Manager
  read_at timestamptz,                                     -- empty = unread
  created_at timestamptz not null default now()
);
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'enquiries' and column_name = 'read_at') then
    alter table enquiries add column read_at timestamptz;
    update enquiries set read_at = created_at where handled;       -- messages already dealt with count as read
  end if;
end $$;
create index if not exists enquiries_created on enquiries (created_at desc);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null, note text,
  on_date date not null, end_date date, time_text text,
  created_at timestamptz not null default now()
);
create index if not exists events_date on events (on_date);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  title text not null, note text,
  due_on date,
  done boolean not null default false, done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists todos_open on todos (done, due_on);

create table if not exists site_images (
  key text primary key,
  label text not null,
  path text not null,
  alt text, updated_at timestamptz not null default now()
);
create table if not exists settings (
  key text primary key, value jsonb not null, is_public boolean not null default false
);
-- holds the owner PIN (salted hash only) and the wrong-guess counter. No browser can read it; only the website's server.
create table if not exists admin_security (
  key text primary key,
  value jsonb not null
);

-- ---------------------------------------------------------------- functions
-- Only the website's server may call these three.
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

-- takes an order's items from stock (once) and remembers how many, or gives exactly that many back
create or replace function order_stock_internal(p_order uuid, p_take boolean) returns void language plpgsql security definer set search_path = public as $$
declare it record; s integer; n integer;
begin
  if p_take then
    for it in select i.id, i.product_id, i.qty from order_items i where i.order_id = p_order and i.product_id is not null and i.stock_taken is null for update loop
      select stock into s from products where id = it.product_id for update;
      n := least(it.qty, greatest(coalesce(s, 0), 0));                 -- a pre-order may find less (or nothing) in stock
      update products set stock = stock - n where id = it.product_id;
      update order_items set stock_taken = n where id = it.id;
    end loop;
  else
    for it in select i.id, i.product_id, i.stock_taken from order_items i where i.order_id = p_order and i.product_id is not null and i.stock_taken > 0 for update loop
      update products set stock = stock + it.stock_taken where id = it.product_id;
    end loop;
    update order_items set stock_taken = null where order_id = p_order;
  end if;
end $$;

-- The Manager app (signed in as the owner) uses these.
create or replace function admin_order_stock(p_order uuid, p_take boolean) returns void language plpgsql security definer set search_path = public as $$
begin if not is_admin() then raise exception 'not allowed'; end if; perform order_stock_internal(p_order, p_take); end $$;

create or replace function next_invoice_number() returns bigint language plpgsql security definer set search_path = public as $$
begin if not is_admin() then raise exception 'not allowed'; end if; return nextval('invoice_seq'); end $$;
-- the number the next invoice will get, without using it up (shown in the new invoice form)
create or replace function peek_invoice_number() returns bigint language plpgsql stable security definer set search_path = public as $$
declare v bigint; called boolean;
begin if not is_admin() then raise exception 'not allowed'; end if; select last_value, is_called into v, called from invoice_seq; return case when called then v + 1 else v end; end $$;
create or replace function set_invoice_start(n bigint) returns void language plpgsql security definer set search_path = public as $$
declare cur bigint;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  select case when is_called then last_value else 0 end into cur from invoice_seq;
  perform setval('invoice_seq', greatest(n - 1, cur), true);
end $$;
create or replace function set_order_start(n bigint) returns void language plpgsql security definer set search_path = public as $$
declare cur bigint;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  select case when is_called then last_value else 0 end into cur from order_seq;
  perform setval('order_seq', greatest(n - 1, cur), true);
end $$;

-- an order added manually is saved in one step: order, items, stock and the accounts entry together
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
  if paid then perform order_stock_internal(oid, true); end if;
  perform ledger_sync_item('order', oid);                  -- the accounts entry is made by the one common function
  return oid;
end $$;

-- a manual order can be edited: the old items go back to stock, the new ones are taken, and the accounts entry follows the new total
create or replace function admin_update_order(p jsonb) returns void language plpgsql security definer set search_path = public as $$
declare oid uuid := (p->>'id')::uuid; o orders%rowtype; it jsonb; gst int := 0; total int := (p->>'total_paise')::int; had boolean;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  select * into o from orders where id = oid for update;
  if not found then raise exception 'order not found'; end if;
  if o.channel <> 'manual' then raise exception 'only orders added manually can be edited'; end if;
  had := o.status in ('paid','packed','shipped','delivered');
  if had then perform order_stock_internal(oid, false); end if;
  delete from order_items where order_id = oid;
  update orders set name = p->>'name', email = coalesce(p->>'email',''), phone = coalesce(p->>'phone',''), shipping_address = coalesce(p->'address','{}'::jsonb),
    subtotal_paise = (p->>'subtotal_paise')::int, shipping_paise = (p->>'shipping_paise')::int, total_paise = total where id = oid;
  for it in select * from jsonb_array_elements(p->'items') loop
    insert into order_items (order_id, product_id, title, unit_paise, qty, gst_paise)
    values (oid, nullif(it->>'product_id','')::uuid, it->>'title', (it->>'unit_paise')::int, (it->>'qty')::int, coalesce((it->>'gst_paise')::int, 0));
    gst := gst + coalesce((it->>'gst_paise')::int, 0);
  end loop;
  if had then perform order_stock_internal(oid, true); end if;
  perform ledger_sync_item('order', oid);
end $$;


-- ================================================================ THE ACCOUNTS
-- One rule for money in: every paid order, workshop booking and class enrolment has exactly one income entry, made and kept right by the database itself
-- whenever the item is saved. "Not paid yet" removes it again. A refund is its own money-out entry (see the refund screen). Whatever the app does, these stay in step.
create or replace function ledger_sync_item(p_kind text, p_id uuid, p_update boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare cat text; amt integer; g integer; d date; meth text; who text; descr text; keep boolean; gone boolean;
begin
  if p_kind = 'order' then
    select o.total_paise, coalesce((select sum(i.gst_paise) from order_items i where i.order_id = o.id), 0), (coalesce(o.paid_at, o.created_at) at time zone 'Asia/Kolkata')::date,
           coalesce(nullif(o.payment_method,''), case when o.razorpay_payment_id is not null then 'razorpay' else 'other' end), o.name,
           'Order ' || coalesce(o.order_no::text, '') || case when o.channel = 'manual' then ' (added manually)' else '' end,
           o.status in ('paid','packed','shipped','delivered','refunded'), o.status = 'pending'
      into amt, g, d, meth, who, descr, keep, gone from orders o where o.id = p_id;
    cat := 'Store sales';
  elsif p_kind = 'booking' then
    select b.amount_paise, coalesce(b.gst_paise, 0), (coalesce(b.paid_at, b.created_at) at time zone 'Asia/Kolkata')::date,
           coalesce(nullif(b.payment_method,''), case when b.razorpay_payment_id is not null then 'razorpay' else 'other' end), b.name,
           coalesce((select w.title from workshops w where w.id = b.workshop_id), 'Workshop') || ' · ' || b.seats || case when b.seats = 1 then ' seat' else ' seats' end,
           b.status in ('paid','transferred','refunded'), b.status = 'pending'
      into amt, g, d, meth, who, descr, keep, gone from bookings b where b.id = p_id;
    cat := 'Workshops';
  elsif p_kind = 'enrolment' then
    select e.amount_paise, coalesce(e.gst_paise, 0), (coalesce(e.paid_at, e.created_at) at time zone 'Asia/Kolkata')::date,
           coalesce(nullif(e.payment_method,''), case when e.razorpay_payment_id is not null then 'razorpay' else 'other' end), e.name,
           coalesce((select l.title || ', ' || l.level from class_levels l where l.id = e.class_id), 'Writing class') || ' for ' || e.student_name,
           e.status in ('paid','transferred','refunded'), e.status = 'pending'
      into amt, g, d, meth, who, descr, keep, gone from class_enrolments e where e.id = p_id;
    cat := 'Classes';
  else return; end if;
  if keep is null then return; end if;                                                         -- the item does not exist
  if meth not in ('upi','cash','card','bank','tds','razorpay','other') then meth := 'other'; end if;
  if keep and amt > 0 then
    if p_update then
      insert into ledger_entries (entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id)
      values (d, 'in', cat, descr, amt, least(g, amt), meth, who, p_kind, p_id)
      on conflict (source, source_id) where source_id is not null
      do update set entry_date = excluded.entry_date, amount_paise = excluded.amount_paise, gst_paise = excluded.gst_paise, method = excluded.method, party = excluded.party;
    else
      insert into ledger_entries (entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id)
      values (d, 'in', cat, descr, amt, least(g, amt), meth, who, p_kind, p_id) on conflict do nothing;
    end if;
  elsif gone then
    delete from ledger_entries where source = p_kind and source_id = p_id;                     -- back to "not paid yet": the income goes
  end if;
end $$;

create or replace function ledger_class(p_kind text, p_status text) returns text language sql immutable as $$
  select case when p_status = 'pending' then 'unpaid'
              when p_kind = 'order' and p_status in ('paid','packed','shipped','delivered','refunded') then 'paid'
              when p_kind <> 'order' and p_status in ('paid','transferred','refunded') then 'paid' else 'other' end $$;
create or replace function trg_ledger_item() returns trigger language plpgsql security definer set search_path = public as $$
declare k text := tg_argv[0]; ov jsonb; nv jsonb; amt text := case when tg_argv[0] = 'order' then 'total_paise' else 'amount_paise' end;
begin
  if tg_op = 'DELETE' then delete from ledger_entries where source = k and source_id = old.id; return old; end if;
  if tg_op = 'UPDATE' then      -- act only when paid or not paid changed, or the amount or the payment day did: a hand-edited entry is never overwritten by, say, shipping an order
    ov := to_jsonb(old); nv := to_jsonb(new);
    if ledger_class(k, ov->>'status') = ledger_class(k, nv->>'status') and ov->>amt is not distinct from nv->>amt and ov->>'paid_at' is not distinct from nv->>'paid_at' and ov->>'gst_paise' is not distinct from nv->>'gst_paise' then return new; end if;
  end if;
  perform ledger_sync_item(k, new.id); return new;
end $$;

-- An entry for a payment cannot be deleted by hand while that payment is still there; the way to take it out is to mark the order, booking or class "not paid yet" (or remove the payment).
create or replace function ledger_guard_delete() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.source = 'order' and exists (select 1 from orders o where o.id = old.source_id and ledger_class('order', o.status) = 'paid') then raise exception 'This entry is the payment for an order. To take it out, mark that order as not paid.'; end if;
  if old.source = 'booking' and exists (select 1 from bookings b where b.id = old.source_id and ledger_class('booking', b.status) = 'paid') then raise exception 'This entry is the payment for a workshop booking. To take it out, mark that booking as not paid.'; end if;
  if old.source = 'enrolment' and exists (select 1 from class_enrolments e where e.id = old.source_id and ledger_class('enrolment', e.status) = 'paid') then raise exception 'This entry is the payment for a class. To take it out, mark that class as not paid.'; end if;
  return old;
end $$;
drop trigger if exists ledger_entries_guard on ledger_entries;
create trigger ledger_entries_guard before delete on ledger_entries for each row execute function ledger_guard_delete();

drop trigger if exists orders_ledger on orders;
create trigger orders_ledger after insert or update of status, total_paise, paid_at, payment_method, name on orders for each row execute function trg_ledger_item('order');
drop trigger if exists orders_ledger_del on orders;
create trigger orders_ledger_del after delete on orders for each row execute function trg_ledger_item('order');
drop trigger if exists bookings_ledger on bookings;
create trigger bookings_ledger after insert or update of status, amount_paise, gst_paise, paid_at, payment_method, name, seats on bookings for each row execute function trg_ledger_item('booking');
drop trigger if exists bookings_ledger_del on bookings;
create trigger bookings_ledger_del after delete on bookings for each row execute function trg_ledger_item('booking');
drop trigger if exists enrolments_ledger on class_enrolments;
create trigger enrolments_ledger after insert or update of status, amount_paise, gst_paise, paid_at, payment_method, name, student_name on class_enrolments for each row execute function trg_ledger_item('enrolment');
drop trigger if exists enrolments_ledger_del on class_enrolments;
create trigger enrolments_ledger_del after delete on class_enrolments for each row execute function trg_ledger_item('enrolment');
-- a payment, a rent-out payment or an invoice that is deleted takes its accounts entry with it
create or replace function trg_ledger_gone() returns trigger language plpgsql security definer set search_path = public as $$
begin delete from ledger_entries where source = tg_argv[0] and source_id = old.id; return old; end $$;
drop trigger if exists invoice_payments_ledger_del on invoice_payments;
create trigger invoice_payments_ledger_del after delete on invoice_payments for each row execute function trg_ledger_gone('invoice');
drop trigger if exists rentout_payments_ledger_del on rentout_payments;
create trigger rentout_payments_ledger_del after delete on rentout_payments for each row execute function trg_ledger_gone('rentout');
drop trigger if exists invoices_ledger_del on invoices;
create trigger invoices_ledger_del after delete on invoices for each row execute function trg_ledger_gone('invoice');
drop trigger if exists rentouts_ledger_del on rentouts;
create trigger rentouts_ledger_del after delete on rentouts for each row execute function trg_ledger_gone('rentout');

-- The check: every way the accounts can disagree with the orders, bookings, classes, invoices and rent-outs. fix: add = can be added automatically, update = amount can be corrected, remove = entry has nothing behind it, review = look at it yourself.
create or replace function accounts_check_rows() returns table (kind text, ref uuid, message text, fix text)
language sql stable security definer set search_path = public as $$
  with items as (
    select 'order' k, o.id, o.total_paise amt, o.status in ('paid','packed','shipped','delivered','refunded') paid, o.status = 'refunded' refunded, 'Order ' || coalesce(o.order_no::text,'') || ' (' || o.name || ')' label from orders o
    union all select 'booking', b.id, b.amount_paise, b.status in ('paid','transferred','refunded'), b.status = 'refunded', 'Workshop booking (' || b.name || ')' from bookings b
    union all select 'enrolment', e.id, e.amount_paise, e.status in ('paid','transferred','refunded'), e.status = 'refunded', 'Class enrolment (' || e.student_name || ')' from class_enrolments e),
  inc as (select source, source_id, amount_paise from ledger_entries where kind = 'in' and source in ('order','booking','enrolment')),
  ref as (select source_id related_id, sum(amount_paise) total from ledger_entries where source = 'refund' group by source_id),
  ipay as (select p.invoice_id, sum(p.amount_paise) total from invoice_payments p group by p.invoice_id),
  rpay as (select p.rentout_id, sum(p.amount_paise) total from rentout_payments p group by p.rentout_id)
  select 'missing', i.id, i.label || ' is paid but has no income entry', 'add' from items i where i.paid and i.amt > 0 and not exists (select 1 from inc where inc.source = i.k and inc.source_id = i.id)
  union all select 'amount', i.id, i.label || ': the income entry is ' || (inc.amount_paise / 100.0)::text || ' but the amount is ' || (i.amt / 100.0)::text, 'update' from items i join inc on inc.source = i.k and inc.source_id = i.id where i.paid and inc.amount_paise <> i.amt
  union all select 'orphan', l.id, 'An income entry ("' || coalesce(l.description, l.category) || '") has no paid order, booking or class behind it', 'remove' from ledger_entries l
    where l.kind = 'in' and l.source in ('order','booking','enrolment') and not exists (select 1 from items i where i.k = l.source and i.id = l.source_id and i.paid)
  union all select 'refund', i.id, i.label || ' is marked refunded but only ' || (coalesce(r.total,0) / 100.0)::text || ' of ' || (i.amt / 100.0)::text || ' was recorded as refunded', 'review' from items i left join ref r on r.related_id = i.id where i.refunded and coalesce(r.total,0) < i.amt
  union all select 'refund', i.id, i.label || ': refunds recorded (' || (r.total / 100.0)::text || ') are more than the amount paid (' || (i.amt / 100.0)::text || ')', 'review' from items i join ref r on r.related_id = i.id where r.total > i.amt
  union all select 'refund', l.id, 'A refund entry ("' || coalesce(l.description, 'Refund') || '") does not belong to any order, booking, class or payment', 'review' from ledger_entries l
    where l.source = 'refund' and not exists (select 1 from items i where i.id = l.source_id) and not exists (select 1 from invoice_payments p where p.id = l.source_id) and not exists (select 1 from rentout_payments p where p.id = l.source_id)
  union all select 'invoice', p.id, 'A payment of ' || (p.amount_paise / 100.0)::text || ' on invoice ' || iv.invoice_no || ' is not in the accounts', 'add' from invoice_payments p join invoices iv on iv.id = p.invoice_id
    where not exists (select 1 from ledger_entries l where l.source = 'invoice' and l.source_id = p.id)
  union all select 'orphan', l.id, 'An income entry for an invoice ("' || coalesce(l.description, l.category) || '") has no payment behind it', 'remove' from ledger_entries l
    where l.source = 'invoice' and l.kind = 'in' and not exists (select 1 from invoice_payments p where p.id = l.source_id) and not exists (select 1 from invoices v where v.id = l.source_id)
  union all select 'invoice', iv.id, 'Invoice ' || iv.invoice_no || ': payments (' || (p.total / 100.0)::text || ') are more than the total (' || (iv.total_paise / 100.0)::text || ')', 'review' from invoices iv join ipay p on p.invoice_id = iv.id where iv.doc_type = 'invoice' and p.total > iv.total_paise
  union all select 'invoice', iv.id, 'Invoice ' || iv.invoice_no || ' is marked paid but only ' || (coalesce(p.total,0) / 100.0)::text || ' of ' || (iv.total_paise / 100.0)::text || ' was received', 'review' from invoices iv left join ipay p on p.invoice_id = iv.id where iv.doc_type = 'invoice' and iv.status = 'paid' and iv.total_paise > 0 and coalesce(p.total,0) < iv.total_paise
  union all select 'rentout', p.id, 'A rent-out payment of ' || (p.amount_paise / 100.0)::text || ' is not in the accounts', 'add' from rentout_payments p where not exists (select 1 from ledger_entries l where l.source = 'rentout' and l.source_id = p.id)
  union all select 'orphan', l.id, 'An income entry for a rent-out ("' || coalesce(l.description, l.category) || '") has no payment behind it', 'remove' from ledger_entries l
    where l.source = 'rentout' and not exists (select 1 from rentout_payments p where p.id = l.source_id) and not exists (select 1 from rentouts r where r.id = l.source_id)
  union all select 'rentout', r.id, 'Rent-out for ' || r.name || ': payments (' || (p.total / 100.0)::text || ') are more than the amount (' || (r.amount_paise / 100.0)::text || ')', 'review' from rentouts r join rpay p on p.rentout_id = r.id where r.amount_paise > 0 and p.total > r.amount_paise
  union all select 'date', l.id, 'An entry ("' || coalesce(l.description, l.category) || '") is dated in the future (' || l.entry_date::text || ')', 'review' from ledger_entries l where l.entry_date > (now() at time zone 'Asia/Kolkata')::date + 1
  union all select 'gst', l.id, 'An entry ("' || coalesce(l.description, l.category) || '") has more GST than its amount', 'review' from ledger_entries l where l.gst_paise > l.amount_paise
  union all select 'duplicate', min(l.id::text)::uuid, 'Possible double entry: ' || count(*) || ' manual entries on ' || l.entry_date::text || ' for the same amount, category and name', 'review'
    from ledger_entries l where l.source = 'manual' group by l.entry_date, l.kind, l.amount_paise, l.category, coalesce(lower(l.party), '') having count(*) > 1
$$;
-- Puts right what can be put right safely: adds missing entries, and (when asked) corrects amounts and removes entries that have nothing behind them.
create or replace function ledger_repair(p_amounts boolean default false, p_orphans boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; added int := 0; fixed int := 0; removed int := 0; p record;
begin
  for r in select * from accounts_check_rows() where kind = 'missing' loop
    perform ledger_sync_item((select case when exists (select 1 from orders where id = r.ref) then 'order' when exists (select 1 from bookings where id = r.ref) then 'booking' else 'enrolment' end), r.ref, false); added := added + 1;
  end loop;
  for p in select ip.id, ip.amount_paise, ip.paid_on, ip.method, iv.invoice_no, iv.customer_name, iv.total_paise, iv.gst_paise from invoice_payments ip join invoices iv on iv.id = ip.invoice_id
           where not exists (select 1 from ledger_entries l where l.source = 'invoice' and l.source_id = ip.id) loop
    insert into ledger_entries (entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id)
    values (p.paid_on, 'in', 'Services', 'Invoice ' || p.invoice_no, p.amount_paise, case when p.total_paise > 0 then round(p.gst_paise::numeric * p.amount_paise / p.total_paise)::int else 0 end,
            case when p.method in ('upi','cash','card','bank','tds','razorpay','other') then p.method else 'other' end, p.customer_name, 'invoice', p.id) on conflict do nothing; added := added + 1;
  end loop;
  for p in select rp.id, rp.amount_paise, rp.paid_on, rp.method, ro.name, ro.purpose from rentout_payments rp join rentouts ro on ro.id = rp.rentout_id
           where not exists (select 1 from ledger_entries l where l.source = 'rentout' and l.source_id = rp.id) loop
    insert into ledger_entries (entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id)
    values (p.paid_on, 'in', 'Studio rent-outs', 'Rent-out: ' || coalesce(p.purpose, 'studio'), p.amount_paise, 0, case when p.method in ('upi','cash','card','bank','tds','razorpay','other') then p.method else 'other' end, p.name, 'rentout', p.id) on conflict do nothing; added := added + 1;
  end loop;
  if p_amounts then
    for r in select * from accounts_check_rows() where kind = 'amount' loop
      perform ledger_sync_item((select case when exists (select 1 from orders where id = r.ref) then 'order' when exists (select 1 from bookings where id = r.ref) then 'booking' else 'enrolment' end), r.ref, true); fixed := fixed + 1;
    end loop;
  end if;
  if p_orphans then
    for r in select * from accounts_check_rows() where kind = 'orphan' loop delete from ledger_entries where id = r.ref; removed := removed + 1; end loop;
  end if;
  return jsonb_build_object('added', added, 'fixed', fixed, 'removed', removed);
end $$;

-- what each customer has bought, counted in the database (matched by email or phone) so the Customers page stays fast
create or replace function customer_summary() returns table (customer_id uuid, orders int, bookings int, classes int, spent_paise bigint, last_at timestamptz)
language sql stable security definer set search_path = public as $$
  with c as (select id, lower(coalesce(email,'')) e, right(regexp_replace(coalesce(phone,''),'\D','','g'),10) ph from customers),
  p as (
    select 'o' k, id pid, lower(coalesce(email,'')) e, right(regexp_replace(coalesce(phone,''),'\D','','g'),10) ph, total_paise amt, coalesce(paid_at, created_at) at from orders where status in ('paid','packed','shipped','delivered')
    union all select 'b', id, lower(coalesce(email,'')), right(regexp_replace(coalesce(phone,''),'\D','','g'),10), amount_paise, coalesce(paid_at, created_at) from bookings where status in ('paid','transferred')
    union all select 'c', id, lower(coalesce(email,'')), right(regexp_replace(coalesce(phone,''),'\D','','g'),10), amount_paise, coalesce(paid_at, created_at) from class_enrolments where status in ('paid','transferred')),
  m as (                                              -- a purchase belongs to a customer with the same email or the same phone (two quick joins instead of one slow either-or join)
    select c.id cid, p.k, p.pid, p.amt, p.at from c join p on c.e <> '' and p.e = c.e
    union select c.id, p.k, p.pid, p.amt, p.at from c join p on length(c.ph) = 10 and p.ph = c.ph)
  select c.id, count(m.pid) filter (where m.k = 'o')::int, count(m.pid) filter (where m.k = 'b')::int, count(m.pid) filter (where m.k = 'c')::int, coalesce(sum(m.amt), 0)::bigint, max(m.at)
  from c left join m on m.cid = c.id
  where is_admin() group by c.id
$$;

revoke all on function decrement_stock(uuid, integer) from public, anon, authenticated;
revoke all on function book_seats(uuid, uuid, text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function order_stock_internal(uuid, boolean) from public, anon, authenticated;
grant execute on function decrement_stock(uuid, integer) to service_role;
grant execute on function book_seats(uuid, uuid, text, text, text, integer, integer) to service_role;
grant execute on function order_stock_internal(uuid, boolean) to service_role;
revoke all on function admin_order_stock(uuid, boolean) from public, anon;
revoke all on function next_invoice_number() from public, anon;
revoke all on function peek_invoice_number() from public, anon;
revoke all on function set_invoice_start(bigint) from public, anon;
revoke all on function set_order_start(bigint) from public, anon;
revoke all on function admin_add_order(jsonb) from public, anon;
revoke all on function admin_update_order(jsonb) from public, anon;
revoke all on function customer_summary() from public, anon;
revoke all on function ledger_repair(boolean, boolean) from public, anon, authenticated;
revoke all on function ledger_sync_item(text, uuid, boolean) from public, anon, authenticated;
revoke all on function accounts_check_rows() from public, anon, authenticated;
grant execute on function admin_order_stock(uuid, boolean), next_invoice_number(), peek_invoice_number(), set_invoice_start(bigint), set_order_start(bigint),
  admin_add_order(jsonb), admin_update_order(jsonb), customer_summary() to authenticated;

-- ---------------------------------------------------------------- the public workshop list: published workshops only (a cancelled one is never shown), seats left worked out
create view workshops_public with (security_invoker = false) as
select w.*, (w.starts_at < now()) as is_past,
  greatest(w.capacity - coalesce((select sum(b.seats) from bookings b
     where b.workshop_id = w.id and b.status in ('paid','pending')
       and (b.status = 'paid' or b.created_at > now() - interval '30 minutes')),0),0) as seats_left
from workshops w where w.status = 'published';
grant select on workshops_public to anon, authenticated;

-- ---------------------------------------------------------------- security: who can read and change what
alter table profiles enable row level security;          alter table customers enable row level security;
alter table workshops enable row level security;         alter table bookings enable row level security;
alter table class_types enable row level security;
alter table class_levels enable row level security;      alter table class_enrolments enable row level security;
alter table class_sessions enable row level security;    alter table products enable row level security;
alter table orders enable row level security;            alter table order_items enable row level security;
alter table ledger_entries enable row level security;    alter table invoices enable row level security;
alter table invoice_payments enable row level security;  alter table rentouts enable row level security;  alter table rentout_payments enable row level security;
alter table enquiries enable row level security;         alter table events enable row level security;
alter table todos enable row level security;             alter table site_images enable row level security;
alter table settings enable row level security;          alter table admin_security enable row level security;   -- admin_security: no policy on purpose

-- profiles and customers: you see yourself; the owner sees all
drop policy if exists "own profile read" on profiles;   create policy "own profile read" on profiles for select using (id = auth.uid() or is_admin());
drop policy if exists "own profile update" on profiles; create policy "own profile update" on profiles for update using (id = auth.uid() or is_admin());
drop policy if exists "admin customers" on customers;   create policy "admin customers" on customers for all using (is_admin()) with check (is_admin());
drop policy if exists "own customer read" on customers; create policy "own customer read" on customers for select using (user_id = auth.uid());
-- workshops, classes and products: the public reads live ones; only the owner changes them
drop policy if exists "public read workshops" on workshops; create policy "public read workshops" on workshops for select using (status = 'published' or is_admin());
drop policy if exists "admin write workshops" on workshops; create policy "admin write workshops" on workshops for all using (is_admin()) with check (is_admin());
drop policy if exists "public read classes" on class_levels; create policy "public read classes" on class_levels for select using (active or is_admin());
drop policy if exists "admin write classes" on class_levels; create policy "admin write classes" on class_levels for all using (is_admin()) with check (is_admin());
drop policy if exists "public read class types" on class_types; create policy "public read class types" on class_types for select using (true);
drop policy if exists "admin write class types" on class_types; create policy "admin write class types" on class_types for all using (is_admin()) with check (is_admin());
drop policy if exists "public read products" on products; create policy "public read products" on products for select using (active or is_admin());
drop policy if exists "admin write products" on products; create policy "admin write products" on products for all using (is_admin()) with check (is_admin());
-- bookings, enrolments and orders: customers read their own; only the website's server creates them from the website, so prices and payment status can never be faked from a browser
drop policy if exists "own bookings read" on bookings; create policy "own bookings read" on bookings for select using (user_id = auth.uid() or is_admin());
drop policy if exists "admin manage bookings" on bookings; create policy "admin manage bookings" on bookings for all using (is_admin()) with check (is_admin());
drop policy if exists "own enrolments read" on class_enrolments; create policy "own enrolments read" on class_enrolments for select using (user_id = auth.uid() or is_admin());
drop policy if exists "admin manage enrolments" on class_enrolments; create policy "admin manage enrolments" on class_enrolments for all using (is_admin()) with check (is_admin());
drop policy if exists "own orders read" on orders; create policy "own orders read" on orders for select using (user_id = auth.uid() or is_admin());
drop policy if exists "admin manage orders" on orders; create policy "admin manage orders" on orders for all using (is_admin()) with check (is_admin());
drop policy if exists "own order items read" on order_items; create policy "own order items read" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
drop policy if exists "admin manage order items" on order_items; create policy "admin manage order items" on order_items for all using (is_admin()) with check (is_admin());
-- everything below is the owner only
drop policy if exists "admin classes sessions" on class_sessions; drop policy if exists "admin sessions" on class_sessions;
create policy "admin sessions" on class_sessions for all using (is_admin()) with check (is_admin());
drop policy if exists "admin ledger" on ledger_entries; create policy "admin ledger" on ledger_entries for all using (is_admin()) with check (is_admin());
drop policy if exists "admin invoices" on invoices; create policy "admin invoices" on invoices for all using (is_admin()) with check (is_admin());
drop policy if exists "admin invoice payments" on invoice_payments; create policy "admin invoice payments" on invoice_payments for all using (is_admin()) with check (is_admin());
drop policy if exists "admin rentouts" on rentouts; create policy "admin rentouts" on rentouts for all using (is_admin()) with check (is_admin());
drop policy if exists "admin rentout payments" on rentout_payments; create policy "admin rentout payments" on rentout_payments for all using (is_admin()) with check (is_admin());
drop policy if exists "admin enquiries" on enquiries; create policy "admin enquiries" on enquiries for all using (is_admin()) with check (is_admin());
drop policy if exists "admin events" on events; create policy "admin events" on events for all using (is_admin()) with check (is_admin());
drop policy if exists "admin todos" on todos; create policy "admin todos" on todos for all using (is_admin()) with check (is_admin());
-- website photos and settings: the public reads photos and public settings; only the owner changes them
drop policy if exists "public read images" on site_images; create policy "public read images" on site_images for select using (true);
drop policy if exists "admin write images" on site_images; create policy "admin write images" on site_images for all using (is_admin()) with check (is_admin());
drop policy if exists "public read settings" on settings; create policy "public read settings" on settings for select using (is_public or is_admin());
drop policy if exists "admin write settings" on settings; create policy "admin write settings" on settings for all using (is_admin()) with check (is_admin());

-- photo storage
insert into storage.buckets (id, name, public) values ('media','media',true) on conflict do nothing;
drop policy if exists "public read media" on storage.objects;  create policy "public read media" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "admin upload media" on storage.objects; create policy "admin upload media" on storage.objects for insert with check (bucket_id = 'media' and is_admin());
drop policy if exists "admin update media" on storage.objects; create policy "admin update media" on storage.objects for update using (bucket_id = 'media' and is_admin());
drop policy if exists "admin delete media" on storage.objects; create policy "admin delete media" on storage.objects for delete using (bucket_id = 'media' and is_admin());

-- the website's server (secret key) can reach every table
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------- starting data
-- Settings the app expects (a setting that already exists is never changed).
insert into settings (key, value, is_public) values
 ('business', '{"name":"Thin Black Brush","phone":"+91 99620 50962","phone2":"+91 95666 25373","email":"thinblackbrush@gmail.com","address":"2nd Floor, Berachah Building, 13/7, 1st Cross St,\nTrustpuram, Kodambakkam, Chennai - 600024.","address_contact":"2nd Floor, Berachah Building,\n13/7, 1st Cross St, Trustpuram,\nKodambakkam, Chennai - 600024.","instagram":"https://www.instagram.com/thinblackbrush","facebook":"https://www.facebook.com/thinblackbrush","whatsapp":"919962050962","upi":"thinblack@ybl"}', true),
 ('gst', '{"enabled":false,"gstin":"","rate_percent":18}', false),
 ('shipping', '{"flat_paise":6000,"free_above_paise":200000}', true),
 ('gateway', '{"fee_percent":2}', false),
 ('order', '{"format":"ORD-####","start":1}', false),
 ('store', '{"shipping_note":"","return_note":"","good_to_know":"Please arrive on time.\nBookings are confirmed on payment.\nTickets are non-refundable, but can be transferred to someone else with prior notice to the TBB team."}', true)
on conflict (key) do nothing;
-- the shop and workshop notes are shown on the website, so that setting is public; a missing "good to know" starts with the usual three points
update settings set is_public = true where key = 'store' and not is_public;
update settings set value = value || '{"good_to_know":"Please arrive on time.\nBookings are confirmed on payment.\nTickets are non-refundable, but can be transferred to someone else with prior notice to the TBB team."}'::jsonb where key = 'store' and not (value ? 'good_to_know');
-- the owner PIN used to be kept in settings; it lives in admin_security now
insert into admin_security (key, value) select 'pin', value from settings where key = 'admin_pin' on conflict (key) do nothing;
delete from settings where key = 'admin_pin';

insert into site_images (key, label, path, alt) values
 ('hero', 'Home page - main photo', '/img/31648a2db3.webp', 'A workshop group outside the studio holding up their paintings'),
 ('teaching', 'Writing classes photo', '/img/5c8f647552.webp', 'Teaching a writing class'),
 ('studio', 'Studio photo', '/img/cafdbd8687.webp', 'Workshop at the studio'),
 ('classes_banner', 'Home page - classes banner (landscape)', '/img/cb028c51a9.webp', 'Hands practising modern calligraphy')
on conflict (key) do nothing;

-- Sample content from the old website. Added only to an empty list, so deleting or changing it later is never undone by running this file again.
do $seed$
begin
  if not exists (select 1 from class_types) then
    insert into class_types (name, sort_order) values ('Handwriting', 1), ('Handwriting + Calligraphy', 2);
  end if;
  if not exists (select 1 from class_levels) then
    insert into class_levels (slug, track, title, level, description, covers, price_paise, sort_order) values
     ('handwriting-1','Handwriting','Basics of Handwriting','Level 1','Foundational handwriting skills, including proper letter formation and legibility.', array['Letter formation','Legibility'], 600000, 1),
     ('handwriting-2','Handwriting','Basics of Handwriting','Level 2','Builds on the basics with decorative writing techniques.', array['Letter formation','Legibility','Faux calligraphy'], 600000, 2),
     ('calligraphy-1','Handwriting + Calligraphy','Handwriting and Calligraphy','Level 1','Combines handwriting improvement with an introduction to decorative lettering.', array['Handwriting improvement','Faux calligraphy','Brush lettering'], 750000, 3),
     ('calligraphy-2','Handwriting + Calligraphy','Handwriting and Calligraphy','Level 2','Takes your skills further, with advanced techniques and tools.', array['Handwriting improvement','Faux calligraphy','Brush lettering','Modern dip pen calligraphy'], 1000000, 4);
  end if;
  if not exists (select 1 from workshops) then
    insert into workshops (slug,title,summary,description,venue_name,venue_address,starts_at,price_paise,friend_price_paise,capacity,includes,learn,note,image_path,status) values
    ('beginners-watercolor-course','Beginners Watercolour Course','A beginner-friendly course on the basics of watercolour.',
     E'The class has been constructed to help a beginner understand watercolour as a medium.\n\nTechniques learnt will be applied throughout the class to gain hands-on experience. At the end you will create your own watercolour paintings.',
     'The Bangalore Local','1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka','2026-10-31 10:00+05:30',230000,210000,12,
     array['Artist grade watercolour paints (tubes)','Watercolor sheets','Round brush','Flat brush','Pencil','Eraser'],
     array['Introduction to watercolour as a medium','Techniques involved in watercolour','Understanding watercolour and ink'],
     'All materials are provided and you take the basic kit home.','/img/16cc08c542.webp','published'),
    ('modern-dip-pen-calligraphy','Modern Dip Pen Calligraphy','A beginner friendly workshop, in-person course inclusive of all materials.',
     'Learn the basics of calligraphy, from basic strokes and practice drills to letter formation (uppercase and lowercase), numbers and connecting words.',
     'The Bangalore Local','1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka','2026-11-01 10:00+05:30',230000,null,12,
     array['Oblique holder','Speedball Calligraphy Ink','Leonardt 40 nib','Calligraphy practice sheets','Alphabet sheet'],
     array['Section 1 - Introduction, materials and maintenance, basic strokes','Section 2 - Letter formation, lowercase alphabets','Section 3 - Uppercase alphabets, numbers, word formation, guidelines','Section 4 - Exploring different modern calligraphy styles'],
     'The workshop is inclusive of the kit.','/img/26928ebd04.webp','published')
    on conflict (slug) do nothing;
  end if;
  if not exists (select 1 from products) then
    insert into products (slug,title,description,details,price_paise,stock,images,shipping_note,sort_order) values
    ('2024-maroon-planner','2024 Maroon Planner','A daily planner made to fit into any bag of yours. It will help you plan, track and set goals for the next 365 days.',
     array['A daily dotted planner','Monthly grid pages','2023, 2024 and 2025 calendar pages','Daily dotted spread','Trackers','Vision boards every 3 months','Blind emboss cover','80 GSM natural shade paper, 300 GSM cover','A5 size, 160 pages'],
     80000,10,array['/img/4aab591127.webp','/img/e36ba5ccbd.webp','/img/446e583c2f.webp','/img/89b568b6e9.webp','/img/53620e4909.webp','/img/3557599996.webp','/img/f6d88b9621.webp'],
     'Pre-orders for the 2024 planners are on! Planners will be shipped after 8 days.',1),
    ('calligraphy-guideline-book','Landscape Calligraphy Guideline Book',E'A beginner''s best friend. These guidelines are perfect for Modern, Copperplate, Spencerian and Brush Lettering!',
     array['A4 landscape orientation, tearable sheets','50 pages','55 degree slant','100 gsm smooth calligraphy paper'],
     45000,10,array['/img/33e1b05fd6.webp','/img/14db4f6757.webp','/img/49e5145119.webp','/img/bc78b732e5.webp'],null,2),
    ('pre-order-pattern-oblique-holder','Pattern Oblique Holder','These holders are custom made and take up to 2 weeks from the date of the order. Handcrafted by our local artisans, they work with all nibs.',
     array['Length: 18 cm'],165000,0,array['/img/42e66b73f9.webp','/img/474bc3b535.webp'],null,3),
    ('wooden-oblique-holder','Wooden Oblique Holder','Handcrafted by our local artisans. A pure joy to work with. Regular oblique holders that work with all nibs.',
     array['Length: 20 cm'],100000,0,array['/img/92614d0a22.webp','/img/87e346a291.webp'],null,4),
    ('wooden-oblique-holder-circle','Wooden Oblique Holder (Circle)','Handcrafted by our local artisans. A pure joy to work with. Regular oblique holders that work with all nibs.',
     array['Length: 20 cm'],135000,0,array['/img/086f6a6e37.webp','/img/7f7b448ab8.webp'],null,5)
    on conflict (slug) do nothing;
    update products set allow_preorder = true where slug = 'pre-order-pattern-oblique-holder';
  end if;
  -- everyone who already signed up, ordered, booked or enrolled becomes a customer (only when the customers list is still empty)
  if not exists (select 1 from customers) then
    insert into profiles (id, email) select id, email from auth.users on conflict (id) do nothing;
    update profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;
    insert into customers (name, email, phone, user_id, source)
      select coalesce(nullif(full_name,''), split_part(email,'@',1)), email, phone, id, 'website' from profiles where role = 'customer' and email is not null
      on conflict (email) do nothing;
    insert into customers (name, email, phone, source) select distinct on (lower(email)) name, email, phone, 'website' from orders where email is not null order by lower(email), created_at desc on conflict (email) do nothing;
    insert into customers (name, email, phone, source) select distinct on (lower(email)) name, email, phone, 'website' from bookings where email is not null order by lower(email), created_at desc on conflict (email) do nothing;
    insert into customers (name, email, phone, source) select distinct on (lower(email)) name, email, phone, 'website' from class_enrolments where email is not null order by lower(email), created_at desc on conflict (email) do nothing;
  end if;
end $seed$;

-- old versions of this database also had a saved-addresses table; it is not used any more
drop table if exists addresses cascade;

-- brings the accounts up to date once: only missing entries are added (nothing is changed or removed)
select ledger_repair(false, false);

commit;
select 'Database is up to date' as result;
