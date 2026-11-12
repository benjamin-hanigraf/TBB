-- ============ DUMMY TEST DATA (made by tools/make_dummy_sql.py, do not edit by hand) ============
-- Fills every table with at least 10 varied rows so every screen of the website and the Manager app can be tried.
-- Run AFTER supabase/database.sql. Run it once; to take everything out again run supabase/dummy-remove.sql.
-- Every dummy row has an id starting with dededede- and every dummy person uses an @example.com email.
-- Dummy workshops, products and classes are named "Demo ..." and DO show on the public website while they are in the database.
-- Website receipt numbers are not used up: dummy orders, bookings and enrolments use numbers 9001 and up.
-- Not touched on purpose: settings, site_images, admin_security (the PIN) and profiles (real logins only).
begin;


-- workshops: published, draft, cancelled, past, sold out, almost full, free, early-bird, friend price, courses over several days, every GST option

insert into workshops (id, slug, title, kind, summary, description, venue_name, venue_address, map_link, starts_at, ends_at, price_paise, friend_price_paise, early_price_paise, early_until, capacity, includes, learn, note, image_path, status, gst_mode) values
('dededede-0001-4000-8000-000000000001', 'demo-brush-lettering-basics', 'Demo: Brush Lettering Basics', 'workshop', 'A test workshop made for trying out the website. Remove with dummy-remove.sql.', 'This is dummy text.

It lets you see how a long description, the list of what is included and what you will learn look on the page.', 'Thin Black Brush Studio', '2nd Floor, Berachah Building, 13/7, 1st Cross St, Trustpuram, Kodambakkam, Chennai - 600024', 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7', ((current_date + 21) + time '10:00') at time zone 'Asia/Kolkata', ((current_date + 21) + time '13:00') at time zone 'Asia/Kolkata', 180000, 160000, 150000, (current_date + 7), 12, array['All materials','Practice sheets','Tea and snacks'], array['Basic strokes','Letter shapes','Putting words together'], 'Materials are provided.', '/img/16cc08c542.webp', 'published', 'none'),
('dededede-0001-4000-8000-000000000002', 'demo-watercolour-florals', 'Demo: Watercolour Florals', 'workshop', 'A test workshop made for trying out the website. Remove with dummy-remove.sql.', 'This is dummy text.

It lets you see how a long description, the list of what is included and what you will learn look on the page.', 'Thin Black Brush Studio', '2nd Floor, Berachah Building, 13/7, 1st Cross St, Trustpuram, Kodambakkam, Chennai - 600024', 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7', ((current_date + 10) + time '10:00') at time zone 'Asia/Kolkata', ((current_date + 10) + time '13:00') at time zone 'Asia/Kolkata', 250000, null, null, null, 6, array['All materials','Practice sheets','Tea and snacks'], array['Basic strokes','Letter shapes','Putting words together'], null, '/img/26928ebd04.webp', 'published', 'included'),
('dededede-0001-4000-8000-000000000003', 'demo-copperplate-course', 'Demo: Copperplate Calligraphy Course', 'course', 'A test workshop made for trying out the website. Remove with dummy-remove.sql.', 'This is dummy text.

It lets you see how a long description, the list of what is included and what you will learn look on the page.', 'Thin Black Brush Studio', '2nd Floor, Berachah Building, 13/7, 1st Cross St, Trustpuram, Kodambakkam, Chennai - 600024', 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7', ((current_date + 30) + time '10:00') at time zone 'Asia/Kolkata', ((current_date + 58) + time '13:00') at time zone 'Asia/Kolkata', 1200000, null, null, null, 8, array['All materials','Practice sheets','Tea and snacks'], array['Basic strokes','Letter shapes','Putting words together'], 'Materials are provided.', '/img/31648a2db3.webp', 'published', 'add'),
('dededede-0001-4000-8000-000000000004', 'demo-gouache-landscapes', 'Demo: Gouache Landscapes', 'workshop', 'A test workshop made for trying out the website. Remove with dummy-remove.sql.', 'This is dummy text.

It lets you see how a long description, the list of what is included and what you will learn look on the page.', 'The Bangalore Local', '1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka', 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7', ((current_date + -20) + time '10:00') at time zone 'Asia/Kolkata', ((current_date + -20) + time '13:00') at time zone 'Asia/Kolkata', 220000, null, null, null, 10, array['All materials','Practice sheets','Tea and snacks'], array['Basic strokes','Letter shapes','Putting words together'], null, '/img/cb028c51a9.webp', 'published', 'none'),
('dededede-0001-4000-8000-000000000005', 'demo-kids-doodle-camp', 'Demo: Kids Doodle Camp (ages 6 to 12)', 'course', 'A test workshop made for trying out the website. Remove with dummy-remove.sql.', 'This is dummy text.

It lets you see how a long description, the list of what is included and what you will learn look on the page.', 'Thin Black Brush Studio', '2nd Floor, Berachah Building, 13/7, 1st Cross St, Trustpuram, Kodambakkam, Chennai - 600024', 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7', ((current_date + 40) + time '10:00') at time zone 'Asia/Kolkata', ((current_date + 44) + time '13:00') at time zone 'Asia/Kolkata', 350000, null, 300000, (current_date + 20), 15, array['All materials','Practice sheets','Tea and snacks'], array['Basic strokes','Letter shapes','Putting words together'], 'Materials are provided.', '/img/5c8f647552.webp', 'published', 'none'),
('dededede-0001-4000-8000-000000000006', 'demo-ink-and-wash', 'Demo: Ink and Wash Painting', 'workshop', 'A test workshop made for trying out the website. Remove with dummy-remove.sql.', 'This is dummy text.

It lets you see how a long description, the list of what is included and what you will learn look on the page.', 'Thin Black Brush Studio', '2nd Floor, Berachah Building, 13/7, 1st Cross St, Trustpuram, Kodambakkam, Chennai - 600024', 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7', ((current_date + 50) + time '10:00') at time zone 'Asia/Kolkata', ((current_date + 50) + time '13:00') at time zone 'Asia/Kolkata', 200000, null, null, null, 10, array['All materials','Practice sheets','Tea and snacks'], array['Basic strokes','Letter shapes','Putting words together'], null, '/img/a399441366.webp', 'draft', 'none'),
('dededede-0001-4000-8000-000000000007', 'demo-gift-tag-lettering', 'Demo: Gift Tag Lettering', 'workshop', 'A test workshop made for trying out the website. Remove with dummy-remove.sql.', 'This is dummy text.

It lets you see how a long description, the list of what is included and what you will learn look on the page.', 'The Bangalore Local', '1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka', 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7', ((current_date + 15) + time '10:00') at time zone 'Asia/Kolkata', ((current_date + 15) + time '13:00') at time zone 'Asia/Kolkata', 150000, null, null, null, 12, array['All materials','Practice sheets','Tea and snacks'], array['Basic strokes','Letter shapes','Putting words together'], 'Materials are provided.', '/img/16cc08c542.webp', 'cancelled', 'none'),
('dededede-0001-4000-8000-000000000008', 'demo-free-open-studio', 'Demo: Free Open Studio Evening', 'workshop', 'A test workshop made for trying out the website. Remove with dummy-remove.sql.', 'This is dummy text.

It lets you see how a long description, the list of what is included and what you will learn look on the page.', 'Thin Black Brush Studio', '2nd Floor, Berachah Building, 13/7, 1st Cross St, Trustpuram, Kodambakkam, Chennai - 600024', 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7', ((current_date + 5) + time '17:30') at time zone 'Asia/Kolkata', ((current_date + 5) + time '13:00') at time zone 'Asia/Kolkata', 0, null, null, null, 20, '{}', array['Basic strokes','Letter shapes','Putting words together'], null, '/img/26928ebd04.webp', 'published', 'none'),
('dededede-0001-4000-8000-000000000009', 'demo-gothic-blackletter', 'Demo: Gothic Blackletter', 'workshop', 'A test workshop made for trying out the website. Remove with dummy-remove.sql.', 'This is dummy text.

It lets you see how a long description, the list of what is included and what you will learn look on the page.', 'Thin Black Brush Studio', '2nd Floor, Berachah Building, 13/7, 1st Cross St, Trustpuram, Kodambakkam, Chennai - 600024', 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7', ((current_date + -60) + time '10:00') at time zone 'Asia/Kolkata', ((current_date + -60) + time '13:00') at time zone 'Asia/Kolkata', 230000, null, null, null, 12, array['All materials','Practice sheets','Tea and snacks'], array['Basic strokes','Letter shapes','Putting words together'], 'Materials are provided.', '/img/31648a2db3.webp', 'published', 'included'),
('dededede-0001-4000-8000-000000000010', 'demo-wedding-envelope-addressing', 'Demo: Wedding Envelope Addressing', 'workshop', 'A test workshop made for trying out the website. Remove with dummy-remove.sql.', 'This is dummy text.

It lets you see how a long description, the list of what is included and what you will learn look on the page.', 'The Bangalore Local', '1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka', 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7', ((current_date + 70) + time '10:00') at time zone 'Asia/Kolkata', ((current_date + 70) + time '13:00') at time zone 'Asia/Kolkata', 280000, 250000, null, null, 8, array['All materials','Practice sheets','Tea and snacks'], array['Basic strokes','Letter shapes','Putting words together'], null, '/img/cb028c51a9.webp', 'published', 'add'),
('dededede-0001-4000-8000-000000000011', 'demo-pointed-pen-flourishing', 'Demo: Pointed Pen Flourishing', 'workshop', 'A test workshop made for trying out the website. Remove with dummy-remove.sql.', 'This is dummy text.

It lets you see how a long description, the list of what is included and what you will learn look on the page.', 'Thin Black Brush Studio', '2nd Floor, Berachah Building, 13/7, 1st Cross St, Trustpuram, Kodambakkam, Chennai - 600024', 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7', ((current_date + 2) + time '11:00') at time zone 'Asia/Kolkata', ((current_date + 2) + time '13:00') at time zone 'Asia/Kolkata', 240000, null, null, null, 4, array['All materials','Practice sheets','Tea and snacks'], array['Basic strokes','Letter shapes','Putting words together'], 'Materials are provided.', '/img/5c8f647552.webp', 'published', 'none'),
('dededede-0001-4000-8000-000000000012', 'demo-corporate-team-session', 'Demo: Corporate Team Lettering Session', 'workshop', 'A test workshop made for trying out the website. Remove with dummy-remove.sql.', 'This is dummy text.

It lets you see how a long description, the list of what is included and what you will learn look on the page.', 'The Bangalore Local', '1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka', 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7', ((current_date + 90) + time '10:00') at time zone 'Asia/Kolkata', ((current_date + 90) + time '13:00') at time zone 'Asia/Kolkata', 150000, null, null, null, 30, array['All materials','Practice sheets','Tea and snacks'], array['Basic strokes','Letter shapes','Putting words together'], null, '/img/a399441366.webp', 'draft', 'add');

-- products: in stock, low stock, out of stock, pre-order, hidden, every GST option

