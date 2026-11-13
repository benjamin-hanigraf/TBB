-- Accounting scenario tests: the accounts must follow every order, booking, class, invoice and rent-out, whatever happens to it.
\set ON_ERROR_STOP on
\set QUIET on
begin;
create or replace function pg_temp.entry(p_src text, p_id uuid) returns integer language sql as $$ select coalesce(sum(amount_paise), 0)::int from ledger_entries where source = p_src and source_id = p_id $$;
create or replace function pg_temp.issues(k text default null) returns bigint language sql as $$ select count(*) from accounts_check_rows() where k is null or kind = k $$;
insert into workshops (id, slug, title, starts_at, price_paise, capacity, status) values ('a0000000-0000-0000-0000-000000000001', 'acc-w', 'Acc W', now() + interval '9 days', 100000, 10, 'published');
insert into class_levels (id, slug, track, title, level, price_paise) values ('a0000000-0000-0000-0000-000000000002', 'acc-c', 'Hand', 'Acc C', 'L1', 500000);
do $$
declare o uuid := 'a0000000-0000-0000-0000-0000000000a1'; b uuid := 'a0000000-0000-0000-0000-0000000000b1'; e uuid := 'a0000000-0000-0000-0000-0000000000c1'; n int;
begin
  -- ORDERS
  insert into orders (id, name, email, phone, shipping_address, subtotal_paise, total_paise, status) values (o, 'Ola', 'o@x.com', '9', '{}', 150000, 150000, 'pending');
  assert pg_temp.entry('order', o) = 0, 'an unpaid order is not income';
  update orders set status = 'paid', paid_at = now(), payment_method = 'upi' where id = o;
  assert pg_temp.entry('order', o) = 150000, 'marking paid makes one income entry';
  update ledger_entries set amount_paise = 150001 where source = 'order' and source_id = o;
  update orders set status = 'shipped' where id = o;
  assert pg_temp.entry('order', o) = 150001, 'shipping an order does not overwrite a hand-edited entry';
  update ledger_entries set amount_paise = 150000 where source = 'order' and source_id = o;
  assert pg_temp.entry('order', o) = 150000 and (select count(*) from ledger_entries where source = 'order' and source_id = o) = 1, 'shipping changes nothing in the accounts';
  update orders set total_paise = 140000 where id = o;
  assert pg_temp.entry('order', o) = 140000, 'a changed total follows into the accounts';
  begin delete from ledger_entries where source = 'order' and source_id = o; assert false, 'deleting the payment entry of a paid order must be refused'; exception when others then assert sqlerrm like 'This entry is the payment%', 'the refusal says what to do: ' || sqlerrm; end;
  update orders set status = 'paid' where id = o; update orders set status = 'pending', paid_at = null where id = o;
  assert pg_temp.entry('order', o) = 0, 'marking not paid takes the income away';
  update orders set status = 'paid', paid_at = now() where id = o; update orders set status = 'refunded' where id = o;
  assert pg_temp.entry('order', o) = 140000, 'a refunded order keeps its income (the refund is its own entry)';
  insert into ledger_entries (kind, category, amount_paise, source, source_id) values ('out', 'Refunds', 140000, 'refund', o);
  assert pg_temp.issues() = 0, 'a fully refunded order with its refund entry is consistent: ' || (select string_agg(message, '; ') from accounts_check_rows());
  -- BOOKINGS
  insert into bookings (id, workshop_id, name, email, phone, seats, amount_paise, gst_paise, status, paid_at) values (b, 'a0000000-0000-0000-0000-000000000001', 'Bea', 'b@x.com', '9', 2, 200000, 30508, 'paid', now());
  assert pg_temp.entry('booking', b) = 200000 and (select gst_paise from ledger_entries where source = 'booking' and source_id = b) = 30508, 'a paid booking makes an entry with its GST';
  insert into ledger_entries (kind, category, amount_paise, source, source_id) values ('out', 'Refunds', 250000, 'refund', b);
  assert pg_temp.issues('refund') = 1, 'refunding more than was paid is flagged';
  delete from ledger_entries where source = 'refund' and source_id = b;
  update bookings set status = 'refunded' where id = b;
  assert pg_temp.issues('refund') = 1, 'marked refunded with no refund recorded is flagged';
  delete from bookings where id = b;
  assert pg_temp.entry('booking', b) = 0, 'a deleted booking takes its income entry away';
  -- ENROLMENTS
  insert into class_enrolments (id, class_id, student_name, student_group, student_age, name, email, phone, amount_paise, status, paid_at) values (e, 'a0000000-0000-0000-0000-000000000002', 'Kid', 'child', 8, 'Par', 'p@x.com', '9', 500000, 'pending', null);
  update class_enrolments set status = 'paid', paid_at = now(), payment_method = 'cash' where id = e;
  assert pg_temp.entry('enrolment', e) = 500000, 'a paid enrolment makes an entry';
  -- REPAIR: lose an entry, change an amount, add a stray one
  perform set_config('session_replication_role', 'replica', true); delete from ledger_entries where source = 'enrolment' and source_id = e; perform set_config('session_replication_role', 'origin', true);       -- simulating a lost entry (the guard would refuse a normal delete)
  assert pg_temp.issues('missing') = 1, 'a missing entry is found';
  perform ledger_repair(false, false);
  assert pg_temp.entry('enrolment', e) = 500000 and pg_temp.issues() = 0, 'repair adds the missing entry and nothing else changes';
  update ledger_entries set amount_paise = 1 where source = 'enrolment' and source_id = e;
  assert pg_temp.issues('amount') = 1, 'a wrong amount is found';
  perform ledger_repair(false, false); assert pg_temp.issues('amount') = 1, 'the safe repair does not touch amounts';
  perform ledger_repair(true, false); assert pg_temp.entry('enrolment', e) = 500000, 'repair can correct amounts when asked';
  insert into ledger_entries (kind, category, amount_paise, source, source_id) values ('in', 'Store sales', 999, 'order', gen_random_uuid());
  assert pg_temp.issues('orphan') = 1, 'an income entry with nothing behind it is found';
  perform ledger_repair(false, false); assert pg_temp.issues('orphan') = 1, 'orphans are only removed when asked';
  perform ledger_repair(true, true); assert pg_temp.issues() = 0, 'everything is consistent after a full repair';
  -- the dates are India dates
  assert (select entry_date from ledger_entries where source = 'enrolment' and source_id = e) = (now() at time zone 'Asia/Kolkata')::date, 'entries use the India date';
  -- INVOICE and RENT-OUT payments leave with their payment
  declare iv uuid := 'a0000000-0000-0000-0000-0000000000d1'; ip uuid := 'a0000000-0000-0000-0000-0000000000d2'; ro uuid := 'a0000000-0000-0000-0000-0000000000e1'; rp uuid := 'a0000000-0000-0000-0000-0000000000e2';
  begin
    insert into invoices (id, invoice_no, customer_name, subtotal_paise, total_paise, status) values (iv, 'ACC/1', 'Cust', 100000, 100000, 'sent');
    insert into invoice_payments (id, invoice_id, amount_paise, paid_on, method) values (ip, iv, 40000, current_date, 'upi');
    assert pg_temp.issues('invoice') = 1, 'a payment missing from the accounts is found';
    perform ledger_repair(false, false); assert pg_temp.entry('invoice', ip) = 40000 and pg_temp.issues() = 0, 'repair adds the missing invoice payment';
    delete from invoice_payments where id = ip; assert pg_temp.entry('invoice', ip) = 0, 'removing a payment removes its entry';
    insert into rentouts (id, name, on_date, amount_paise) values (ro, 'Hirer', current_date, 100000);
    insert into rentout_payments (id, rentout_id, amount_paise, paid_on, method) values (rp, ro, 100000, current_date, 'cash');
    perform ledger_repair(false, false); assert pg_temp.entry('rentout', rp) = 100000, 'a rent-out payment reaches the accounts';
    delete from rentouts where id = ro; assert pg_temp.entry('rentout', rp) = 0, 'deleting a rent-out removes its entries';
    delete from invoices where id = iv;
  end;
  raise notice 'ACCOUNTS TESTS PASSED';
end $$;
rollback;
