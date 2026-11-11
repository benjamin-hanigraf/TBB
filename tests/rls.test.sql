-- Database security tests. Run against a real Postgres with the project's three SQL files loaded.
\set ON_ERROR_STOP on
\set QUIET on
-- people
insert into auth.users (id, email, raw_user_meta_data) values
 ('aaaaaaaa-0000-0000-0000-000000000001','alice@x.com','{"full_name":"Alice"}'),
 ('bbbbbbbb-0000-0000-0000-000000000002','bob@x.com','{}'),
 ('cccccccc-0000-0000-0000-000000000003','owner@x.com','{}');
update profiles set role='admin' where email='owner@x.com';
insert into bookings (id,workshop_id,user_id,name,email,phone,seats,amount_paise,status)
 select 'dddddddd-0000-0000-0000-000000000001', id, 'aaaaaaaa-0000-0000-0000-000000000001','Alice','alice@x.com','9999999999',2,460000,'paid' from workshops where slug='modern-dip-pen-calligraphy';
insert into bookings (id,workshop_id,user_id,name,email,phone,seats,amount_paise,status)
 select 'dddddddd-0000-0000-0000-000000000002', id, 'bbbbbbbb-0000-0000-0000-000000000002','Bob','bob@x.com','8888888888',1,230000,'paid' from workshops where slug='modern-dip-pen-calligraphy';
insert into orders (id,user_id,name,email,phone,shipping_address,subtotal_paise,total_paise) values
 ('eeeeeeee-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Alice','alice@x.com','9','{}',100,100),
 ('eeeeeeee-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002','Bob','bob@x.com','8','{}',200,200);
insert into addresses (user_id,line1,city,state,pincode) values ('bbbbbbbb-0000-0000-0000-000000000002','Bob Street','Chennai','TN','600001');
insert into ledger_entries (kind,category,amount_paise) values ('in','Workshops',1000);
insert into invoices (invoice_no,customer_name,subtotal_paise,total_paise) values ('T/1','C',100,100);
insert into enquiries (kind,name,email,message) values ('contact','Z','z@x.com','hello there friend');
insert into class_enrolments (id,class_id,user_id,student_name,student_group,student_age,name,email,phone,amount_paise,status)
 select 'ffffffff-0000-0000-0000-000000000001', id, 'aaaaaaaa-0000-0000-0000-000000000001','Kid A','child',9,'Alice','alice@x.com','9',600000,'paid' from class_levels where slug='handwriting-1';
insert into class_enrolments (id,class_id,user_id,student_name,student_group,name,email,phone,amount_paise,status)
 select 'ffffffff-0000-0000-0000-000000000002', id, 'bbbbbbbb-0000-0000-0000-000000000002','Bob','adult','Bob','bob@x.com','8',600000,'paid' from class_levels where slug='handwriting-1';
update class_levels set active=false where slug='calligraphy-2';
insert into admin_security (key,value) values ('pin','{"hash":"x","salt":"y","version":1}');
update workshops set status='draft' where slug='beginners-watercolor-course';

create or replace function pg_temp.as_user(uid text, rolename text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(uid,''), true); execute format('set local role %I', rolename); end $$;
create or replace function pg_temp.count_of(t text) returns bigint language plpgsql as $$ declare n bigint; begin execute format('select count(*) from %s', t) into n; return n; end $$;
create or replace function pg_temp.denied(sql text) returns boolean language plpgsql as $$
declare n bigint;
begin begin execute sql; get diagnostics n = row_count; return n = 0;       -- changed nothing = blocked by row rules
 exception when insufficient_privilege or others then return true; end; end $$;   -- error = blocked
grant execute on all functions in schema pg_temp to public;