insert into products (id, slug, title, description, details, price_paise, stock, allow_preorder, images, shipping_note, active, sort_order, gst_mode) values
('dededede-0002-4000-8000-000000000001', 'demo-sketchbook-a5', 'Demo: A5 Sketchbook', 'A dummy product for testing the store, the bag and checkout.', array['Test detail one','Test detail two'], 65000, 25, false, array['/img/4aab591127.webp','/img/33e1b05fd6.webp'], null, true, 100, 'none'),
('dededede-0002-4000-8000-000000000002', 'demo-nib-set', 'Demo: Calligraphy Nib Set of 5', 'A dummy product for testing the store, the bag and checkout.', array['Test detail one','Test detail two'], 90000, 3, false, array['/img/33e1b05fd6.webp','/img/42e66b73f9.webp'], null, true, 101, 'included'),
('dededede-0002-4000-8000-000000000003', 'demo-sumi-ink', 'Demo: Sumi Ink 60 ml', 'A dummy product for testing the store, the bag and checkout.', array['Test detail one','Test detail two'], 45000, 0, false, array['/img/42e66b73f9.webp','/img/e36ba5ccbd.webp'], null, true, 102, 'none'),
('dededede-0002-4000-8000-000000000004', 'demo-custom-holder', 'Demo: Custom Engraved Holder (pre-order)', 'A dummy product for testing the store, the bag and checkout.', array['Test detail one','Test detail two'], 210000, 0, true, array['/img/e36ba5ccbd.webp','/img/4aab591127.webp'], 'Ships in 8 days.', true, 103, 'add'),
('dededede-0002-4000-8000-000000000005', 'demo-practice-pad', 'Demo: Practice Pad 100 Sheets', 'A dummy product for testing the store, the bag and checkout.', array['Test detail one','Test detail two'], 35000, 40, false, array['/img/4aab591127.webp','/img/33e1b05fd6.webp'], null, true, 104, 'none'),
('dededede-0002-4000-8000-000000000006', 'demo-gift-box', 'Demo: Lettering Gift Box', 'A dummy product for testing the store, the bag and checkout.', array['Test detail one','Test detail two'], 320000, 6, false, array['/img/33e1b05fd6.webp','/img/42e66b73f9.webp'], null, true, 105, 'add'),
('dededede-0002-4000-8000-000000000007', 'demo-brush-pen-trio', 'Demo: Brush Pen Trio', 'A dummy product for testing the store, the bag and checkout.', array['Test detail one','Test detail two'], 55000, 1, false, array['/img/42e66b73f9.webp','/img/e36ba5ccbd.webp'], null, true, 106, 'included'),
('dededede-0002-4000-8000-000000000008', 'demo-old-planner', 'Demo: Old Planner (hidden)', 'A dummy product for testing the store, the bag and checkout.', array['Test detail one','Test detail two'], 80000, 5, false, array['/img/e36ba5ccbd.webp','/img/4aab591127.webp'], null, false, 107, 'none'),
('dededede-0002-4000-8000-000000000009', 'demo-watercolour-tin', 'Demo: Watercolour Tin of 12', 'A dummy product for testing the store, the bag and checkout.', array['Test detail one','Test detail two'], 150000, 12, false, array['/img/4aab591127.webp','/img/33e1b05fd6.webp'], null, true, 108, 'add'),
('dededede-0002-4000-8000-000000000010', 'demo-paper-sampler', 'Demo: Handmade Paper Sampler', 'A dummy product for testing the store, the bag and checkout.', array['Test detail one','Test detail two'], 25000, 50, false, array['/img/33e1b05fd6.webp','/img/42e66b73f9.webp'], null, true, 109, 'none'),
('dededede-0002-4000-8000-000000000011', 'demo-gold-ink', 'Demo: Gold Pearl Ink', 'A dummy product for testing the store, the bag and checkout.', array['Test detail one','Test detail two'], 60000, 8, false, array['/img/42e66b73f9.webp','/img/e36ba5ccbd.webp'], null, true, 110, 'none'),
('dededede-0002-4000-8000-000000000012', 'demo-lightbox', 'Demo: A4 LED Lightbox', 'A dummy product for testing the store, the bag and checkout.', array['Test detail one','Test detail two'], 280000, 2, true, array['/img/e36ba5ccbd.webp','/img/4aab591127.webp'], 'Ships in 8 days.', true, 111, 'included');

-- class types (the drop-down on the class form)

insert into class_types (id, name, sort_order) values
('dededede-0012-4000-8000-000000000001', 'Demo: Cursive', 100),
('dededede-0012-4000-8000-000000000002', 'Demo: Brush Lettering', 101),
('dededede-0012-4000-8000-000000000003', 'Demo: Copperplate', 102),
('dededede-0012-4000-8000-000000000004', 'Demo: Italic', 103),
('dededede-0012-4000-8000-000000000005', 'Demo: Gothic', 104),
('dededede-0012-4000-8000-000000000006', 'Demo: Faux Calligraphy', 105),
('dededede-0012-4000-8000-000000000007', 'Demo: Print Handwriting', 106),
('dededede-0012-4000-8000-000000000008', 'Demo: Kids Art', 107),
('dededede-0012-4000-8000-000000000009', 'Demo: Watercolour', 108),
('dededede-0012-4000-8000-000000000010', 'Demo: Sketching', 109);

-- class levels: several tracks, active and hidden, every GST option

insert into class_levels (id, slug, track, title, level, description, covers, price_paise, sessions, active, sort_order, gst_mode) values
('dededede-0003-4000-8000-000000000001', 'demo-cursive-1', 'Demo: Cursive', 'Cursive Writing', 'Level 1', 'A dummy class level for testing enrolments and one-on-one classes.', array['Posture and grip','Basic strokes','Letters and joins'], 500000, 8, true, 100, 'none'),
('dededede-0003-4000-8000-000000000002', 'demo-cursive-2', 'Demo: Cursive', 'Cursive Writing', 'Level 2', 'A dummy class level for testing enrolments and one-on-one classes.', array['Posture and grip','Basic strokes','Letters and joins'], 550000, 8, true, 101, 'none'),
('dededede-0003-4000-8000-000000000003', 'demo-brush-1', 'Demo: Brush Lettering', 'Brush Lettering', 'Beginner', 'A dummy class level for testing enrolments and one-on-one classes.', array['Posture and grip','Basic strokes','Letters and joins'], 650000, 6, true, 102, 'included'),
('dededede-0003-4000-8000-000000000004', 'demo-brush-2', 'Demo: Brush Lettering', 'Brush Lettering', 'Intermediate', 'A dummy class level for testing enrolments and one-on-one classes.', array['Posture and grip','Basic strokes','Letters and joins'], 700000, 6, true, 103, 'add'),
('dededede-0003-4000-8000-000000000005', 'demo-copperplate-1', 'Demo: Copperplate', 'Copperplate', 'Foundation', 'A dummy class level for testing enrolments and one-on-one classes.', array['Posture and grip','Basic strokes','Letters and joins'], 900000, 10, true, 104, 'add'),
('dededede-0003-4000-8000-000000000006', 'demo-italic-1', 'Demo: Italic', 'Italic Hand', 'Level 1', 'A dummy class level for testing enrolments and one-on-one classes.', array['Posture and grip','Basic strokes','Letters and joins'], 600000, 8, true, 105, 'none'),
('dededede-0003-4000-8000-000000000007', 'demo-kids-art', 'Demo: Kids Art', 'Kids Art Club', 'Ages 5 to 8', 'A dummy class level for testing enrolments and one-on-one classes.', array['Posture and grip','Basic strokes','Letters and joins'], 400000, 12, true, 106, 'none'),
('dededede-0003-4000-8000-000000000008', 'demo-watercolour-1', 'Demo: Watercolour', 'Watercolour', 'Beginner', 'A dummy class level for testing enrolments and one-on-one classes.', array['Posture and grip','Basic strokes','Letters and joins'], 800000, 8, true, 107, 'included'),
('dededede-0003-4000-8000-000000000009', 'demo-gothic-1', 'Demo: Gothic', 'Gothic Script', 'Level 1', 'A dummy class level for testing enrolments and one-on-one classes.', array['Posture and grip','Basic strokes','Letters and joins'], 750000, 8, false, 108, 'none'),
('dededede-0003-4000-8000-000000000010', 'demo-sketching-1', 'Demo: Sketching', 'Urban Sketching', 'Open level', 'A dummy class level for testing enrolments and one-on-one classes.', array['Posture and grip','Basic strokes','Letters and joins'], 450000, 4, true, 109, 'add');

-- customers: every source, opted in and out, with and without email, and a duplicate pair (same phone) to try Merge

insert into customers (id, name, email, phone, address_line1, address_line2, city, state, pincode, notes, source, marketing_opt_in) values
('dededede-000b-4000-8000-000000000001', 'Anita Rao', 'anita.rao@example.com', '+91 98765 00001', '10, Test Street', 'Near the dummy park', 'Chennai', 'Tamil Nadu', '600024', 'Prefers WhatsApp', 'website', true),
('dededede-000b-4000-8000-000000000002', 'Vikram Iyer', 'vikram.iyer@example.com', '+91 98765 00002', '11, Test Street', null, 'Chennai', 'Tamil Nadu', '600017', 'Left-handed, needs a left oblique holder', 'website', false),
('dededede-000b-4000-8000-000000000003', 'Meera Krishnan', 'meera.k@example.com', '+91 98765 00003', '12, Test Street', null, 'Bengaluru', 'Karnataka', '560034', null, 'wix', true),
('dededede-000b-4000-8000-000000000004', 'Rohan Mehta', 'rohan.mehta@example.com', '+91 98765 00004', '13, Test Street', 'Near the dummy park', 'Mumbai', 'Maharashtra', '400050', 'Corporate enquiry contact', 'manual', false),
('dededede-000b-4000-8000-000000000005', 'Fatima Sheikh', 'fatima.s@example.com', '+91 98765 00005', '14, Test Street', null, 'Hyderabad', 'Telangana', '500034', 'Prefers WhatsApp', 'import', true),
('dededede-000b-4000-8000-000000000006', 'Arjun Nair', 'arjun.nair@example.com', '+91 98765 00006', '15, Test Street', null, 'Kochi', 'Kerala', '682020', 'Left-handed, needs a left oblique holder', 'website', false),
('dededede-000b-4000-8000-000000000007', 'Priya Sundaram', 'priya.s@example.com', '+91 98765 00007', '16, Test Street', 'Near the dummy park', 'Chennai', 'Tamil Nadu', '600028', null, 'wix', true),
('dededede-000b-4000-8000-000000000008', 'Karthik Raman', 'karthik.r@example.com', '+91 98765 00008', '17, Test Street', null, 'Coimbatore', 'Tamil Nadu', '641002', 'Corporate enquiry contact', 'manual', false),
('dededede-000b-4000-8000-000000000009', 'Divya Menon', 'divya.menon@example.com', '+91 98765 00009', '18, Test Street', null, 'Bengaluru', 'Karnataka', '560038', 'Prefers WhatsApp', 'website', true),
('dededede-000b-4000-8000-000000000010', 'Sanjay Gupta', 'sanjay.g@example.com', '+91 98765 00010', '19, Test Street', 'Near the dummy park', 'New Delhi', 'Delhi', '110017', 'Left-handed, needs a left oblique holder', 'import', false),
('dededede-000b-4000-8000-000000000011', 'Lakshmi Venkat', 'lakshmi.v@example.com', '+91 98765 00011', '20, Test Street', null, 'Chennai', 'Tamil Nadu', '600041', null, 'website', true),
('dededede-000b-4000-8000-000000000012', 'Neha Joshi', 'neha.joshi@example.com', '+91 98765 00012', '21, Test Street', null, 'Pune', 'Maharashtra', '411004', 'Corporate enquiry contact', 'manual', false),
('dededede-000b-4000-8000-000000000013', 'Rahul Das', 'rahul.das@example.com', '+91 98765 00013', '22, Test Street', 'Near the dummy park', 'Kolkata', 'West Bengal', '700019', 'Prefers WhatsApp', 'wix', true),
('dededede-000b-4000-8000-000000000014', 'Sneha Pillai', 'sneha.p@example.com', '+91 98765 00014', '23, Test Street', null, 'Chennai', 'Tamil Nadu', '600020', 'Left-handed, needs a left oblique holder', 'website', false),
('dededede-000b-4000-8000-000000000015', 'Ganesh Phone Only', null, '+91 98765 00015', null, null, 'Madurai', 'Tamil Nadu', '625001', 'No email: only a phone number', 'manual', false),
('dededede-000b-4000-8000-000000000016', 'Anita R (duplicate)', 'anita.r.other@example.com', '98765 00001', null, null, 'Chennai', 'Tamil Nadu', null, 'Same phone as Anita Rao: try Merge', 'import', false);

-- workshop bookings: paid online and by hand, unpaid, cancelled, refunded, transferred, several seats; "Watercolour Florals" is sold out

