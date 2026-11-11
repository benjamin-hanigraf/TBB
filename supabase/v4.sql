-- ============ Part 4: PIN-only owner access ============
-- Holds the owner PIN (salted hash only) and the wrong-guess counter. No policies on purpose:
-- no browser can read or write this table, only the website's server.
create table if not exists admin_security (
  key text primary key,
  value jsonb not null
);
alter table admin_security enable row level security;
grant all on admin_security to service_role;
-- if a PIN was saved in the old place, move it here
insert into admin_security (key, value) select 'pin', value from settings where key = 'admin_pin' on conflict (key) do nothing;
delete from settings where key = 'admin_pin';