-- ============ ANONYMOUS VISITOR ============
begin; select pg_temp.as_user(null,'anon');
do $$ begin
  assert (select count(*) from workshops) = 1, 'anon should see only the published workshop (draft hidden)';
  assert (select count(*) from products) = 5, 'anon sees active products';
  assert (select count(*) from workshops_public) = 1, 'public workshop view works';
  assert (select count(*) from settings) = 2, 'anon sees only public settings (not GST/invoice)';
  assert (select count(*) from settings where key='gst') = 0, 'GST settings must stay private';
  assert (select count(*) from site_images) = 4, 'photos are public';
  assert pg_temp.count_of('bookings') = 0 and pg_temp.count_of('orders') = 0 and pg_temp.count_of('profiles') = 0 and pg_temp.count_of('addresses') = 0
     and pg_temp.count_of('enquiries') = 0 and pg_temp.count_of('ledger_entries') = 0 and pg_temp.count_of('invoices') = 0 and pg_temp.count_of('order_items') = 0, 'anon must see no private data';
  assert pg_temp.denied($q$insert into enquiries (kind,name,email,message) values ('contact','a','a@x.com','spam spam spam')$q$), 'anon cannot write enquiries directly';
  assert pg_temp.denied($q$insert into bookings (workshop_id,name,email,phone,seats,amount_paise) select id,'a','a@x.com','1',1,1 from workshops limit 1$q$), 'anon cannot create bookings directly';
  assert pg_temp.denied($q$insert into orders (name,email,phone,shipping_address,subtotal_paise,total_paise) values ('a','a@x.com','1','{}',1,1)$q$), 'anon cannot create orders directly';
  assert pg_temp.denied($q$update products set price_paise = 1$q$), 'anon cannot change prices';
  assert pg_temp.denied($q$update workshops set price_paise = 1$q$), 'anon cannot change workshops';
  assert pg_temp.denied($q$select book_seats((select id from workshops limit 1), null,'a','a@x.com','1',1,1)$q$), 'anon cannot call book_seats';
  assert pg_temp.denied($q$select decrement_stock((select id from products limit 1), 1)$q$), 'anon cannot call decrement_stock';
  assert pg_temp.denied($q$insert into storage.objects (bucket_id,name) values ('media','evil.webp')$q$), 'anon cannot upload files';
  assert pg_temp.denied($q$insert into ledger_entries (kind,category,amount_paise) values ('in','x',1)$q$), 'anon cannot write accounts';
  assert (select count(*) from class_levels) = 3, 'anon sees only active class levels';
  assert pg_temp.count_of('class_enrolments') = 0, 'anon sees no enrolments';
  assert pg_temp.count_of('admin_security') = 0, 'anon cannot read the PIN record';
  assert pg_temp.denied($q$insert into admin_security (key,value) values ('pin','{}') on conflict (key) do update set value='{}'$q$), 'anon cannot overwrite the PIN';
  assert pg_temp.denied($q$update class_levels set price_paise = 1$q$), 'anon cannot change class prices';
  assert pg_temp.denied($q$insert into class_enrolments (class_id,student_name,student_group,name,email,phone,amount_paise,status) select id,'x','adult','x','x@x.com','1',1,'paid' from class_levels limit 1$q$), 'anon cannot create enrolments';
end $$; rollback;