insert into bookings (id, workshop_id, name, email, phone, seats, amount_paise, gst_paise, status, channel, payment_method, razorpay_order_id, razorpay_payment_id, invoice_no, notes, created_at, paid_at) values
('dededede-0007-4000-8000-000000000001', 'dededede-0001-4000-8000-000000000001', 'Anita Rao', 'anita.rao@example.com', '+91 98765 00001', 1, 150000, 0, 'paid', 'website', 'razorpay', 'order_demo_bk001', 'pay_demo_bk001', 9001, null, ((current_date + -3) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -3) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000002', 'dededede-0001-4000-8000-000000000001', 'Vikram Iyer', 'vikram.iyer@example.com', '+91 98765 00002', 2, 300000, 0, 'paid', 'website', 'razorpay', 'order_demo_bk002', 'pay_demo_bk002', 9002, 'Coming with a friend', ((current_date + -2) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -2) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000003', 'dededede-0001-4000-8000-000000000001', 'Meera Krishnan', 'meera.k@example.com', '+91 98765 00003', 1, 150000, 0, 'pending', 'website', null, 'order_demo_bk003', null, 9003, null, ((current_date + -1) + time '12:00') at time zone 'Asia/Kolkata', null),
('dededede-0007-4000-8000-000000000004', 'dededede-0001-4000-8000-000000000001', 'Rohan Mehta', 'rohan.mehta@example.com', '+91 98765 00004', 1, 150000, 0, 'cancelled', 'manual', null, null, null, 9004, null, ((current_date + -5) + time '12:00') at time zone 'Asia/Kolkata', null),
('dededede-0007-4000-8000-000000000005', 'dededede-0001-4000-8000-000000000002', 'Fatima Sheikh', 'fatima.s@example.com', '+91 98765 00005', 2, 500000, 76271, 'paid', 'website', 'razorpay', 'order_demo_bk005', 'pay_demo_bk005', 9005, 'Coming with a friend', ((current_date + -9) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -9) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000006', 'dededede-0001-4000-8000-000000000002', 'Arjun Nair', 'arjun.nair@example.com', '+91 98765 00006', 2, 500000, 76271, 'paid', 'manual', 'upi', null, null, 9006, 'Coming with a friend', ((current_date + -8) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -8) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000007', 'dededede-0001-4000-8000-000000000002', 'Priya Sundaram', 'priya.s@example.com', '+91 98765 00007', 2, 500000, 76271, 'paid', 'manual', 'cash', null, null, 9007, 'Coming with a friend', ((current_date + -7) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -7) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000008', 'dededede-0001-4000-8000-000000000003', 'Karthik Raman', 'karthik.r@example.com', '+91 98765 00008', 1, 1416000, 216000, 'paid', 'website', 'razorpay', 'order_demo_bk008', 'pay_demo_bk008', 9008, null, ((current_date + -4) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -4) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000009', 'dededede-0001-4000-8000-000000000003', 'Divya Menon', 'divya.menon@example.com', '+91 98765 00009', 1, 1416000, 216000, 'refunded', 'website', 'razorpay', 'order_demo_bk009', 'pay_demo_bk009', 9009, null, ((current_date + -12) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -12) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000010', 'dededede-0001-4000-8000-000000000004', 'Sanjay Gupta', 'sanjay.g@example.com', '+91 98765 00010', 3, 660000, 0, 'paid', 'website', 'razorpay', 'order_demo_bk010', 'pay_demo_bk010', 9010, 'Coming with a friend', ((current_date + -30) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -30) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000011', 'dededede-0001-4000-8000-000000000004', 'Lakshmi Venkat', 'lakshmi.v@example.com', '+91 98765 00011', 1, 220000, 0, 'transferred', 'manual', 'bank', null, null, 9011, null, ((current_date + -28) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -28) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000012', 'dededede-0001-4000-8000-000000000005', 'Neha Joshi', 'neha.joshi@example.com', '+91 98765 00012', 2, 600000, 0, 'paid', 'website', 'razorpay', 'order_demo_bk012', 'pay_demo_bk012', 9012, 'Coming with a friend', ((current_date + -1) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -1) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000013', 'dededede-0001-4000-8000-000000000008', 'Rahul Das', 'rahul.das@example.com', '+91 98765 00013', 1, 0, 0, 'paid', 'manual', 'other', null, null, 9013, null, ((current_date + -2) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -2) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000014', 'dededede-0001-4000-8000-000000000009', 'Sneha Pillai', 'sneha.p@example.com', '+91 98765 00014', 1, 230000, 35085, 'paid', 'manual', 'card', null, null, 9014, null, ((current_date + -70) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -70) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000015', 'dededede-0001-4000-8000-000000000011', 'Anita Rao', 'anita.rao@example.com', '+91 98765 00001', 3, 720000, 0, 'paid', 'website', 'razorpay', 'order_demo_bk015', 'pay_demo_bk015', 9015, 'Coming with a friend', ((current_date + -6) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -6) + time '12:05') at time zone 'Asia/Kolkata'),
('dededede-0007-4000-8000-000000000016', 'dededede-0001-4000-8000-000000000010', 'Meera Krishnan', 'meera.k@example.com', '+91 98765 00003', 1, 330400, 50400, 'pending', 'manual', null, null, null, 9016, null, ((current_date + -1) + time '12:00') at time zone 'Asia/Kolkata', null);

-- waitlist for the sold-out and the almost-full workshops; some already told about a free seat

insert into workshop_waitlist (id, workshop_id, name, email, phone, seats, notified_at, created_at) values
('dededede-0008-4000-8000-000000000001', 'dededede-0001-4000-8000-000000000002', 'Karthik Raman', 'karthik.r@example.com', null, 1, ((current_date + -1) + time '09:00') at time zone 'Asia/Kolkata', ((current_date + -6) + time '15:00') at time zone 'Asia/Kolkata'),
('dededede-0008-4000-8000-000000000002', 'dededede-0001-4000-8000-000000000002', 'Divya Menon', 'divya.menon@example.com', '+91 98765 00009', 2, ((current_date + -1) + time '09:00') at time zone 'Asia/Kolkata', ((current_date + -5) + time '15:00') at time zone 'Asia/Kolkata'),
('dededede-0008-4000-8000-000000000003', 'dededede-0001-4000-8000-000000000002', 'Sanjay Gupta', 'sanjay.g@example.com', '+91 98765 00010', 1, null, ((current_date + -4) + time '15:00') at time zone 'Asia/Kolkata'),
('dededede-0008-4000-8000-000000000004', 'dededede-0001-4000-8000-000000000002', 'Lakshmi Venkat', 'lakshmi.v@example.com', null, 3, null, ((current_date + -3) + time '15:00') at time zone 'Asia/Kolkata'),
('dededede-0008-4000-8000-000000000005', 'dededede-0001-4000-8000-000000000002', 'Neha Joshi', 'neha.joshi@example.com', '+91 98765 00012', 1, null, ((current_date + -2) + time '15:00') at time zone 'Asia/Kolkata'),
('dededede-0008-4000-8000-000000000006', 'dededede-0001-4000-8000-000000000002', 'Rahul Das', 'rahul.das@example.com', '+91 98765 00013', 1, null, ((current_date + -6) + time '15:00') at time zone 'Asia/Kolkata'),
('dededede-0008-4000-8000-000000000007', 'dededede-0001-4000-8000-000000000002', 'Sneha Pillai', 'sneha.p@example.com', null, 2, null, ((current_date + -5) + time '15:00') at time zone 'Asia/Kolkata'),
('dededede-0008-4000-8000-000000000008', 'dededede-0001-4000-8000-000000000011', 'Vikram Iyer', 'vikram.iyer@example.com', '+91 98765 00002', 1, ((current_date + -1) + time '09:00') at time zone 'Asia/Kolkata', ((current_date + -4) + time '15:00') at time zone 'Asia/Kolkata'),
('dededede-0008-4000-8000-000000000009', 'dededede-0001-4000-8000-000000000011', 'Rohan Mehta', 'rohan.mehta@example.com', '+91 98765 00004', 1, null, ((current_date + -3) + time '15:00') at time zone 'Asia/Kolkata'),
('dededede-0008-4000-8000-000000000010', 'dededede-0001-4000-8000-000000000011', 'Arjun Nair', 'arjun.nair@example.com', null, 2, null, ((current_date + -2) + time '15:00') at time zone 'Asia/Kolkata');

-- class enrolments: children 5 to 15 and adults; paid, unpaid, refunded, cancelled, transferred

