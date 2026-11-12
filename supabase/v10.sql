-- ============ Part 10: one-on-one classes ============
-- Run after v9. Safe to run twice.
-- A one-on-one student gets a private schedule (a "solo" batch with just them). Each class has its own date and time,
-- so classes can fall on any day. Group batches keep working as before.
alter table class_batches add column if not exists solo boolean not null default false;
alter table class_sessions add column if not exists time_text text;
create index if not exists sessions_date on class_sessions (on_date);
