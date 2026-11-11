-- Thin Black Brush database. Paste into Supabase > SQL Editor > Run.
-- Money is stored in paise (Rs 1 = 100 paise) to avoid rounding errors.

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create sequence if not exists invoice_seq start 1001;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- stop customers from making themselves admin
create or replace function protect_role() returns trigger
language plpgsql as $$
begin
  if new.role is distinct from old.role and not is_admin() and auth.uid() is not null then
    raise exception 'Not allowed';
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on profiles
  for each row execute function protect_role();

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text default 'Home', recipient text, phone text,
  line1 text not null, line2 text, city text not null, state text not null,
  pincode text not null, is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- workshops ----------
create table workshops (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null, summary text, description text,
  kind text not null default 'workshop' check (kind in ('workshop','course')),
  venue_name text, venue_address text, map_link text,
  starts_at timestamptz not null, ends_at timestamptz,
  price_paise integer not null check (price_paise >= 0),
  friend_price_paise integer,           -- "bring a friend" price per person
  capacity integer not null default 12 check (capacity > 0),
  includes text[] default '{}',         -- what is in the kit
  terms text,
  image_path text,
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references workshops(id),
  user_id uuid references auth.users(id) on delete set null,
  name text not null, email text not null, phone text not null,
  seats integer not null default 1 check (seats between 1 and 10),
  amount_paise integer not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded','transferred')),
  razorpay_order_id text unique, razorpay_payment_id text unique,
  invoice_no bigint default nextval('invoice_seq'),
  notes text, created_at timestamptz not null default now(), paid_at timestamptz
);
create index on bookings (workshop_id, status);

-- public sees published workshops with seats left; past ones are flagged automatically
create view workshops_public with (security_invoker = false) as
select w.*, (w.starts_at < now()) as is_past,
  greatest(w.capacity - coalesce((select sum(b.seats) from bookings b
     where b.workshop_id = w.id and b.status in ('paid','pending')
       and (b.status = 'paid' or b.created_at > now() - interval '30 minutes')),0),0) as seats_left
from workshops w where w.status in ('published','cancelled');

-- ---------- store ----------
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null, description text,
  details text[] default '{}',          -- bullet points (size, paper...)
  price_paise integer not null check (price_paise >= 0),
  stock integer not null default 0 check (stock >= 0),
  allow_preorder boolean not null default false,
  images text[] default '{}',           -- storage paths, first = cover
  shipping_note text, return_note text,
  active boolean not null default true,
  sort_order integer default 0,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null, email text not null, phone text not null,
  shipping_address jsonb not null,
  subtotal_paise integer not null, shipping_paise integer not null default 0,
  total_paise integer not null,
  gift_message text,
  status text not null default 'pending'
    check (status in ('pending','paid','packed','shipped','delivered','cancelled','refunded')),
  tracking_carrier text, tracking_number text,
  razorpay_order_id text unique, razorpay_payment_id text unique,
  invoice_no bigint default nextval('invoice_seq'),
  created_at timestamptz not null default now(), paid_at timestamptz
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  title text not null, unit_paise integer not null, qty integer not null check (qty > 0)
);

-- ---------- enquiries (contact, custom invitations, services, collaborations, hiring) ----------
create table enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact','invitation','service','collaboration','hiring')),
  name text, email text, phone text, message text,
  details jsonb default '{}',
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- editable website photos & business settings ----------
create table site_images (
  key text primary key,                 -- e.g. 'home_hero', 'about_studio'
  label text not null,                  -- friendly name shown in her app
  path text not null,                   -- file path in storage
  alt text, updated_at timestamptz not null default now()
);

create table settings (
  key text primary key, value jsonb not null, is_public boolean not null default false
);
insert into settings (key, value, is_public) values
 ('business', '{"name":"Thin Black Brush","phone":"+91 99620 50962","phone2":"+91 95666 25373","email":"thinblackbrush@gmail.com","address":"2nd Floor - Berachah, 13/7, 1st Cross St, Trustpuram, Kodambakkam, Chennai, Tamil Nadu 600024","instagram":"https://www.instagram.com/thinblackbrush","facebook":"https://www.facebook.com/thinblackbrush","whatsapp":"919962050962","upi":"thinblack@ybl"}', true),
 ('gst', '{"enabled":false,"gstin":"","rate_percent":18}', false),
 ('shipping', '{"flat_paise":6000,"free_above_paise":200000}', true);

-- ---------- security (row level security) ----------
alter table profiles enable row level security;   alter table addresses enable row level security;
alter table workshops enable row level security;  alter table bookings enable row level security;
alter table products enable row level security;   alter table orders enable row level security;
alter table order_items enable row level security; alter table enquiries enable row level security;
alter table site_images enable row level security; alter table settings enable row level security;

-- profiles: you see/edit yourself; admin sees all
create policy "own profile read"   on profiles for select using (id = auth.uid() or is_admin());
create policy "own profile update" on profiles for update using (id = auth.uid() or is_admin());
-- addresses: private to the owner
create policy "own addresses" on addresses for all using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
-- workshops / products: public can read live ones; only admin changes
create policy "public read workshops" on workshops for select using (status in ('published','cancelled') or is_admin());
create policy "admin write workshops" on workshops for all using (is_admin()) with check (is_admin());
create policy "public read products" on products for select using (active or is_admin());
create policy "admin write products" on products for all using (is_admin()) with check (is_admin());
-- bookings / orders: customers read their own; ONLY the server (secret key) creates or updates them,
-- so prices and payment status can never be faked from a browser.
create policy "own bookings read" on bookings for select using (user_id = auth.uid() or is_admin());
create policy "admin manage bookings" on bookings for update using (is_admin());
create policy "own orders read" on orders for select using (user_id = auth.uid() or is_admin());
create policy "admin manage orders" on orders for update using (is_admin());
create policy "own order items read" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
-- enquiries: admin only (the website saves them through the server)
create policy "admin enquiries" on enquiries for all using (is_admin()) with check (is_admin());
-- site images & public settings
create policy "public read images" on site_images for select using (true);
create policy "admin write images" on site_images for all using (is_admin()) with check (is_admin());
create policy "public read settings" on settings for select using (is_public or is_admin());
create policy "admin write settings" on settings for all using (is_admin()) with check (is_admin());

-- ---------- photo storage ----------
insert into storage.buckets (id, name, public) values ('media','media',true) on conflict do nothing;
create policy "public read media" on storage.objects for select using (bucket_id = 'media');
create policy "admin upload media" on storage.objects for insert with check (bucket_id = 'media' and is_admin());
create policy "admin update media" on storage.objects for update using (bucket_id = 'media' and is_admin());
create policy "admin delete media" on storage.objects for delete using (bucket_id = 'media' and is_admin());

-- ---------- ONE-TIME: make the owner an admin (run after she signs up on the site) ----------
-- update profiles set role = 'admin' where id = (select id from auth.users where email = 'her-email@example.com');