insert into class_enrolments (id, class_id, student_name, student_group, student_age, name, email, phone, amount_paise, gst_paise, status, channel, payment_method, razorpay_order_id, razorpay_payment_id, invoice_no, notes, created_at, paid_at) values
('dededede-0006-4000-8000-000000000001', 'dededede-0003-4000-8000-000000000001', 'Aadhya', 'child', 7, 'Anita Rao', 'anita.rao@example.com', '+91 98765 00001', 500000, 0, 'paid', 'website', 'razorpay', 'order_demo_en001', 'pay_demo_en001', 9101, null, ((current_date + -25) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -25) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000002', 'dededede-0003-4000-8000-000000000001', 'Ishaan', 'child', 9, 'Vikram Iyer', 'vikram.iyer@example.com', '+91 98765 00002', 500000, 0, 'paid', 'manual', 'cash', null, null, 9102, null, ((current_date + -24) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -24) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000003', 'dededede-0003-4000-8000-000000000001', 'Kavya', 'child', 6, 'Meera Krishnan', 'meera.k@example.com', '+91 98765 00003', 500000, 0, 'paid', 'website', 'razorpay', 'order_demo_en003', 'pay_demo_en003', 9103, null, ((current_date + -23) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -23) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000004', 'dededede-0003-4000-8000-000000000001', 'Rohan Mehta', 'adult', null, 'Rohan Mehta', 'rohan.mehta@example.com', '+91 98765 00004', 500000, 0, 'paid', 'manual', 'upi', null, null, 9104, 'Needs a left-handed holder', ((current_date + -22) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -22) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000005', 'dededede-0003-4000-8000-000000000001', 'Vihaan', 'child', 11, 'Fatima Sheikh', 'fatima.s@example.com', '+91 98765 00005', 500000, 0, 'pending', 'website', null, 'order_demo_en005', null, 9105, null, ((current_date + -21) + time '18:00') at time zone 'Asia/Kolkata', null),
('dededede-0006-4000-8000-000000000006', 'dededede-0003-4000-8000-000000000002', 'Diya', 'child', 12, 'Arjun Nair', 'arjun.nair@example.com', '+91 98765 00006', 550000, 0, 'paid', 'website', 'razorpay', 'order_demo_en006', 'pay_demo_en006', 9106, null, ((current_date + -20) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -20) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000007', 'dededede-0003-4000-8000-000000000003', 'Priya Sundaram', 'adult', null, 'Priya Sundaram', 'priya.s@example.com', '+91 98765 00007', 650000, 99153, 'paid', 'website', 'razorpay', 'order_demo_en007', 'pay_demo_en007', 9107, null, ((current_date + -19) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -19) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000008', 'dededede-0003-4000-8000-000000000003', 'Karthik Raman', 'adult', null, 'Karthik Raman', 'karthik.r@example.com', '+91 98765 00008', 650000, 99153, 'paid', 'manual', 'cash', null, null, 9108, null, ((current_date + -18) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -18) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000009', 'dededede-0003-4000-8000-000000000005', 'Divya Menon', 'adult', null, 'Divya Menon', 'divya.menon@example.com', '+91 98765 00009', 1062000, 162000, 'paid', 'website', 'razorpay', 'order_demo_en009', 'pay_demo_en009', 9109, null, ((current_date + -17) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -17) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000010', 'dededede-0003-4000-8000-000000000005', 'Sanjay Gupta', 'adult', null, 'Sanjay Gupta', 'sanjay.g@example.com', '+91 98765 00010', 1062000, 162000, 'refunded', 'website', 'razorpay', 'order_demo_en010', 'pay_demo_en010', 9110, null, ((current_date + -16) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -16) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000011', 'dededede-0003-4000-8000-000000000006', 'Advik', 'child', 15, 'Lakshmi Venkat', 'lakshmi.v@example.com', '+91 98765 00011', 600000, 0, 'paid', 'manual', 'cash', null, null, 9111, null, ((current_date + -15) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -15) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000012', 'dededede-0003-4000-8000-000000000007', 'Myra', 'child', 5, 'Neha Joshi', 'neha.joshi@example.com', '+91 98765 00012', 400000, 0, 'paid', 'website', 'razorpay', 'order_demo_en012', 'pay_demo_en012', 9112, null, ((current_date + -14) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -14) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000013', 'dededede-0003-4000-8000-000000000007', 'Reyansh', 'child', 8, 'Rahul Das', 'rahul.das@example.com', '+91 98765 00013', 400000, 0, 'cancelled', 'manual', null, null, null, 9113, null, ((current_date + -13) + time '18:00') at time zone 'Asia/Kolkata', null),
('dededede-0006-4000-8000-000000000014', 'dededede-0003-4000-8000-000000000008', 'Sneha Pillai', 'adult', null, 'Sneha Pillai', 'sneha.p@example.com', '+91 98765 00014', 800000, 122034, 'pending', 'manual', null, null, null, 9114, null, ((current_date + -12) + time '18:00') at time zone 'Asia/Kolkata', null),
('dededede-0006-4000-8000-000000000015', 'dededede-0003-4000-8000-000000000010', 'Anita Rao', 'adult', null, 'Anita Rao', 'anita.rao@example.com', '+91 98765 00001', 531000, 81000, 'paid', 'manual', 'bank', null, null, 9115, null, ((current_date + -11) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -11) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000016', 'dededede-0003-4000-8000-000000000001', 'Saanvi', 'child', 10, 'Meera Krishnan', 'meera.k@example.com', '+91 98765 00003', 500000, 0, 'transferred', 'website', 'razorpay', 'order_demo_en016', 'pay_demo_en016', 9116, null, ((current_date + -10) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -10) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000017', 'dededede-0003-4000-8000-000000000003', 'Fatima Sheikh', 'adult', null, 'Fatima Sheikh', 'fatima.s@example.com', '+91 98765 00005', 650000, 99153, 'paid', 'manual', 'cash', null, null, 9117, null, ((current_date + -9) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -9) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000018', 'dededede-0003-4000-8000-000000000005', 'Priya Sundaram', 'adult', null, 'Priya Sundaram', 'priya.s@example.com', '+91 98765 00007', 1062000, 162000, 'paid', 'website', 'razorpay', 'order_demo_en018', 'pay_demo_en018', 9118, null, ((current_date + -8) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -8) + time '18:10') at time zone 'Asia/Kolkata'),
('dededede-0006-4000-8000-000000000019', 'dededede-0003-4000-8000-000000000001', 'Anika', 'child', 8, 'Sanjay Gupta', 'sanjay.g@example.com', '+91 98765 00010', 500000, 0, 'paid', 'manual', 'upi', null, null, 9119, null, ((current_date + -7) + time '18:00') at time zone 'Asia/Kolkata', ((current_date + -7) + time '18:10') at time zone 'Asia/Kolkata');

-- classes: every paid student has their own dates and times (attended in the past, scheduled ahead)

insert into class_sessions (id, enrolment_id, no, on_date, time_text, status) values
('dededede-0005-4000-8000-000000000001', 'dededede-0006-4000-8000-000000000001', 1, (current_date + -30), '4:30 pm', 'done'),
('dededede-0005-4000-8000-000000000002', 'dededede-0006-4000-8000-000000000001', 2, (current_date + -23), '4:30 pm', 'done'),
('dededede-0005-4000-8000-000000000003', 'dededede-0006-4000-8000-000000000001', 3, (current_date + -16), '4:30 pm', 'done'),
('dededede-0005-4000-8000-000000000004', 'dededede-0006-4000-8000-000000000001', 4, (current_date + -9), '4:30 pm', 'done'),
('dededede-0005-4000-8000-000000000005', 'dededede-0006-4000-8000-000000000001', 5, (current_date + -2), '4:30 pm', 'done'),
('dededede-0005-4000-8000-000000000006', 'dededede-0006-4000-8000-000000000001', 6, (current_date + 5), '4:30 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000007', 'dededede-0006-4000-8000-000000000001', 7, (current_date + 12), '4:30 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000008', 'dededede-0006-4000-8000-000000000001', 8, (current_date + 19), '4:30 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000009', 'dededede-0006-4000-8000-000000000002', 1, (current_date + -25), '5 pm', 'done'),
('dededede-0005-4000-8000-000000000010', 'dededede-0006-4000-8000-000000000002', 2, (current_date + -12), '5 pm', 'done'),
('dededede-0005-4000-8000-000000000011', 'dededede-0006-4000-8000-000000000002', 3, (current_date + 1), '5 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000012', 'dededede-0006-4000-8000-000000000002', 4, (current_date + 8), '5 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000013', 'dededede-0006-4000-8000-000000000002', 5, (current_date + 20), '5 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000014', 'dededede-0006-4000-8000-000000000003', 1, (current_date + -14), '11 am', 'done'),
('dededede-0005-4000-8000-000000000015', 'dededede-0006-4000-8000-000000000003', 2, (current_date + -7), '11 am', 'done'),
('dededede-0005-4000-8000-000000000016', 'dededede-0006-4000-8000-000000000003', 3, (current_date + 0), '11 am', 'scheduled'),
('dededede-0005-4000-8000-000000000017', 'dededede-0006-4000-8000-000000000003', 4, (current_date + 7), '11 am', 'scheduled'),
('dededede-0005-4000-8000-000000000018', 'dededede-0006-4000-8000-000000000004', 1, (current_date + -6), '7 pm', 'done'),
('dededede-0005-4000-8000-000000000019', 'dededede-0006-4000-8000-000000000004', 2, (current_date + 3), '7 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000020', 'dededede-0006-4000-8000-000000000004', 3, (current_date + 10), '7 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000021', 'dededede-0006-4000-8000-000000000006', 1, (current_date + -18), '6 pm', 'done'),
('dededede-0005-4000-8000-000000000022', 'dededede-0006-4000-8000-000000000006', 2, (current_date + -11), '6 pm', 'done'),
('dededede-0005-4000-8000-000000000023', 'dededede-0006-4000-8000-000000000006', 3, (current_date + -4), '6 pm', 'done'),
('dededede-0005-4000-8000-000000000024', 'dededede-0006-4000-8000-000000000006', 4, (current_date + 4), '6 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000025', 'dededede-0006-4000-8000-000000000006', 5, (current_date + 11), '6 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000026', 'dededede-0006-4000-8000-000000000006', 6, (current_date + 18), '6 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000027', 'dededede-0006-4000-8000-000000000007', 1, (current_date + -10), '10 am', 'done'),
('dededede-0005-4000-8000-000000000028', 'dededede-0006-4000-8000-000000000007', 2, (current_date + -3), '10 am', 'done'),
('dededede-0005-4000-8000-000000000029', 'dededede-0006-4000-8000-000000000007', 3, (current_date + 2), '10 am', 'scheduled'),
('dededede-0005-4000-8000-000000000030', 'dededede-0006-4000-8000-000000000008', 1, (current_date + -8), '3 pm', 'done'),
('dededede-0005-4000-8000-000000000031', 'dededede-0006-4000-8000-000000000008', 2, (current_date + 6), '3 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000032', 'dededede-0006-4000-8000-000000000008', 3, (current_date + 13), '3 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000033', 'dededede-0006-4000-8000-000000000009', 1, (current_date + -1), '12 pm', 'done'),
('dededede-0005-4000-8000-000000000034', 'dededede-0006-4000-8000-000000000009', 2, (current_date + 9), '12 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000035', 'dededede-0006-4000-8000-000000000011', 1, (current_date + -15), '4 pm', 'done'),
('dededede-0005-4000-8000-000000000036', 'dededede-0006-4000-8000-000000000011', 2, (current_date + -8), '4 pm', 'done'),
('dededede-0005-4000-8000-000000000037', 'dededede-0006-4000-8000-000000000011', 3, (current_date + -1), '4 pm', 'done'),
('dededede-0005-4000-8000-000000000038', 'dededede-0006-4000-8000-000000000011', 4, (current_date + 6), '4 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000039', 'dededede-0006-4000-8000-000000000011', 5, (current_date + 13), '4 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000040', 'dededede-0006-4000-8000-000000000012', 1, (current_date + -5), '5:30 pm', 'done'),
('dededede-0005-4000-8000-000000000041', 'dededede-0006-4000-8000-000000000012', 2, (current_date + 1), '5:30 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000042', 'dededede-0006-4000-8000-000000000012', 3, (current_date + 14), '5:30 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000043', 'dededede-0006-4000-8000-000000000017', 1, (current_date + -20), '11 am', 'done'),
('dededede-0005-4000-8000-000000000044', 'dededede-0006-4000-8000-000000000017', 2, (current_date + -13), '11 am', 'done'),
('dededede-0005-4000-8000-000000000045', 'dededede-0006-4000-8000-000000000017', 3, (current_date + -6), '4 pm', 'done'),
('dededede-0005-4000-8000-000000000046', 'dededede-0006-4000-8000-000000000017', 4, (current_date + 2), '11 am', 'scheduled'),
('dededede-0005-4000-8000-000000000047', 'dededede-0006-4000-8000-000000000017', 5, (current_date + 9), '11 am', 'scheduled'),
('dededede-0005-4000-8000-000000000048', 'dededede-0006-4000-8000-000000000017', 6, (current_date + 16), '5:30 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000049', 'dededede-0006-4000-8000-000000000018', 1, (current_date + -9), '7 pm', 'done'),
('dededede-0005-4000-8000-000000000050', 'dededede-0006-4000-8000-000000000018', 2, (current_date + -2), '7 pm', 'done'),
('dededede-0005-4000-8000-000000000051', 'dededede-0006-4000-8000-000000000018', 3, (current_date + 0), '6 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000052', 'dededede-0006-4000-8000-000000000018', 4, (current_date + 5), '7 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000053', 'dededede-0006-4000-8000-000000000019', 1, (current_date + -3), '4:30 pm', 'done'),
('dededede-0005-4000-8000-000000000054', 'dededede-0006-4000-8000-000000000019', 2, (current_date + 4), '4:30 pm', 'scheduled'),
('dededede-0005-4000-8000-000000000055', 'dededede-0006-4000-8000-000000000019', 3, (current_date + 11), '10 am', 'scheduled');

-- one class cancelled and one moved to another day, to see how they look
update class_sessions set status = 'cancelled', note = 'Teacher unwell (dummy)' where enrolment_id = 'dededede-0006-4000-8000-000000000001' and no = 6;
update class_sessions set moved_from = on_date, on_date = on_date + 1, note = 'Moved for a holiday (dummy)' where enrolment_id = 'dededede-0006-4000-8000-000000000006' and no = 4;

-- orders: every status (to pack, packed, shipped, delivered, unpaid, cancelled, refunded), online and by hand, gift messages, tracking, private notes, free and paid shipping

insert into orders (id, name, email, phone, shipping_address, subtotal_paise, shipping_paise, total_paise, gift_message, status, tracking_carrier, tracking_number, razorpay_order_id, razorpay_payment_id, invoice_no, channel, payment_method, notes, created_at, paid_at) values
('dededede-0009-4000-8000-000000000001', 'Anita Rao', 'anita.rao@example.com', '+91 98765 00001', '{"recipient": "Anita Rao", "phone": "+91 98765 00001", "line1": "10, Test Street", "line2": "", "city": "Chennai", "state": "Tamil Nadu", "pincode": "600024"}'::jsonb, 130000, 6000, 136000, 'Happy birthday, Meera!', 'paid', null, null, 'order_demo_or001', 'pay_demo_or001', 9201, 'website', 'razorpay', null, ((current_date + -40) + time '20:00') at time zone 'Asia/Kolkata', ((current_date + -40) + time '20:03') at time zone 'Asia/Kolkata'),
('dededede-0009-4000-8000-000000000002', 'Vikram Iyer', 'vikram.iyer@example.com', '+91 98765 00002', '{"recipient": "Vikram Iyer", "phone": "+91 98765 00002", "line1": "11, Test Street", "line2": "", "city": "Chennai", "state": "Tamil Nadu", "pincode": "600017"}'::jsonb, 160000, 6000, 166000, null, 'packed', null, null, 'order_demo_or002', 'pay_demo_or002', 9202, 'website', 'razorpay', 'Pack with bubble wrap', ((current_date + -38) + time '20:00') at time zone 'Asia/Kolkata', ((current_date + -38) + time '20:03') at time zone 'Asia/Kolkata'),
('dededede-0009-4000-8000-000000000003', 'Meera Krishnan', 'meera.k@example.com', '+91 98765 00003', '{"recipient": "Meera Krishnan", "phone": "+91 98765 00003", "line1": "12, Test Street", "line2": "", "city": "Bengaluru", "state": "Karnataka", "pincode": "560034"}'::jsonb, 377600, 0, 377600, null, 'shipped', 'India Post', 'EM123456789IN', 'order_demo_or003', 'pay_demo_or003', 9203, 'website', 'razorpay', null, ((current_date + -36) + time '20:00') at time zone 'Asia/Kolkata', ((current_date + -36) + time '20:03') at time zone 'Asia/Kolkata'),
('dededede-0009-4000-8000-000000000004', 'Rohan Mehta', 'rohan.mehta@example.com', '+91 98765 00004', '{"recipient": "Rohan Mehta", "phone": "+91 98765 00004", "line1": "13, Test Street", "line2": "", "city": "Mumbai", "state": "Maharashtra", "pincode": "400050"}'::jsonb, 252000, 0, 252000, null, 'delivered', 'Blue Dart', '90876543210', 'order_demo_or004', 'pay_demo_or004', 9204, 'website', 'razorpay', null, ((current_date + -34) + time '20:00') at time zone 'Asia/Kolkata', ((current_date + -34) + time '20:03') at time zone 'Asia/Kolkata'),
('dededede-0009-4000-8000-000000000005', 'Fatima Sheikh', 'fatima.s@example.com', '+91 98765 00005', '{"recipient": "Fatima Sheikh", "phone": "+91 98765 00005", "line1": "14, Test Street", "line2": "", "city": "Hyderabad", "state": "Telangana", "pincode": "500034"}'::jsonb, 60000, 6000, 66000, null, 'pending', null, null, 'order_demo_or005', null, 9205, 'website', null, null, ((current_date + -32) + time '20:00') at time zone 'Asia/Kolkata', null),
('dededede-0009-4000-8000-000000000006', 'Arjun Nair', 'arjun.nair@example.com', '+91 98765 00006', '{"recipient": "Arjun Nair", "phone": "+91 98765 00006", "line1": "15, Test Street", "line2": "", "city": "Kochi", "state": "Kerala", "pincode": "682020"}'::jsonb, 65000, 6000, 71000, null, 'cancelled', null, null, 'order_demo_or006', null, 9206, 'website', null, 'Customer changed mind', ((current_date + -30) + time '20:00') at time zone 'Asia/Kolkata', null),
('dededede-0009-4000-8000-000000000007', 'Priya Sundaram', 'priya.s@example.com', '+91 98765 00007', '{"recipient": "Priya Sundaram", "phone": "+91 98765 00007", "line1": "16, Test Street", "line2": "", "city": "Chennai", "state": "Tamil Nadu", "pincode": "600028"}'::jsonb, 55000, 6000, 61000, null, 'refunded', null, null, 'order_demo_or007', 'pay_demo_or007', 9207, 'website', 'razorpay', 'Arrived damaged: refunded', ((current_date + -28) + time '20:00') at time zone 'Asia/Kolkata', ((current_date + -28) + time '20:03') at time zone 'Asia/Kolkata'),
('dededede-0009-4000-8000-000000000008', 'Karthik Raman', 'karthik.r@example.com', '+91 98765 00008', '{"recipient": "Karthik Raman", "phone": "+91 98765 00008", "line1": "17, Test Street", "line2": "", "city": "Coimbatore", "state": "Tamil Nadu", "pincode": "641002"}'::jsonb, 247800, 0, 247800, null, 'paid', null, null, null, null, 9208, 'manual', 'cash', 'Pre-order: engrave "KR"', ((current_date + -26) + time '20:00') at time zone 'Asia/Kolkata', ((current_date + -26) + time '20:03') at time zone 'Asia/Kolkata'),
('dededede-0009-4000-8000-000000000009', 'Divya Menon', 'divya.menon@example.com', '+91 98765 00009', '{"recipient": "Divya Menon", "phone": "+91 98765 00009", "line1": "18, Test Street", "line2": "", "city": "Bengaluru", "state": "Karnataka", "pincode": "560038"}'::jsonb, 370000, 0, 370000, 'With love', 'delivered', 'DTDC', 'D12345678', null, null, 9209, 'manual', 'upi', null, ((current_date + -24) + time '20:00') at time zone 'Asia/Kolkata', ((current_date + -24) + time '20:03') at time zone 'Asia/Kolkata'),
('dededede-0009-4000-8000-000000000010', 'Sanjay Gupta', 'sanjay.g@example.com', '+91 98765 00010', '{"recipient": "Sanjay Gupta", "phone": "+91 98765 00010", "line1": "19, Test Street", "line2": "", "city": "New Delhi", "state": "Delhi", "pincode": "110017"}'::jsonb, 175000, 6000, 181000, null, 'pending', null, null, null, null, 9210, 'manual', null, 'Will pay at the studio', ((current_date + -22) + time '20:00') at time zone 'Asia/Kolkata', null),
('dededede-0009-4000-8000-000000000011', 'Lakshmi Venkat', 'lakshmi.v@example.com', '+91 98765 00011', '{"recipient": "Lakshmi Venkat", "phone": "+91 98765 00011", "line1": "20, Test Street", "line2": "", "city": "Chennai", "state": "Tamil Nadu", "pincode": "600041"}'::jsonb, 110000, 6000, 116000, null, 'shipped', 'Delhivery', '1234567890123', 'order_demo_or011', 'pay_demo_or011', 9211, 'website', 'razorpay', null, ((current_date + -20) + time '20:00') at time zone 'Asia/Kolkata', ((current_date + -20) + time '20:03') at time zone 'Asia/Kolkata'),
('dededede-0009-4000-8000-000000000012', 'Neha Joshi', 'neha.joshi@example.com', '+91 98765 00012', '{"recipient": "Neha Joshi", "phone": "+91 98765 00012", "line1": "21, Test Street", "line2": "", "city": "Pune", "state": "Maharashtra", "pincode": "411004"}'::jsonb, 250000, 0, 250000, null, 'paid', null, null, 'order_demo_or012', 'pay_demo_or012', 9212, 'website', 'razorpay', null, ((current_date + -18) + time '20:00') at time zone 'Asia/Kolkata', ((current_date + -18) + time '20:03') at time zone 'Asia/Kolkata'),
('dededede-0009-4000-8000-000000000013', 'Rahul Das', 'rahul.das@example.com', '+91 98765 00013', '{"recipient": "Rahul Das", "phone": "+91 98765 00013", "line1": "22, Test Street", "line2": "", "city": "Kolkata", "state": "West Bengal", "pincode": "700019"}'::jsonb, 755200, 0, 755200, 'Congratulations on your new home', 'delivered', 'India Post', 'EM987654321IN', null, null, 9213, 'manual', 'upi', 'Bulk gift order', ((current_date + -16) + time '20:00') at time zone 'Asia/Kolkata', ((current_date + -16) + time '20:03') at time zone 'Asia/Kolkata'),
('dededede-0009-4000-8000-000000000014', 'Sneha Pillai', 'sneha.p@example.com', '+91 98765 00014', '{"recipient": "Sneha Pillai", "phone": "+91 98765 00014", "line1": "23, Test Street", "line2": "", "city": "Chennai", "state": "Tamil Nadu", "pincode": "600020"}'::jsonb, 354000, 6000, 360000, null, 'packed', null, null, 'order_demo_or014', 'pay_demo_or014', 9214, 'website', 'razorpay', null, ((current_date + -14) + time '20:00') at time zone 'Asia/Kolkata', ((current_date + -14) + time '20:03') at time zone 'Asia/Kolkata'),
('dededede-0009-4000-8000-000000000015', 'Anita Rao', 'anita.rao@example.com', '+91 98765 00001', '{"recipient": "Anita Rao", "phone": "+91 98765 00001", "line1": "10, Test Street", "line2": "", "city": "Chennai", "state": "Tamil Nadu", "pincode": "600024"}'::jsonb, 270000, 6000, 276000, null, 'paid', null, null, 'order_demo_or015', 'pay_demo_or015', 9215, 'website', 'razorpay', null, ((current_date + -12) + time '20:00') at time zone 'Asia/Kolkata', ((current_date + -12) + time '20:03') at time zone 'Asia/Kolkata');

insert into order_items (id, order_id, product_id, title, unit_paise, qty, gst_paise, stock_taken) values
('dededede-000a-4000-8000-000000000001', 'dededede-0009-4000-8000-000000000001', 'dededede-0002-4000-8000-000000000001', 'Demo: A5 Sketchbook', 65000, 2, 0, 2),
('dededede-000a-4000-8000-000000000002', 'dededede-0009-4000-8000-000000000002', 'dededede-0002-4000-8000-000000000002', 'Demo: Calligraphy Nib Set of 5', 90000, 1, 13729, 1),
('dededede-000a-4000-8000-000000000003', 'dededede-0009-4000-8000-000000000002', 'dededede-0002-4000-8000-000000000005', 'Demo: Practice Pad 100 Sheets', 35000, 2, 0, 2),
('dededede-000a-4000-8000-000000000004', 'dededede-0009-4000-8000-000000000003', 'dededede-0002-4000-8000-000000000006', 'Demo: Lettering Gift Box', 320000, 1, 57600, 1),
('dededede-000a-4000-8000-000000000005', 'dededede-0009-4000-8000-000000000004', 'dededede-0002-4000-8000-000000000009', 'Demo: Watercolour Tin of 12', 150000, 1, 27000, 1),
('dededede-000a-4000-8000-000000000006', 'dededede-0009-4000-8000-000000000004', 'dededede-0002-4000-8000-000000000010', 'Demo: Handmade Paper Sampler', 25000, 3, 0, 3),
('dededede-000a-4000-8000-000000000007', 'dededede-0009-4000-8000-000000000005', 'dededede-0002-4000-8000-000000000011', 'Demo: Gold Pearl Ink', 60000, 1, 0, null),
('dededede-000a-4000-8000-000000000008', 'dededede-0009-4000-8000-000000000006', 'dededede-0002-4000-8000-000000000001', 'Demo: A5 Sketchbook', 65000, 1, 0, null),
('dededede-000a-4000-8000-000000000009', 'dededede-0009-4000-8000-000000000007', 'dededede-0002-4000-8000-000000000007', 'Demo: Brush Pen Trio', 55000, 1, 8390, null),
('dededede-000a-4000-8000-000000000010', 'dededede-0009-4000-8000-000000000008', 'dededede-0002-4000-8000-000000000004', 'Demo: Custom Engraved Holder (pre-order)', 210000, 1, 37800, 1),
('dededede-000a-4000-8000-000000000011', 'dededede-0009-4000-8000-000000000009', 'dededede-0002-4000-8000-000000000012', 'Demo: A4 LED Lightbox', 280000, 1, 42712, 1),
('dededede-000a-4000-8000-000000000012', 'dededede-0009-4000-8000-000000000009', 'dededede-0002-4000-8000-000000000002', 'Demo: Calligraphy Nib Set of 5', 90000, 1, 13729, 1),
('dededede-000a-4000-8000-000000000013', 'dededede-0009-4000-8000-000000000010', 'dededede-0002-4000-8000-000000000005', 'Demo: Practice Pad 100 Sheets', 35000, 5, 0, null),
('dededede-000a-4000-8000-000000000014', 'dededede-0009-4000-8000-000000000011', 'dededede-0002-4000-8000-000000000001', 'Demo: A5 Sketchbook', 65000, 1, 0, 1),
('dededede-000a-4000-8000-000000000015', 'dededede-0009-4000-8000-000000000011', 'dededede-0002-4000-8000-000000000003', 'Demo: Sumi Ink 60 ml', 45000, 1, 0, 1),
('dededede-000a-4000-8000-000000000016', 'dededede-0009-4000-8000-000000000012', 'dededede-0002-4000-8000-000000000010', 'Demo: Handmade Paper Sampler', 25000, 10, 0, 10),
('dededede-000a-4000-8000-000000000017', 'dededede-0009-4000-8000-000000000013', 'dededede-0002-4000-8000-000000000006', 'Demo: Lettering Gift Box', 320000, 2, 115200, 2),
('dededede-000a-4000-8000-000000000018', 'dededede-0009-4000-8000-000000000014', 'dededede-0002-4000-8000-000000000009', 'Demo: Watercolour Tin of 12', 150000, 2, 54000, 2),
('dededede-000a-4000-8000-000000000019', 'dededede-0009-4000-8000-000000000015', 'dededede-0002-4000-8000-000000000002', 'Demo: Calligraphy Nib Set of 5', 90000, 3, 41186, 3);

-- inbox: every kind of enquiry: unread, read but not dealt with, and dealt with

insert into enquiries (id, kind, name, email, phone, message, details, handled, read_at, created_at) values
('dededede-000c-4000-8000-000000000001', 'contact', 'Anita Rao', 'anita.rao@example.com', '+91 98765 00001', 'Do you have weekend slots?', '{"topic": "Classes"}'::jsonb, true, ((current_date + 0) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + 0) + time '11:00') at time zone 'Asia/Kolkata'),
('dededede-000c-4000-8000-000000000002', 'invitation', 'Vikram Iyer', 'vikram.iyer@example.com', '+91 98765 00002', 'Wedding invitations for 250 guests, hand lettered names.', '{"event": "Wedding", "quantity": 250, "date": "February"}'::jsonb, false, ((current_date + -2) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -2) + time '11:00') at time zone 'Asia/Kolkata'),
('dededede-000c-4000-8000-000000000003', 'service', 'Meera Krishnan', 'meera.k@example.com', '+91 98765 00003', 'Live calligraphy at our store launch.', '{"service": "Live event", "city": "Chennai"}'::jsonb, false, null, ((current_date + -4) + time '11:00') at time zone 'Asia/Kolkata'),
('dededede-000c-4000-8000-000000000004', 'collaboration', 'Rohan Mehta', 'rohan.mehta@example.com', '+91 98765 00004', 'Brand collaboration for Diwali hampers.', '{"brand": "Demo Sweets Co."}'::jsonb, true, ((current_date + -6) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -6) + time '11:00') at time zone 'Asia/Kolkata'),
('dededede-000c-4000-8000-000000000005', 'hiring', 'Fatima Sheikh', 'fatima.s@example.com', '+91 98765 00005', 'I would love to teach kids art on weekends.', '{"role": "Teacher", "portfolio": "https://example.com/portfolio"}'::jsonb, false, null, ((current_date + -8) + time '11:00') at time zone 'Asia/Kolkata'),
('dededede-000c-4000-8000-000000000006', 'contact', 'Arjun Nair', 'arjun.nair@example.com', '+91 98765 00006', 'Is the nib set compatible with my holder?', '{"topic": "Store"}'::jsonb, false, ((current_date + -10) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -10) + time '11:00') at time zone 'Asia/Kolkata'),
('dededede-000c-4000-8000-000000000007', 'invitation', 'Priya Sundaram', 'priya.s@example.com', '+91 98765 00007', 'Baby shower invitations, pastel colours.', '{"event": "Baby shower", "quantity": 60}'::jsonb, true, ((current_date + -12) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -12) + time '11:00') at time zone 'Asia/Kolkata'),
('dededede-000c-4000-8000-000000000008', 'service', 'Karthik Raman', 'karthik.r@example.com', '+91 98765 00008', 'Corporate workshop for 30 people.', '{"service": "Corporate workshop", "people": 30}'::jsonb, false, null, ((current_date + -14) + time '11:00') at time zone 'Asia/Kolkata'),
('dededede-000c-4000-8000-000000000009', 'contact', 'Divya Menon', 'divya.menon@example.com', '+91 98765 00009', 'Can I pay by bank transfer?', '{"topic": "Payments"}'::jsonb, false, null, ((current_date + -16) + time '11:00') at time zone 'Asia/Kolkata'),
('dededede-000c-4000-8000-000000000010', 'collaboration', 'Sanjay Gupta', 'sanjay.g@example.com', '+91 98765 00010', 'School art week partnership.', '{"organisation": "Demo Public School"}'::jsonb, true, ((current_date + -18) + time '12:00') at time zone 'Asia/Kolkata', ((current_date + -18) + time '11:00') at time zone 'Asia/Kolkata'),
('dededede-000c-4000-8000-000000000011', 'hiring', 'Lakshmi Venkat', 'lakshmi.v@example.com', '+91 98765 00011', 'Internship for the summer?', '{"role": "Intern"}'::jsonb, false, null, ((current_date + -20) + time '11:00') at time zone 'Asia/Kolkata'),
('dededede-000c-4000-8000-000000000012', 'contact', 'Neha Joshi', 'neha.joshi@example.com', '+91 98765 00012', 'Please call me back about the kids camp.', '{"topic": "Workshops"}'::jsonb, false, null, ((current_date + -22) + time '11:00') at time zone 'Asia/Kolkata');

