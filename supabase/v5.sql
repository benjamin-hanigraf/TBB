-- ============ Part 5: a proper customers list, and refunds in the accounts ============
-- One row per customer. Import old customers (for example from Wix) by uploading a CSV into this table.
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
create or replace function customers_tidy() returns trigger language plpgsql as $$
begin new.email := nullif(lower(btrim(new.email)), ''); new.name := btrim(new.name); return new; end $$;
drop trigger if exists customers_tidy_trg on customers;
create trigger customers_tidy_trg before insert or update on customers for each row execute function customers_tidy();
alter table customers enable row level security;
drop policy if exists "admin customers" on customers;
create policy "admin customers" on customers for all using (is_admin()) with check (is_admin());
drop policy if exists "own customer read" on customers;
create policy "own customer read" on customers for select using (user_id = auth.uid());
grant all on customers to service_role;

-- every new sign-up also becomes a customer
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare nm text := coalesce(nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'name',''));
begin
  insert into profiles (id, full_name, email) values (new.id, nm, new.email) on conflict (id) do nothing;
  if new.email is not null then
    insert into customers (name, email, user_id, source) values (coalesce(nm, split_part(new.email,'@',1)), new.email, new.id, 'website')
    on conflict (email) do update set user_id = coalesce(customers.user_id, excluded.user_id);
  end if;
  return new;
end $$;

-- fill the list from everyone who already signed up, ordered or booked
insert into customers (name, email, phone, user_id, source)
  select coalesce(nullif(full_name,''), split_part(email,'@',1)), email, phone, id, 'website' from profiles where role = 'customer' and email is not null
  on conflict (email) do update set user_id = coalesce(customers.user_id, excluded.user_id), phone = coalesce(customers.phone, excluded.phone);
insert into customers (name, email, phone, source) select distinct on (lower(email)) name, email, phone, 'website' from orders where email is not null order by lower(email), created_at desc on conflict (email) do nothing;
insert into customers (name, email, phone, source) select distinct on (lower(email)) name, email, phone, 'website' from bookings where email is not null order by lower(email), created_at desc on conflict (email) do nothing;
insert into customers (name, email, phone, source) select distinct on (lower(email)) name, email, phone, 'website' from class_enrolments where email is not null order by lower(email), created_at desc on conflict (email) do nothing;

-- refunds can be recorded in the accounts as money out
alter table ledger_entries drop constraint if exists ledger_entries_source_check;
alter table ledger_entries add constraint ledger_entries_source_check check (source in ('manual','invoice','order','booking','enrolment','refund'));
