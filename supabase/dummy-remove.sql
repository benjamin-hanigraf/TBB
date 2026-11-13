-- ============ REMOVE DUMMY TEST DATA ============
-- Takes out everything supabase/dummy.sql added (every row whose id starts with dededede-), plus what you made
-- while testing with it: accounts entries, payments and attendance linked to dummy rows, and customers, orders,
-- bookings, enrolments and enquiries that use an @example.com email.
-- Real data is not touched. Safe to run more than once. Run it in the Supabase SQL Editor before the site goes live.
begin;

-- 1. accounts entries: the dummy ones, and any linked to a dummy order, booking, enrolment, invoice or invoice payment
delete from ledger_entries where id::text like 'dededede-%' or source_id::text like 'dededede-%'
  or source_id in (select id from invoice_payments where invoice_id in (select id from invoices where id::text like 'dededede-%' or invoice_no like 'DEMO%'))
  or source_id in (select id from orders where email ilike '%@example.com')
  or source_id in (select id from bookings where email ilike '%@example.com')
  or source_id in (select id from class_enrolments where email ilike '%@example.com');

-- 2. invoices, quotations and credit notes (their payments go with them)
delete from invoices where id::text like 'dededede-%' or invoice_no like 'DEMO%';

-- 3. orders (their items go with them), bookings, enrolments (their attendance goes with them)
delete from orders where id::text like 'dededede-%' or email ilike '%@example.com';
delete from bookings where id::text like 'dededede-%' or email ilike '%@example.com' or workshop_id::text like 'dededede-%';
delete from class_enrolments where id::text like 'dededede-%' or email ilike '%@example.com' or class_id::text like 'dededede-%';

-- 4. classes (each student's dated classes went with their enrolment), class types, workshops, products
delete from class_levels where id::text like 'dededede-%';
delete from class_types where id::text like 'dededede-%';
delete from workshops where id::text like 'dededede-%';
delete from products where id::text like 'dededede-%' and not exists (select 1 from order_items i where i.product_id = products.id);
update products set active = false where id::text like 'dededede-%';   -- only left if a real order used it: hidden instead

-- 5. people, inbox, calendar, to-dos
delete from customers where id::text like 'dededede-%' or email ilike '%@example.com';
delete from enquiries where id::text like 'dededede-%' or email ilike '%@example.com';
delete from events where id::text like 'dededede-%';
delete from rentouts where id::text like 'dededede-%' or email ilike '%@example.com';
delete from todos where id::text like 'dededede-%';

-- what is left (should all be 0)
select 'dummy rows left' as check, (select count(*) from workshops where id::text like 'dededede-%') + (select count(*) from orders where id::text like 'dededede-%')
  + (select count(*) from invoices where id::text like 'dededede-%') + (select count(*) from customers where id::text like 'dededede-%')
  + (select count(*) from ledger_entries where id::text like 'dededede-%') + (select count(*) from class_levels where id::text like 'dededede-%') as n;
commit;