-- calendar events: today, past, upcoming, several days long, with and without a time

insert into events (id, title, note, on_date, end_date, time_text) values
('dededede-000d-4000-8000-000000000001', 'Demo: Meeting with the printer', null, (current_date + 1), null, '3 pm'),
('dededede-000d-4000-8000-000000000002', 'Demo: Stall at the Sunday market', 'Dummy event', (current_date + 6), (current_date + 7), '9 am to 6 pm'),
('dededede-000d-4000-8000-000000000003', 'Demo: Diwali holiday, studio closed', null, (current_date + 18), (current_date + 22), null),
('dededede-000d-4000-8000-000000000004', 'Demo: Photo shoot for new products', 'Dummy event', (current_date + -3), null, '11 am'),
('dededede-000d-4000-8000-000000000005', 'Demo: GST filing due', null, (current_date + 8), null, null),
('dededede-000d-4000-8000-000000000006', 'Demo: Supplier visit', 'Dummy event', (current_date + 12), null, '4:30 pm'),
('dededede-000d-4000-8000-000000000007', 'Demo: School art week', null, (current_date + 25), (current_date + 29), 'Mornings'),
('dededede-000d-4000-8000-000000000008', 'Demo: Instagram live', 'Dummy event', (current_date + 0), null, '7 pm'),
('dededede-000d-4000-8000-000000000009', 'Demo: Pay studio rent', null, (current_date + 19), null, null),
('dededede-000d-4000-8000-000000000010', 'Demo: Craft fair in Bengaluru', 'Dummy event', (current_date + 45), (current_date + 46), 'All day');