-- ============ CUSTOMER (ALICE) ============
begin; select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001','authenticated');
do $$ begin
  assert (select count(*) from bookings) = 1 and (select name from bookings) = 'Alice', 'alice sees only her booking';
  assert (select count(*) from orders) = 1, 'alice sees only her order';
  assert (select count(*) from profiles) = 1, 'alice sees only her profile';
  assert pg_temp.count_of('addresses') = 0, 'alice must not see bob''s address';
  assert pg_temp.count_of('ledger_entries') = 0 and pg_temp.count_of('invoices') = 0 and pg_temp.count_of('enquiries') = 0, 'alice cannot see business records';
  assert pg_temp.denied($q$update profiles set role='admin' where id='aaaaaaaa-0000-0000-0000-000000000001'$q$), 'alice cannot make herself admin';
  assert (select role from profiles) = 'customer', 'alice is still a customer';
  assert not pg_temp.denied($q$update profiles set full_name='Alice R', phone='9999999999' where id='aaaaaaaa-0000-0000-0000-000000000001'$q$), 'alice can edit her own details';
  assert pg_temp.denied($q$update profiles set full_name='Hacked' where id='bbbbbbbb-0000-0000-0000-000000000002'$q$), 'alice cannot edit bob';
  assert not pg_temp.denied($q$insert into addresses (user_id,line1,city,state,pincode) values ('aaaaaaaa-0000-0000-0000-000000000001','A St','Chennai','TN','600001')$q$), 'alice can save her own address';
  assert pg_temp.denied($q$insert into addresses (user_id,line1,city,state,pincode) values ('bbbbbbbb-0000-0000-0000-000000000002','Spoof','Chennai','TN','600001')$q$), 'alice cannot add an address to bob';
  assert pg_temp.denied($q$update orders set status='paid', total_paise=1 where id='eeeeeeee-0000-0000-0000-000000000001'$q$), 'alice cannot change her order';
  assert pg_temp.denied($q$update bookings set status='paid' where id='dddddddd-0000-0000-0000-000000000001'$q$), 'alice cannot change her booking';
  assert pg_temp.denied($q$delete from bookings$q$), 'alice cannot delete bookings';
  assert pg_temp.denied($q$insert into orders (user_id,name,email,phone,shipping_address,subtotal_paise,total_paise,status) values ('aaaaaaaa-0000-0000-0000-000000000001','a','a@x.com','1','{}',1,1,'paid')$q$), 'alice cannot create a paid order';
  assert pg_temp.denied($q$update products set price_paise = 1$q$), 'alice cannot change prices';
  assert pg_temp.denied($q$insert into storage.objects (bucket_id,name) values ('media','evil.webp')$q$), 'alice cannot upload to the website media';
  assert pg_temp.denied($q$select book_seats((select id from workshops limit 1), null,'a','a@x.com','1',1,1)$q$), 'alice cannot call book_seats';
  assert (select count(*) from class_enrolments) = 1 and (select student_name from class_enrolments) = 'Kid A', 'alice sees only her enrolment';
  assert pg_temp.count_of('admin_security') = 0, 'a customer cannot read the PIN record';
  assert pg_temp.denied($q$update admin_security set value='{}'$q$), 'a customer cannot change the PIN';
  assert pg_temp.denied($q$update class_enrolments set status='refunded' where id='ffffffff-0000-0000-0000-000000000001'$q$), 'alice cannot change her enrolment';
  assert pg_temp.denied($q$update class_levels set price_paise = 1$q$), 'alice cannot change class prices';
  assert pg_temp.denied($q$insert into class_enrolments (class_id,user_id,student_name,student_group,name,email,phone,amount_paise,status) select id,'aaaaaaaa-0000-0000-0000-000000000001','x','adult','x','x@x.com','1',1,'paid' from class_levels limit 1$q$), 'alice cannot create a paid enrolment';
end $$; rollback;

