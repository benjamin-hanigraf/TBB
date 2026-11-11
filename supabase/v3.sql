-- ============ Part 3: writing-class levels and enrolments (pay online for a class level) ============
create table if not exists class_levels (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  track text not null check (track in ('handwriting','calligraphy')),
  title text not null, level text not null, description text,
  covers text[] not null default '{}',
  price_paise integer not null check (price_paise >= 0),
  sessions integer not null default 8,
  active boolean not null default true,
  sort_order integer not null default 0
);
insert into class_levels (slug, track, title, level, description, covers, price_paise, sort_order) values
 ('handwriting-1','handwriting','Basics of Handwriting','Level 1','Foundational handwriting skills, including proper letter formation and legibility.', array['Letter formation','Legibility'], 600000, 1),
 ('handwriting-2','handwriting','Basics of Handwriting','Level 2','Builds on the basics with decorative writing techniques.', array['Letter formation','Legibility','Faux calligraphy'], 600000, 2),
 ('calligraphy-1','calligraphy','Handwriting and Calligraphy','Level 1','Combines handwriting improvement with an introduction to decorative lettering.', array['Handwriting improvement','Faux calligraphy','Brush lettering'], 750000, 3),
 ('calligraphy-2','calligraphy','Handwriting and Calligraphy','Level 2','Takes your skills further, with advanced techniques and tools.', array['Handwriting improvement','Faux calligraphy','Brush lettering','Modern dip pen calligraphy'], 1000000, 4)
on conflict (slug) do nothing;

create table if not exists class_enrolments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references class_levels(id),
  user_id uuid references auth.users(id) on delete set null,
  student_name text not null,
  student_group text not null check (student_group in ('child','adult')),
  student_age integer check (student_age is null or student_age between 3 and 99),
  name text not null, email text not null, phone text not null,
  amount_paise integer not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded','transferred')),
  razorpay_order_id text unique, razorpay_payment_id text unique,
  invoice_no bigint default nextval('invoice_seq'),
  notes text, created_at timestamptz not null default now(), paid_at timestamptz
);
create index if not exists enrol_user on class_enrolments (user_id);

alter table class_levels enable row level security;
alter table class_enrolments enable row level security;
drop policy if exists "public read classes" on class_levels;
create policy "public read classes" on class_levels for select using (active or is_admin());
drop policy if exists "admin write classes" on class_levels;
create policy "admin write classes" on class_levels for all using (is_admin()) with check (is_admin());
drop policy if exists "own enrolments read" on class_enrolments;
create policy "own enrolments read" on class_enrolments for select using (user_id = auth.uid() or is_admin());
drop policy if exists "admin manage enrolments" on class_enrolments;
create policy "admin manage enrolments" on class_enrolments for update using (is_admin());

-- accounts: allow automatic entries for class payments
alter table ledger_entries drop constraint if exists ledger_entries_source_check;
alter table ledger_entries add constraint ledger_entries_source_check check (source in ('manual','order','booking','invoice','enrolment'));

grant all on class_levels, class_enrolments to service_role;