-- to-dos: overdue, due today, upcoming, no date, done

insert into todos (id, title, note, due_on, done, done_at) values
('dededede-000e-4000-8000-000000000001', 'Demo: Order more sumi ink', 'Dummy to-do', (current_date + 2), false, null),
('dededede-000e-4000-8000-000000000002', 'Demo: Reply to wedding enquiry', null, (current_date + -1), false, null),
('dededede-000e-4000-8000-000000000003', 'Demo: Post workshop photos', null, (current_date + 0), false, null),
('dededede-000e-4000-8000-000000000004', 'Demo: Renew domain', 'Dummy to-do', (current_date + 30), false, null),
('dededede-000e-4000-8000-000000000005', 'Demo: Call the framer', null, null, false, null),
('dededede-000e-4000-8000-000000000006', 'Demo: Update class timings', null, (current_date + 5), false, null),
('dededede-000e-4000-8000-000000000007', 'Demo: Print certificates', 'Dummy to-do', (current_date + -5), true, ((current_date + -1) + time '18:00') at time zone 'Asia/Kolkata'),
('dededede-000e-4000-8000-000000000008', 'Demo: Pack Rohan order', null, (current_date + -2), true, ((current_date + -1) + time '18:00') at time zone 'Asia/Kolkata'),
('dededede-000e-4000-8000-000000000009', 'Demo: Buy tea for the studio', null, null, true, ((current_date + -1) + time '18:00') at time zone 'Asia/Kolkata'),
('dededede-000e-4000-8000-000000000010', 'Demo: Send invoice to Demo Public School', 'Dummy to-do', (current_date + 3), false, null),
('dededede-000e-4000-8000-000000000011', 'Demo: Book venue in Bengaluru', null, (current_date + 14), false, null),
('dededede-000e-4000-8000-000000000012', 'Demo: Clean brushes', null, (current_date + -10), true, ((current_date + -1) + time '18:00') at time zone 'Asia/Kolkata');

-- invoices: paid, part paid, paid in three parts, overdue, draft, cancelled, with and without GST and discount; quotations (sent, accepted, draft, cancelled)