-- ============ OWNER (ADMIN) ============
begin; select pg_temp.as_user('cccccccc-0000-0000-0000-000000000003','authenticated');
do $$ begin
  assert (select count(*) from bookings) = 2 and (select count(*) from orders) = 2 and (select count(*) from profiles) = 3, 'owner sees everything';
  assert pg_temp.count_of('addresses') = 1 and pg_temp.count_of('enquiries') = 1 and pg_temp.count_of('ledger_entries') = 1 and pg_temp.count_of('invoices') = 1, 'owner sees business records';
  assert (select count(*) from workshops) = 2, 'owner sees drafts';
  assert (select count(*) from settings) = 3, 'owner sees private settings';
  assert not pg_temp.denied($q$update products set stock = 5 where slug='2024-maroon-planner'$q$), 'owner can edit products';
  assert not pg_temp.denied($q$insert into workshops (slug,title,starts_at,price_paise) values ('x','X', now() + interval '1 day', 100)$q$), 'owner can add workshops';
  assert not pg_temp.denied($q$update orders set status='shipped' where id='eeeeeeee-0000-0000-0000-000000000001'$q$), 'owner can update orders';
  assert not pg_temp.denied($q$insert into ledger_entries (kind,category,amount_paise) values ('out','Printing',500)$q$), 'owner can add expenses';
  assert not pg_temp.denied($q$insert into invoices (invoice_no,customer_name,subtotal_paise,total_paise) values ('T/2','D',1,1)$q$), 'owner can make invoices';
  assert not pg_temp.denied($q$insert into storage.objects (bucket_id,name) values ('media','products/x.webp')$q$), 'owner can upload photos';
  assert pg_temp.denied($q$insert into storage.objects (bucket_id,name) values ('private','x.webp')$q$), 'owner upload limited to the media folder';
  assert pg_temp.denied($q$select decrement_stock((select id from products limit 1), 1)$q$), 'even the owner browser cannot call server-only functions';
  assert pg_temp.count_of('class_enrolments') = 2 and (select count(*) from class_levels) = 4, 'owner sees all enrolments and inactive levels';
  assert pg_temp.count_of('admin_security') = 0, 'even the owner browser session cannot read the PIN record (only the server can)';
  assert pg_temp.denied($q$update admin_security set value='{}'$q$), 'the owner browser session cannot change the PIN directly';
  assert not pg_temp.denied($q$update class_levels set price_paise = 650000 where slug='handwriting-1'$q$), 'owner can change class prices';
  assert not pg_temp.denied($q$update class_enrolments set status='transferred' where id='ffffffff-0000-0000-0000-000000000002'$q$), 'owner can update enrolments';
  assert not pg_temp.denied($q$insert into ledger_entries (source,source_id,kind,category,amount_paise) values ('enrolment',gen_random_uuid(),'in','Classes',100)$q$), 'enrolment accounting entries are allowed';
end $$; rollback;

-- ============ THE WEBSITE SERVER (service role) ============
begin; select pg_temp.as_user(null,'service_role');
do $$ declare w uuid; b uuid; ok boolean; begin
  insert into workshops (slug,title,starts_at,price_paise,capacity,status) values ('future','Future', now() + interval '3 days', 100000, 10, 'published') returning id into w;
  b := book_seats(w, null, 'Cara', 'c@x.com', '7777777777', 3, 300000);
  assert b is not null, 'seats can be booked';
  begin perform book_seats(w, null, 'Dan', 'd@x.com', '6666666666', 8, 1); assert false, 'overbooking must fail'; exception when others then assert sqlerrm like '%sold_out%', 'overbooking says sold_out: ' || sqlerrm; end;
  perform book_seats(w, null, 'Eve', 'e@x.com', '4444444444', 7, 700000);
  begin perform book_seats(w, null, 'Fay', 'f@x.com', '3333333333', 1, 1); assert false, 'a full workshop must refuse'; exception when others then assert sqlerrm like '%sold_out%', 'full says sold_out: ' || sqlerrm; end;
  update bookings set status='cancelled' where id=b;
  perform book_seats(w, null, 'Gus', 'g@x.com', '2222222222', 3, 300000);   -- cancelled seats are released
  begin perform book_seats((select id from workshops where slug='modern-dip-pen-calligraphy'), null, 'Old', 'o@x.com', '1111111111', 1, 1); assert false, 'a past workshop must refuse'; exception when others then assert sqlerrm like '%closed%', 'past says closed: ' || sqlerrm; end;
  begin perform book_seats((select id from workshops where slug='beginners-watercolor-course'), null, 'E', 'e@x.com', '5555555555', 1, 1); assert false, 'draft workshop must fail'; exception when others then assert sqlerrm like '%closed%', 'draft says closed: ' || sqlerrm; end;
  update products set stock = 2 where slug='2024-maroon-planner';
  assert decrement_stock((select id from products where slug='2024-maroon-planner'), 2) = true, 'stock can be reduced';
  assert decrement_stock((select id from products where slug='2024-maroon-planner'), 1) = false, 'stock cannot go below zero';
  assert (select stock from products where slug='2024-maroon-planner') = 0, 'stock is exactly zero';
  assert (select count(*) from admin_security) = 1, 'the server can read the PIN record';
end $$; rollback;
\echo ALL DATABASE SECURITY TESTS PASSED