insert into invoices (id, doc_type, invoice_no, against_no, issue_date, due_date, customer_name, customer_email, customer_phone, customer_address, customer_gstin, items, discount_paise, gst_enabled, gst_rate, subtotal_paise, gst_paise, total_paise, notes, status, paid_on, payment_method, last_reminder_at) values
('dededede-000f-4000-8000-000000000001', 'invoice', 'DEMO/2026-27/001', null, (current_date + -30), (current_date + -15), 'Anita Rao', 'anita.rao@example.com', '+91 98765 00001', '10, Test Street
Chennai - 600024
Tamil Nadu', '33ABCDE1234F1Z5', '[{"desc": "Wedding invitation design", "qty": 1, "unit_paise": 1500000, "gst_rate": 18, "hsn": "998391"}, {"desc": "Printed invitations", "qty": 250, "unit_paise": 4000, "gst_rate": 12, "hsn": "4911"}]'::jsonb, 0, true, 18, 2500000, 390000, 2890000, 'Thank you for your business.', 'paid', (current_date + -20), 'bank', null),
('dededede-000f-4000-8000-000000000002', 'invoice', 'DEMO/2026-27/002', null, (current_date + -12), (current_date + 3), 'Vikram Iyer', 'vikram.iyer@example.com', '+91 98765 00002', '11, Test Street
Chennai - 600017
Tamil Nadu', null, '[{"desc": "Corporate lettering workshop (30 people)", "qty": 1, "unit_paise": 4500000, "gst_rate": 18, "hsn": "999293"}]'::jsonb, 500000, true, 18, 4500000, 720000, 4720000, 'Advance received. Balance on the day.', 'sent', null, null, null),
('dededede-000f-4000-8000-000000000003', 'invoice', 'DEMO/2026-27/003', null, (current_date + -40), (current_date + -10), 'Meera Krishnan', 'meera.k@example.com', '+91 98765 00003', '12, Test Street
Bengaluru - 560034
Karnataka', null, '[{"desc": "Live calligraphy at store launch", "qty": 4, "unit_paise": 600000, "gst_rate": 18, "hsn": ""}]'::jsonb, 0, false, 18, 2400000, 0, 2400000, null, 'sent', null, null, ((current_date + -3) + time '10:00') at time zone 'Asia/Kolkata'),
('dededede-000f-4000-8000-000000000004', 'invoice', 'DEMO/2026-27/004', null, (current_date + -1), (current_date + 14), 'Rohan Mehta', 'rohan.mehta@example.com', '+91 98765 00004', '13, Test Street
Mumbai - 400050
Maharashtra', null, '[{"desc": "Custom name cards", "qty": 120, "unit_paise": 2500, "gst_rate": 18, "hsn": ""}, {"desc": "Envelope addressing", "qty": 120, "unit_paise": 3000, "gst_rate": 18, "hsn": ""}]'::jsonb, 0, false, 18, 660000, 0, 660000, null, 'draft', null, null, null),
('dededede-000f-4000-8000-000000000005', 'invoice', 'DEMO/2026-27/005', null, (current_date + -60), (current_date + -45), 'Fatima Sheikh', 'fatima.s@example.com', '+91 98765 00005', '14, Test Street
Hyderabad - 500034
Telangana', '33ABCDE1234F1Z5', '[{"desc": "Logo lettering", "qty": 1, "unit_paise": 2500000, "gst_rate": 18, "hsn": "998391"}]'::jsonb, 0, true, 18, 2500000, 450000, 2950000, 'Paid in three parts.', 'paid', (current_date + -44), 'bank', null),
('dededede-000f-4000-8000-000000000006', 'invoice', 'DEMO/2026-27/006', null, (current_date + -25), (current_date + -5), 'Arjun Nair', 'arjun.nair@example.com', '+91 98765 00006', '15, Test Street
Kochi - 682020
Kerala', null, '[{"desc": "Signage hand lettering", "qty": 2, "unit_paise": 800000, "gst_rate": 18, "hsn": ""}]'::jsonb, 0, false, 18, 1600000, 0, 1600000, 'Cancelled by the client.', 'cancelled', null, null, null),
('dededede-000f-4000-8000-000000000007', 'invoice', 'DEMO/2026-27/007', null, (current_date + -3), (current_date + 27), 'Priya Sundaram', 'priya.s@example.com', '+91 98765 00007', '16, Test Street
Chennai - 600028
Tamil Nadu', '33ABCDE1234F1Z5', '[{"desc": "School art week, 5 sessions", "qty": 5, "unit_paise": 400000, "gst_rate": 18, "hsn": "999293"}]'::jsonb, 0, true, 18, 2000000, 360000, 2360000, null, 'sent', null, null, null),
('dededede-000f-4000-8000-000000000008', 'invoice', 'DEMO/2026-27/008', null, (current_date + -15), (current_date + 0), 'Karthik Raman', 'karthik.r@example.com', '+91 98765 00008', '17, Test Street
Coimbatore - 641002
Tamil Nadu', null, '[{"desc": "Gift hampers with lettered tags", "qty": 40, "unit_paise": 45000, "gst_rate": 12, "hsn": ""}]'::jsonb, 200000, true, 18, 1800000, 192000, 1792000, null, 'paid', (current_date + -14), 'card', null),
('dededede-000f-4000-8000-000000000009', 'invoice', 'DEMO/2026-27/009', null, (current_date + -5), (current_date + 10), 'Divya Menon', 'divya.menon@example.com', '+91 98765 00009', '18, Test Street
Bengaluru - 560038
Karnataka', null, '[{"desc": "Mural sketch consultation", "qty": 1, "unit_paise": 300000, "gst_rate": 18, "hsn": ""}]'::jsonb, 0, false, 18, 300000, 0, 300000, 'Token advance paid.', 'sent', null, null, null),
('dededede-000f-4000-8000-000000000010', 'quotation', 'DEMO-Q/2026-27/001', null, (current_date + -4), (current_date + 26), 'Sanjay Gupta', 'sanjay.g@example.com', '+91 98765 00010', '19, Test Street
New Delhi - 110017
Delhi', null, '[{"desc": "Bulk invitation printing", "qty": 500, "unit_paise": 3500, "gst_rate": 12, "hsn": "4911"}]'::jsonb, 0, true, 18, 1750000, 210000, 1960000, 'Prices valid for 30 days.', 'sent', null, null, null),
('dededede-000f-4000-8000-000000000011', 'quotation', 'DEMO-Q/2026-27/002', null, (current_date + -20), (current_date + 10), 'Lakshmi Venkat', 'lakshmi.v@example.com', '+91 98765 00011', '20, Test Street
Chennai - 600041
Tamil Nadu', '33ABCDE1234F1Z5', '[{"desc": "Brand collaboration: Diwali packaging", "qty": 1, "unit_paise": 6000000, "gst_rate": 18, "hsn": ""}]'::jsonb, 0, true, 18, 6000000, 1080000, 7080000, null, 'accepted', null, null, null),
('dededede-000f-4000-8000-000000000012', 'quotation', 'DEMO-Q/2026-27/003', null, (current_date + 0), (current_date + 30), 'Neha Joshi', 'neha.joshi@example.com', '+91 98765 00012', '21, Test Street
Pune - 411004
Maharashtra', null, '[{"desc": "Kids camp for 40 children", "qty": 40, "unit_paise": 250000, "gst_rate": 18, "hsn": ""}]'::jsonb, 1000000, false, 18, 10000000, 0, 9000000, null, 'draft', null, null, null),
('dededede-000f-4000-8000-000000000013', 'quotation', 'DEMO-Q/2026-27/004', null, (current_date + -50), (current_date + -20), 'Rahul Das', 'rahul.das@example.com', '+91 98765 00013', '22, Test Street
Kolkata - 700019
West Bengal', null, '[{"desc": "Wall art", "qty": 1, "unit_paise": 1800000, "gst_rate": 18, "hsn": ""}]'::jsonb, 0, false, 18, 1800000, 0, 1800000, 'Client went with another artist.', 'cancelled', null, null, null),
('dededede-000f-4000-8000-000000000014', 'invoice', 'DEMO/2026-27/010', null, (current_date + -9), (current_date + -2), 'Karthik Raman', 'karthik.r@example.com', '+91 98765 00008', '17, Test Street
Coimbatore - 641002
Tamil Nadu', null, '[{"desc": "Calligraphy name tags", "qty": 60, "unit_paise": 3000, "gst_rate": 12, "hsn": "4911"}]'::jsonb, 0, true, 18, 180000, 21600, 201600, null, 'paid', (current_date + -8), 'upi', null),
('dededede-000f-4000-8000-000000000015', 'invoice', 'DEMO/2026-27/011', null, (current_date + -2), (current_date + 12), 'Anita Rao', 'anita.rao@example.com', '+91 98765 00001', '10, Test Street
Chennai - 600024
Tamil Nadu', null, '[{"desc": "Seating chart lettering", "qty": 1, "unit_paise": 400000, "gst_rate": 18, "hsn": ""}]'::jsonb, 0, false, 18, 400000, 0, 400000, 'Half now, half on delivery.', 'sent', null, null, null);

-- payments received against those invoices (full and part payments)

insert into invoice_payments (id, invoice_id, amount_paise, paid_on, method, note) values
('dededede-0010-4000-8000-000000000001', 'dededede-000f-4000-8000-000000000001', 2890000, (current_date + -20), 'bank', null),
('dededede-0010-4000-8000-000000000002', 'dededede-000f-4000-8000-000000000002', 2000000, (current_date + -10), 'bank', null),
('dededede-0010-4000-8000-000000000003', 'dededede-000f-4000-8000-000000000002', 500000, (current_date + -5), 'upi', null),
('dededede-0010-4000-8000-000000000004', 'dededede-000f-4000-8000-000000000003', 200000, (current_date + -30), 'cash', 'Advance'),
('dededede-0010-4000-8000-000000000005', 'dededede-000f-4000-8000-000000000005', 1000000, (current_date + -58), 'upi', null),
('dededede-0010-4000-8000-000000000006', 'dededede-000f-4000-8000-000000000005', 1000000, (current_date + -50), 'upi', null),
('dededede-0010-4000-8000-000000000007', 'dededede-000f-4000-8000-000000000005', 950000, (current_date + -44), 'bank', null),
('dededede-0010-4000-8000-000000000008', 'dededede-000f-4000-8000-000000000007', 500000, (current_date + -2), 'cash', null),
('dededede-0010-4000-8000-000000000009', 'dededede-000f-4000-8000-000000000007', 500000, (current_date + -1), 'upi', null),
('dededede-0010-4000-8000-000000000010', 'dededede-000f-4000-8000-000000000008', 1792000, (current_date + -14), 'card', null),
('dededede-0010-4000-8000-000000000011', 'dededede-000f-4000-8000-000000000009', 100000, (current_date + -2), 'upi', null),
('dededede-0010-4000-8000-000000000012', 'dededede-000f-4000-8000-000000000014', 201600, (current_date + -8), 'upi', null);

-- studio rent-outs: paid and unpaid, one day and several days, with and without a time

insert into rentouts (id, name, phone, email, purpose, on_date, end_date, time_text, amount_paise, paid, paid_on, method, note) values
('dededede-0013-4000-8000-000000000001', 'Karthik Photography', '+91 98765 00001', 'anita.rao@example.com', 'Product photo shoot', (current_date + -40), null, '10 am to 2 pm', 450000, true, (current_date + -40), 'upi', 'Dummy rent-out'),
('dededede-0013-4000-8000-000000000002', 'Meera Birthday Party', '+91 98765 00002', 'vikram.iyer@example.com', 'Birthday party for 20', (current_date + -28), null, '4 to 8 pm', 800000, true, (current_date + -28), 'cash', null),
('dededede-0013-4000-8000-000000000003', 'Yoga with Divya', '+91 98765 00003', 'meera.k@example.com', 'Weekly yoga class', (current_date + -21), null, '6 to 7:30 am', 150000, true, (current_date + -21), 'upi', null),
('dededede-0013-4000-8000-000000000004', 'Rohan Mehta', '+91 98765 00004', 'rohan.mehta@example.com', 'Team meeting', (current_date + -14), null, '3 to 5 pm', 250000, true, (current_date + -14), 'bank', 'Dummy rent-out'),
('dededede-0013-4000-8000-000000000005', 'Anita Rao', '+91 98765 00005', 'fatima.s@example.com', 'Baby shower', (current_date + -6), null, '11 am to 3 pm', 700000, false, null, null, null),
('dededede-0013-4000-8000-000000000006', 'Arjun Nair', '+91 98765 00006', 'arjun.nair@example.com', 'Photo exhibition', (current_date + 3), (current_date + 5), 'All day', 1800000, false, null, null, null),
('dededede-0013-4000-8000-000000000007', 'Fatima Sheikh', '+91 98765 00007', 'priya.s@example.com', 'Sketching club', (current_date + 8), null, '5 to 7 pm', 200000, true, (current_date + 8), 'upi', 'Dummy rent-out'),
('dededede-0013-4000-8000-000000000008', 'Sanjay Gupta', '+91 98765 00008', 'karthik.r@example.com', 'Corporate offsite', (current_date + 14), null, '9 am to 5 pm', 2200000, false, null, null, null),
('dededede-0013-4000-8000-000000000009', 'Lakshmi Venkat', '+91 98765 00009', 'divya.menon@example.com', 'Mehendi workshop', (current_date + 17), null, '2 to 6 pm', 600000, true, (current_date + 17), 'cash', null),
('dededede-0013-4000-8000-000000000010', 'Neha Joshi', '+91 98765 00010', 'sanjay.g@example.com', 'Pop-up store', (current_date + 25), (current_date + 26), '10 am to 8 pm', 3000000, false, null, null, 'Dummy rent-out'),
('dededede-0013-4000-8000-000000000011', 'Rahul Das', '+91 98765 00011', 'lakshmi.v@example.com', 'Music rehearsal', (current_date + 30), null, null, 300000, false, null, null, null),
('dededede-0013-4000-8000-000000000012', 'Sneha Pillai', '+91 98765 00012', 'neha.joshi@example.com', 'Engagement shoot', (current_date + 45), null, '7 to 11 am', 500000, false, null, null, null);

-- accounts: money in and out by hand in every main category, plus the invoice payments and the refund above

insert into ledger_entries (id, entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id) values
('dededede-0011-4000-8000-000000000001', (current_date + -33), 'in', 'Custom invitations', 'Demo: Name cards paid in cash', 450000, 0, 'cash', 'Walk-in customer', 'manual', null),
('dededede-0011-4000-8000-000000000002', (current_date + -18), 'in', 'Collaborations', 'Demo: Brand collaboration fee', 2500000, 381356, 'bank', 'Demo Sweets Co.', 'manual', null),
('dededede-0011-4000-8000-000000000003', (current_date + -9), 'in', 'Other income', 'Demo: Sold old easels', 300000, 0, 'upi', 'Neighbour', 'manual', null),
('dededede-0011-4000-8000-000000000004', (current_date + -27), 'out', 'Materials and supplies', 'Demo: Paper and ink stock', 1250000, 190678, 'bank', 'Demo Art Supplies', 'manual', null),
('dededede-0011-4000-8000-000000000005', (current_date + -22), 'out', 'Printing', 'Demo: Workshop handouts', 180000, 0, 'upi', 'Demo Print Shop', 'manual', null),
('dededede-0011-4000-8000-000000000006', (current_date + -21), 'out', 'Venue rent', 'Demo: Bengaluru venue', 800000, 0, 'bank', 'The Bangalore Local', 'manual', null),
('dededede-0011-4000-8000-000000000007', (current_date + -15), 'out', 'Teacher or helper pay', 'Demo: Assistant for kids camp', 600000, 0, 'upi', 'Helper', 'manual', null),
('dededede-0011-4000-8000-000000000008', (current_date + -12), 'out', 'Shipping and courier', 'Demo: India Post charges', 95000, 0, 'cash', 'India Post', 'manual', null),
('dededede-0011-4000-8000-000000000009', (current_date + -8), 'out', 'Marketing', 'Demo: Instagram ads', 200000, 30508, 'card', 'Meta', 'manual', null),
('dededede-0011-4000-8000-000000000010', (current_date + -6), 'out', 'Software and subscriptions', 'Demo: Website hosting', 150000, 22881, 'card', 'Hosting company', 'manual', null),
('dededede-0011-4000-8000-000000000011', (current_date + -4), 'out', 'Equipment', 'Demo: New light box', 450000, 68644, 'upi', 'Demo Electronics', 'manual', null),
('dededede-0011-4000-8000-000000000012', (current_date + -2), 'out', 'Utilities', 'Demo: Studio electricity', 320000, 0, 'bank', 'TNEB', 'manual', null),
('dededede-0011-4000-8000-000000000013', (current_date + -20), 'out', 'Travel', 'Demo: Cab to Bengaluru venue', 250000, 0, 'upi', 'Cab', 'manual', null),
('dededede-0011-4000-8000-000000000014', (current_date + -40), 'out', 'Taxes and fees', 'Demo: Professional tax', 125000, 0, 'bank', 'Corporation', 'manual', null),
('dededede-0011-4000-8000-000000000015', (current_date + -20), 'in', 'Services', 'Invoice DEMO/2026-27/001', 2890000, 390000, 'bank', 'Anita Rao', 'invoice', 'dededede-0010-4000-8000-000000000001'),
('dededede-0011-4000-8000-000000000016', (current_date + -10), 'in', 'Services', 'Invoice DEMO/2026-27/002 (part payment)', 2000000, 305085, 'bank', 'Vikram Iyer', 'invoice', 'dededede-0010-4000-8000-000000000002'),
('dededede-0011-4000-8000-000000000017', (current_date + -5), 'in', 'Services', 'Invoice DEMO/2026-27/002 (part payment)', 500000, 76271, 'upi', 'Vikram Iyer', 'invoice', 'dededede-0010-4000-8000-000000000003'),
('dededede-0011-4000-8000-000000000018', (current_date + -30), 'in', 'Services', 'Invoice DEMO/2026-27/003 (part payment)', 200000, 0, 'cash', 'Meera Krishnan', 'invoice', 'dededede-0010-4000-8000-000000000004'),
('dededede-0011-4000-8000-000000000019', (current_date + -58), 'in', 'Services', 'Invoice DEMO/2026-27/005 (part payment)', 1000000, 152542, 'upi', 'Fatima Sheikh', 'invoice', 'dededede-0010-4000-8000-000000000005'),
('dededede-0011-4000-8000-000000000020', (current_date + -50), 'in', 'Services', 'Invoice DEMO/2026-27/005 (part payment)', 1000000, 152542, 'upi', 'Fatima Sheikh', 'invoice', 'dededede-0010-4000-8000-000000000006'),
('dededede-0011-4000-8000-000000000021', (current_date + -44), 'in', 'Services', 'Invoice DEMO/2026-27/005 (part payment)', 950000, 144915, 'bank', 'Fatima Sheikh', 'invoice', 'dededede-0010-4000-8000-000000000007'),
('dededede-0011-4000-8000-000000000022', (current_date + -2), 'in', 'Services', 'Invoice DEMO/2026-27/007 (part payment)', 500000, 76271, 'cash', 'Priya Sundaram', 'invoice', 'dededede-0010-4000-8000-000000000008'),
('dededede-0011-4000-8000-000000000023', (current_date + -1), 'in', 'Services', 'Invoice DEMO/2026-27/007 (part payment)', 500000, 76271, 'upi', 'Priya Sundaram', 'invoice', 'dededede-0010-4000-8000-000000000009'),
('dededede-0011-4000-8000-000000000024', (current_date + -14), 'in', 'Services', 'Invoice DEMO/2026-27/008', 1792000, 192000, 'card', 'Karthik Raman', 'invoice', 'dededede-0010-4000-8000-000000000010'),
('dededede-0011-4000-8000-000000000025', (current_date + -2), 'in', 'Services', 'Invoice DEMO/2026-27/009 (part payment)', 100000, 0, 'upi', 'Divya Menon', 'invoice', 'dededede-0010-4000-8000-000000000011'),
('dededede-0011-4000-8000-000000000026', (current_date + -8), 'in', 'Services', 'Invoice DEMO/2026-27/010', 201600, 21600, 'upi', 'Karthik Raman', 'invoice', 'dededede-0010-4000-8000-000000000012'),
('dededede-0011-4000-8000-000000000027', (current_date + -40), 'in', 'Studio rent-outs', 'Rent-out: Product photo shoot', 450000, 0, 'upi', 'Karthik Photography', 'rentout', 'dededede-0013-4000-8000-000000000001'),
('dededede-0011-4000-8000-000000000028', (current_date + -28), 'in', 'Studio rent-outs', 'Rent-out: Birthday party for 20', 800000, 0, 'cash', 'Meera Birthday Party', 'rentout', 'dededede-0013-4000-8000-000000000002'),
('dededede-0011-4000-8000-000000000029', (current_date + -21), 'in', 'Studio rent-outs', 'Rent-out: Weekly yoga class', 150000, 0, 'upi', 'Yoga with Divya', 'rentout', 'dededede-0013-4000-8000-000000000003'),
('dededede-0011-4000-8000-000000000030', (current_date + -14), 'in', 'Studio rent-outs', 'Rent-out: Team meeting', 250000, 0, 'bank', 'Rohan Mehta', 'rentout', 'dededede-0013-4000-8000-000000000004'),
('dededede-0011-4000-8000-000000000031', (current_date + 8), 'in', 'Studio rent-outs', 'Rent-out: Sketching club', 200000, 0, 'upi', 'Fatima Sheikh', 'rentout', 'dededede-0013-4000-8000-000000000007'),
('dededede-0011-4000-8000-000000000032', (current_date + 17), 'in', 'Studio rent-outs', 'Rent-out: Mehendi workshop', 600000, 0, 'cash', 'Lakshmi Venkat', 'rentout', 'dededede-0013-4000-8000-000000000009');

-- accounts: money in for every paid dummy order, booking and enrolment (as the website does), Razorpay fees for online ones, and refunds
insert into ledger_entries (id, entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id)
select ('dededede-0011-4000-8000-' || lpad((1000 + row_number() over ())::text, 12, '0'))::uuid, x.* from (
  select (coalesce(o.paid_at, o.created_at) at time zone 'Asia/Kolkata')::date, 'in', 'Store sales', 'Online order ' || o.invoice_no, o.total_paise, (select coalesce(sum(gst_paise), 0) from order_items i where i.order_id = o.id)::int, o.payment_method, o.name, 'order', o.id
    from orders o where o.id::text like 'dededede-%' and o.status in ('paid','packed','shipped','delivered','refunded')
  union all select (b.paid_at at time zone 'Asia/Kolkata')::date, 'in', 'Workshops', w.title || ' · ' || b.seats || ' seat(s)', b.amount_paise, coalesce(b.gst_paise, 0), b.payment_method, b.name, 'booking', b.id
    from bookings b join workshops w on w.id = b.workshop_id where b.id::text like 'dededede-%' and b.status in ('paid','refunded','transferred') and b.amount_paise > 0
  union all select (e.paid_at at time zone 'Asia/Kolkata')::date, 'in', 'Classes', l.title || ', ' || l.level || ' for ' || e.student_name, e.amount_paise, coalesce(e.gst_paise, 0), e.payment_method, e.name, 'enrolment', e.id
    from class_enrolments e join class_levels l on l.id = e.class_id where e.id::text like 'dededede-%' and e.status in ('paid','refunded','transferred')
) x(entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id);
insert into ledger_entries (id, entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id)
select ('dededede-0011-4000-8000-' || lpad((2000 + row_number() over ())::text, 12, '0'))::uuid, l.entry_date, 'out', 'Payment gateway fees', 'Razorpay fee (estimated): ' || l.description,
       round(l.amount_paise * 0.02 * 1.18)::int, round(l.amount_paise * 0.02 * 0.18)::int, 'razorpay', 'Razorpay', 'fee', l.source_id
from ledger_entries l where l.id::text like 'dededede-0011-%' and l.method = 'razorpay' and l.kind = 'in' and l.amount_paise > 0;
insert into ledger_entries (id, entry_date, kind, category, description, amount_paise, gst_paise, method, party, source, source_id)
select ('dededede-0011-4000-8000-' || lpad((3000 + row_number() over ())::text, 12, '0'))::uuid, current_date - 1, 'out', 'Refunds', 'Refund: ' || x.what, x.amt, x.gst, 'razorpay', x.who, 'refund', x.id from (
  select o.id, o.total_paise amt, (select coalesce(sum(gst_paise), 0) from order_items i where i.order_id = o.id)::int gst, o.name who, 'order ' || o.invoice_no what from orders o where o.id::text like 'dededede-%' and o.status = 'refunded'
  union all select b.id, b.amount_paise, coalesce(b.gst_paise, 0), b.name, 'workshop booking' from bookings b where b.id::text like 'dededede-%' and b.status = 'refunded'
  union all select e.id, e.amount_paise, coalesce(e.gst_paise, 0), e.name, 'class enrolment' from class_enrolments e where e.id::text like 'dededede-%' and e.status = 'refunded') x;

-- show how many dummy rows each table now has
select t.name as "table", t.n as "dummy rows" from (values
  ('workshops', (select count(*) from workshops where id::text like 'dededede-%')), ('products', (select count(*) from products where id::text like 'dededede-%')),
  ('class_types', (select count(*) from class_types where id::text like 'dededede-%')), ('class_levels', (select count(*) from class_levels where id::text like 'dededede-%')),
  ('rentouts', (select count(*) from rentouts where id::text like 'dededede-%')), ('class_sessions', (select count(*) from class_sessions where id::text like 'dededede-%')),
  ('class_enrolments', (select count(*) from class_enrolments where id::text like 'dededede-%')), ('bookings', (select count(*) from bookings where id::text like 'dededede-%')),
  ('workshop_waitlist', (select count(*) from workshop_waitlist where id::text like 'dededede-%')), ('customers', (select count(*) from customers where id::text like 'dededede-%')),
  ('orders', (select count(*) from orders where id::text like 'dededede-%')), ('order_items', (select count(*) from order_items where id::text like 'dededede-%')),
  ('enquiries', (select count(*) from enquiries where id::text like 'dededede-%')), ('events', (select count(*) from events where id::text like 'dededede-%')),
  ('todos', (select count(*) from todos where id::text like 'dededede-%')), ('invoices', (select count(*) from invoices where id::text like 'dededede-%')),
  ('invoice_payments', (select count(*) from invoice_payments where id::text like 'dededede-%')), ('ledger_entries', (select count(*) from ledger_entries where id::text like 'dededede-%'))
) t(name, n);
commit;
