#!/usr/bin/env python3
"""Writes supabase/dummy.sql: test data for every table, at least 10 rows each, covering every status and option.
Every dummy row has an id starting with dededede- (and people use @example.com emails), so supabase/dummy-remove.sql can take it all out again.
Dates are relative to the day the SQL is run (current_date), so upcoming things stay upcoming.
Run: python3 tools/make_dummy_sql.py"""
import json, os

def did(table, n):  # dededede-<table>-4000-8000-<n>
    return f"dededede-{table:04x}-4000-8000-{n:012d}"
def q(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, Raw): return v.s
    if isinstance(v, Json): return q(json.dumps(v.v, ensure_ascii=False)) + '::jsonb'
    if isinstance(v, (list, tuple)): return 'array[' + ','.join(q(x) for x in v) + ']' if v else "'{}'"
    if isinstance(v, dict): return q(json.dumps(v, ensure_ascii=False)) + '::jsonb'
    return "'" + str(v).replace("'", "''") + "'"
class Json:
    def __init__(self, v): self.v = v
class Raw:
    def __init__(self, s): self.s = s
D = lambda n: Raw(f"(current_date + {n})")                                       # a date n days from today
TS = lambda n, hm='10:00': Raw(f"((current_date + {n}) + time '{hm}') at time zone 'Asia/Kolkata'")  # a moment n days from today, India time
def ins(table, cols, rows):
    out = [f"insert into {table} ({', '.join(cols)}) values"]
    out.append(',\n'.join('(' + ', '.join(q(r.get(c)) for c in cols) + ')' for r in rows) + ';')
    return '\n'.join(out)

sql = ["""-- ============ DUMMY TEST DATA (made by tools/make_dummy_sql.py, do not edit by hand) ============
-- Fills every table with at least 10 varied rows so every screen of the website and the Manager app can be tried.
-- Run AFTER schema.sql, seed.sql and v2.sql to v8.sql. Run it once; to take everything out again run supabase/dummy-remove.sql.
-- Every dummy row has an id starting with dededede- and every dummy person uses an @example.com email.
-- Dummy workshops, products and classes are named "Demo ..." and DO show on the public website while they are in the database.
-- Website receipt numbers are not used up: dummy orders, bookings and enrolments use numbers 9001 and up.
-- Not touched on purpose: settings, site_images, admin_security (the PIN) and profiles (real logins only).
begin;
"""]

# ---------- workshops (12) ----------
W = []
def w(n, **k): k['id'] = did(1, n); W.append(k)
img = ['/img/16cc08c542.webp', '/img/26928ebd04.webp', '/img/31648a2db3.webp', '/img/cb028c51a9.webp', '/img/5c8f647552.webp', '/img/a399441366.webp']
studio = ('Thin Black Brush Studio', '2nd Floor, Berachah Building, 13/7, 1st Cross St, Trustpuram, Kodambakkam, Chennai - 600024')
blr = ('The Bangalore Local', '1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka')
w(1, slug='demo-brush-lettering-basics', title='Demo: Brush Lettering Basics', kind='workshop', at=21, price=180000, friend=160000, cap=12, gst='none', status='published', venue=studio, early=150000, early_until=7)
w(2, slug='demo-watercolour-florals', title='Demo: Watercolour Florals', kind='workshop', at=10, price=250000, cap=6, gst='included', status='published', venue=studio)   # sold out
w(3, slug='demo-copperplate-course', title='Demo: Copperplate Calligraphy Course', kind='course', at=30, end=58, price=1200000, cap=8, gst='add', status='published', venue=studio)
w(4, slug='demo-gouache-landscapes', title='Demo: Gouache Landscapes', kind='workshop', at=-20, price=220000, cap=10, gst='none', status='published', venue=blr)    # already happened
w(5, slug='demo-kids-doodle-camp', title='Demo: Kids Doodle Camp (ages 6 to 12)', kind='course', at=40, end=44, price=350000, cap=15, gst='none', status='published', venue=studio, early=300000, early_until=20)
w(6, slug='demo-ink-and-wash', title='Demo: Ink and Wash Painting', kind='workshop', at=50, price=200000, cap=10, gst='none', status='draft', venue=studio)        # not public yet
w(7, slug='demo-gift-tag-lettering', title='Demo: Gift Tag Lettering', kind='workshop', at=15, price=150000, cap=12, gst='none', status='cancelled', venue=blr)
w(8, slug='demo-free-open-studio', title='Demo: Free Open Studio Evening', kind='workshop', at=5, hm='17:30', price=0, cap=20, gst='none', status='published', venue=studio)
w(9, slug='demo-gothic-blackletter', title='Demo: Gothic Blackletter', kind='workshop', at=-60, price=230000, cap=12, gst='included', status='published', venue=studio)
w(10, slug='demo-wedding-envelope-addressing', title='Demo: Wedding Envelope Addressing', kind='workshop', at=70, price=280000, friend=250000, cap=8, gst='add', status='published', venue=blr)
w(11, slug='demo-pointed-pen-flourishing', title='Demo: Pointed Pen Flourishing', kind='workshop', at=2, hm='11:00', price=240000, cap=4, gst='none', status='published', venue=studio)   # almost full
w(12, slug='demo-corporate-team-session', title='Demo: Corporate Team Lettering Session', kind='workshop', at=90, price=150000, cap=30, gst='add', status='draft', venue=blr)
rows = []
for i, x in enumerate(W):
    rows.append({'id': x['id'], 'slug': x['slug'], 'title': x['title'], 'kind': x['kind'], 'summary': 'A test workshop made for trying out the website. Remove with dummy-remove.sql.',
        'description': 'This is dummy text.\n\nIt lets you see how a long description, the list of what is included and what you will learn look on the page.',
        'venue_name': x['venue'][0], 'venue_address': x['venue'][1], 'map_link': 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7',
        'starts_at': TS(x['at'], x.get('hm', '10:00')), 'ends_at': TS(x['end'], '13:00') if x.get('end') else TS(x['at'], '13:00'),
        'price_paise': x['price'], 'friend_price_paise': x.get('friend'), 'early_price_paise': x.get('early'), 'early_until': D(x['early_until']) if x.get('early_until') else None,
        'capacity': x['cap'], 'includes': ['All materials', 'Practice sheets', 'Tea and snacks'] if x['price'] else [], 'learn': ['Basic strokes', 'Letter shapes', 'Putting words together'],
        'note': 'Materials are provided.' if i % 2 == 0 else None, 'image_path': img[i % len(img)], 'status': x['status'], 'gst_mode': x['gst']})
sql.append('-- workshops: published, draft, cancelled, past, sold out, almost full, free, early-bird, friend price, courses over several days, every GST option')
sql.append(ins('workshops', list(rows[0].keys()), rows))

# ---------- products (12) ----------
P = [('demo-sketchbook-a5', 'Demo: A5 Sketchbook', 65000, 25, False, True, 'none'), ('demo-nib-set', 'Demo: Calligraphy Nib Set of 5', 90000, 3, False, True, 'included'),
     ('demo-sumi-ink', 'Demo: Sumi Ink 60 ml', 45000, 0, False, True, 'none'), ('demo-custom-holder', 'Demo: Custom Engraved Holder (pre-order)', 210000, 0, True, True, 'add'),
     ('demo-practice-pad', 'Demo: Practice Pad 100 Sheets', 35000, 40, False, True, 'none'), ('demo-gift-box', 'Demo: Lettering Gift Box', 320000, 6, False, True, 'add'),
     ('demo-brush-pen-trio', 'Demo: Brush Pen Trio', 55000, 1, False, True, 'included'), ('demo-old-planner', 'Demo: Old Planner (hidden)', 80000, 5, False, False, 'none'),
     ('demo-watercolour-tin', 'Demo: Watercolour Tin of 12', 150000, 12, False, True, 'add'), ('demo-paper-sampler', 'Demo: Handmade Paper Sampler', 25000, 50, False, True, 'none'),
     ('demo-gold-ink', 'Demo: Gold Pearl Ink', 60000, 8, False, True, 'none'), ('demo-lightbox', 'Demo: A4 LED Lightbox', 280000, 2, True, True, 'included')]
pimg = ['/img/4aab591127.webp', '/img/33e1b05fd6.webp', '/img/42e66b73f9.webp', '/img/e36ba5ccbd.webp']
rows = [{'id': did(2, i + 1), 'slug': s, 'title': t, 'description': 'A dummy product for testing the store, the bag and checkout.', 'details': ['Test detail one', 'Test detail two'], 'price_paise': p, 'stock': st,
         'allow_preorder': pre, 'images': [pimg[i % 4], pimg[(i + 1) % 4]], 'shipping_note': 'Ships in 8 days.' if pre else None, 'active': act, 'sort_order': 100 + i, 'gst_mode': g} for i, (s, t, p, st, pre, act, g) in enumerate(P)]
sql.append('-- products: in stock, low stock, out of stock, pre-order, hidden, every GST option')
sql.append(ins('products', list(rows[0].keys()), rows))
PRICE = {did(2, i + 1): (t, p, g) for i, (s, t, p, st, pre, act, g) in enumerate(P)}

# ---------- class types (10) and class levels (10) ----------
sql.append('-- class types (the drop-down on the class form)')
sql.append(ins('class_types', ['id', 'name', 'sort_order'], [{'id': did(0x12, i + 1), 'name': n, 'sort_order': 100 + i} for i, n in enumerate(
    ['Demo: Cursive', 'Demo: Brush Lettering', 'Demo: Copperplate', 'Demo: Italic', 'Demo: Gothic', 'Demo: Faux Calligraphy', 'Demo: Print Handwriting', 'Demo: Kids Art', 'Demo: Watercolour', 'Demo: Sketching'])]))
L = [('demo-cursive-1', 'Demo: Cursive', 'Cursive Writing', 'Level 1', 500000, 8, True, 'none', [2, 4], '4:30 to 5:30 pm'), ('demo-cursive-2', 'Demo: Cursive', 'Cursive Writing', 'Level 2', 550000, 8, True, 'none', [2, 4], '5:30 to 6:30 pm'),
     ('demo-brush-1', 'Demo: Brush Lettering', 'Brush Lettering', 'Beginner', 650000, 6, True, 'included', [6], '11 am to 12:30 pm'), ('demo-brush-2', 'Demo: Brush Lettering', 'Brush Lettering', 'Intermediate', 700000, 6, True, 'add', [6], '2 to 3:30 pm'),
     ('demo-copperplate-1', 'Demo: Copperplate', 'Copperplate', 'Foundation', 900000, 10, True, 'add', [1, 3], '7 to 8 pm'), ('demo-italic-1', 'Demo: Italic', 'Italic Hand', 'Level 1', 600000, 8, True, 'none', [5], '4 to 5 pm'),
     ('demo-kids-art', 'Demo: Kids Art', 'Kids Art Club', 'Ages 5 to 8', 400000, 12, True, 'none', [0], '10 to 11 am'), ('demo-watercolour-1', 'Demo: Watercolour', 'Watercolour', 'Beginner', 800000, 8, True, 'included', [3], '6 to 7:30 pm'),
     ('demo-gothic-1', 'Demo: Gothic', 'Gothic Script', 'Level 1', 750000, 8, False, 'none', [2], '7 to 8 pm'), ('demo-sketching-1', 'Demo: Sketching', 'Urban Sketching', 'Open level', 450000, 4, True, 'add', [0, 6], '7 to 9 am')]
rows = [{'id': did(3, i + 1), 'slug': s, 'track': tr, 'title': t, 'level': lv, 'description': 'A dummy class level for testing enrolments, batches and attendance.', 'covers': ['Posture and grip', 'Basic strokes', 'Letters and joins'],
         'price_paise': p, 'sessions': n, 'active': a, 'sort_order': 100 + i, 'days': d, 'time_text': tm, 'gst_mode': g} for i, (s, tr, t, lv, p, n, a, g, d, tm) in enumerate(L)]
sql.append('-- class levels: several tracks, active and hidden, every GST option')
sql.append(ins('class_levels', list(rows[0].keys()), rows))
LEVEL = {did(3, i + 1): x for i, x in enumerate(L)}

# ---------- class batches (12): sessions are made below from their days ----------
B = [(1, 'Demo: Cursive L1, Tue Thu (running)', -21, [2, 4], '4:30 to 5:30 pm', 8, 10, True), (1, 'Demo: Cursive L1, next batch', 14, [2, 4], '4:30 to 5:30 pm', 8, 10, True),
     (2, 'Demo: Cursive L2, finished', -70, [2, 4], '5:30 to 6:30 pm', 8, 8, False), (3, 'Demo: Brush Beginner, Saturdays', -14, [6], '11 am to 12:30 pm', 6, 8, True),
     (4, 'Demo: Brush Intermediate', 7, [6], '2 to 3:30 pm', 6, 6, True), (5, 'Demo: Copperplate Mon Wed', -10, [1, 3], '7 to 8 pm', 10, 6, True),
     (6, 'Demo: Italic Fridays', -35, [5], '4 to 5 pm', 8, 8, True), (7, 'Demo: Kids Art Sundays', -28, [0], '10 to 11 am', 12, 15, True),
     (8, 'Demo: Watercolour Wednesdays', 3, [3], '6 to 7:30 pm', 8, None, True), (10, 'Demo: Sketching weekends', -7, [0, 6], '7 to 9 am', 4, 12, True),
     (1, 'Demo: Cursive L1, holiday batch', 30, [1, 2, 3, 4, 5], '10 to 11 am', 8, 12, True), (9, 'Demo: Gothic (hidden level)', -40, [2], '7 to 8 pm', 8, 6, False)]
rows = [{'id': did(4, i + 1), 'class_id': did(3, lv), 'name': nm, 'starts_on': D(st), 'days': ds, 'time_text': tm, 'sessions': n, 'capacity': cap, 'active': a} for i, (lv, nm, st, ds, tm, n, cap, a) in enumerate(B)]
sql.append('-- class batches: running, finished, starting soon, weekday and weekend, with and without a seat limit')
sql.append(ins('class_batches', list(rows[0].keys()), rows))
sql.append("""-- class sessions: one dated class for each lesson of each dummy batch, on the batch's days. Past ones are marked done.
insert into class_sessions (id, batch_id, no, on_date, status)
select ('dededede-0005-4000-8000-' || lpad((row_number() over ())::text, 12, '0'))::uuid, x.batch_id, x.no, x.d, case when x.d < current_date then 'done' else 'scheduled' end
from (select b.id batch_id, g.d::date d, row_number() over (partition by b.id order by g.d) no, b.sessions
      from class_batches b cross join generate_series(b.starts_on, b.starts_on + 400, interval '1 day') g(d)
      where b.id::text like 'dededede-%' and extract(dow from g.d)::int = any(b.days)) x
where x.no <= x.sessions;
-- one class cancelled and one moved to another day, to see how they look
update class_sessions set status = 'cancelled', note = 'Teacher unwell (dummy)' where batch_id = 'dededede-0004-4000-8000-000000000001' and no = (select min(no) from class_sessions where batch_id = 'dededede-0004-4000-8000-000000000001' and status = 'scheduled');
update class_sessions set moved_from = on_date, on_date = on_date + 1, note = 'Moved for a holiday (dummy)' where batch_id = 'dededede-0004-4000-8000-000000000006' and no = (select max(no) from class_sessions where batch_id = 'dededede-0004-4000-8000-000000000006');""")

# ---------- people ----------
PEOPLE = [('Anita Rao', 'anita.rao', '9876500001', 'Chennai', 'Tamil Nadu', '600024'), ('Vikram Iyer', 'vikram.iyer', '9876500002', 'Chennai', 'Tamil Nadu', '600017'),
          ('Meera Krishnan', 'meera.k', '9876500003', 'Bengaluru', 'Karnataka', '560034'), ('Rohan Mehta', 'rohan.mehta', '9876500004', 'Mumbai', 'Maharashtra', '400050'),
          ('Fatima Sheikh', 'fatima.s', '9876500005', 'Hyderabad', 'Telangana', '500034'), ('Arjun Nair', 'arjun.nair', '9876500006', 'Kochi', 'Kerala', '682020'),
          ('Priya Sundaram', 'priya.s', '9876500007', 'Chennai', 'Tamil Nadu', '600028'), ('Karthik Raman', 'karthik.r', '9876500008', 'Coimbatore', 'Tamil Nadu', '641002'),
          ('Divya Menon', 'divya.menon', '9876500009', 'Bengaluru', 'Karnataka', '560038'), ('Sanjay Gupta', 'sanjay.g', '9876500010', 'New Delhi', 'Delhi', '110017'),
          ('Lakshmi Venkat', 'lakshmi.v', '9876500011', 'Chennai', 'Tamil Nadu', '600041'), ('Neha Joshi', 'neha.joshi', '9876500012', 'Pune', 'Maharashtra', '411004'),
          ('Rahul Das', 'rahul.das', '9876500013', 'Kolkata', 'West Bengal', '700019'), ('Sneha Pillai', 'sneha.p', '9876500014', 'Chennai', 'Tamil Nadu', '600020')]
em = lambda i: f"{PEOPLE[i][1]}@example.com"
ph = lambda i: f"+91 {PEOPLE[i][2][:5]} {PEOPLE[i][2][5:]}"
nm = lambda i: PEOPLE[i][0]

# ---------- customers (16): every source, with and without email, and a pair with the same phone to try Merge ----------
src = ['website', 'website', 'wix', 'manual', 'import', 'website', 'wix', 'manual', 'website', 'import', 'website', 'manual', 'wix', 'website']
rows = []
for i, (n, e, p, city, st, pin) in enumerate(PEOPLE):
    rows.append({'id': did(0xb, i + 1), 'name': n, 'email': em(i), 'phone': ph(i), 'address_line1': f'{10 + i}, Test Street', 'address_line2': 'Near the dummy park' if i % 3 == 0 else None,
                 'city': city, 'state': st, 'pincode': pin, 'notes': ['Prefers WhatsApp', 'Left-handed, needs a left oblique holder', None, 'Corporate enquiry contact'][i % 4], 'source': src[i], 'marketing_opt_in': i % 2 == 0})
rows.append({'id': did(0xb, 15), 'name': 'Ganesh Phone Only', 'email': None, 'phone': '+91 98765 00015', 'address_line1': None, 'address_line2': None, 'city': 'Madurai', 'state': 'Tamil Nadu', 'pincode': '625001', 'notes': 'No email: only a phone number', 'source': 'manual', 'marketing_opt_in': False})
rows.append({'id': did(0xb, 16), 'name': 'Anita R (duplicate)', 'email': 'anita.r.other@example.com', 'phone': '98765 00001', 'address_line1': None, 'address_line2': None, 'city': 'Chennai', 'state': 'Tamil Nadu', 'pincode': None, 'notes': 'Same phone as Anita Rao: try Merge', 'source': 'import', 'marketing_opt_in': False})
sql.append('-- customers: every source, opted in and out, with and without email, and a duplicate pair (same phone) to try Merge')
sql.append(ins('customers', list(rows[0].keys()), rows))

# ---------- bookings (16) ----------
BK = [(1, 0, 1, 'paid', 'website', 'razorpay', -3), (1, 1, 2, 'paid', 'website', 'razorpay', -2), (1, 2, 1, 'pending', 'website', None, -1), (1, 3, 1, 'cancelled', 'manual', None, -5),
      (2, 4, 2, 'paid', 'website', 'razorpay', -9), (2, 5, 2, 'paid', 'manual', 'upi', -8), (2, 6, 2, 'paid', 'manual', 'cash', -7),            # workshop 2 is now full (6 of 6)
      (3, 7, 1, 'paid', 'website', 'razorpay', -4), (3, 8, 1, 'refunded', 'website', 'razorpay', -12), (4, 9, 3, 'paid', 'website', 'razorpay', -30), (4, 10, 1, 'transferred', 'manual', 'bank', -28),
      (5, 11, 2, 'paid', 'website', 'razorpay', -1), (8, 12, 1, 'paid', 'manual', 'other', -2), (9, 13, 1, 'paid', 'manual', 'card', -70), (11, 0, 3, 'paid', 'website', 'razorpay', -6), (10, 2, 1, 'pending', 'manual', None, -1)]
rows = []
for i, (wn, pi, seats, st, ch, meth, ago) in enumerate(BK):
    wk = W[wn - 1]; price = wk.get('early') if wk.get('early') else wk['price']; amt = price * seats
    g = round(amt * 0.18) if wk['gst'] == 'add' else round(amt - amt / 1.18) if wk['gst'] == 'included' else 0
    if wk['gst'] == 'add': amt += g
    paid = st in ('paid', 'refunded', 'transferred')
    rows.append({'id': did(7, i + 1), 'workshop_id': wk['id'], 'name': nm(pi), 'email': em(pi), 'phone': ph(pi), 'seats': seats, 'amount_paise': amt, 'gst_paise': g, 'status': st, 'channel': ch,
                 'payment_method': meth if paid else None, 'razorpay_order_id': f'order_demo_bk{i + 1:03d}' if ch == 'website' else None, 'razorpay_payment_id': f'pay_demo_bk{i + 1:03d}' if ch == 'website' and paid else None,
                 'invoice_no': 9001 + i, 'notes': 'Coming with a friend' if seats > 1 else None, 'created_at': TS(ago, '12:00'), 'paid_at': TS(ago, '12:05') if paid else None})
sql.append('-- workshop bookings: paid online and by hand, unpaid, cancelled, refunded, transferred, several seats; "Watercolour Florals" is sold out')
sql.append(ins('bookings', list(rows[0].keys()), rows))

# ---------- waitlist (10) ----------
rows = [{'id': did(8, i + 1), 'workshop_id': W[1]['id'] if i < 7 else W[10]['id'], 'name': nm(pi), 'email': em(pi), 'phone': ph(pi) if i % 3 else None, 'seats': [1, 2, 1, 3, 1, 1, 2, 1, 1, 2][i],
         'notified_at': TS(-1, '09:00') if i in (0, 1, 7) else None, 'created_at': TS(-6 + i % 5, '15:00')} for i, pi in enumerate([7, 8, 9, 10, 11, 12, 13, 1, 3, 5])]
sql.append('-- waitlist for the sold-out and the almost-full workshops; some already told about a free seat')
sql.append(ins('workshop_waitlist', list(rows[0].keys()), rows))

# ---------- class enrolments (16) ----------
EN = [(1, 1, 'child', 'Aadhya', 7, 0, 'paid', 'website'), (1, 1, 'child', 'Ishaan', 9, 1, 'paid', 'manual'), (1, 1, 'child', 'Kavya', 6, 2, 'paid', 'website'), (1, 1, 'adult', None, None, 3, 'paid', 'manual'),
      (1, 2, 'child', 'Vihaan', 11, 4, 'pending', 'website'), (2, 3, 'child', 'Diya', 12, 5, 'paid', 'website'), (3, 4, 'adult', None, None, 6, 'paid', 'website'), (3, 4, 'adult', None, None, 7, 'paid', 'manual'),
      (5, 6, 'adult', None, None, 8, 'paid', 'website'), (5, 6, 'adult', None, None, 9, 'refunded', 'website'), (6, 7, 'child', 'Advik', 15, 10, 'paid', 'manual'), (7, 8, 'child', 'Myra', 5, 11, 'paid', 'website'),
      (7, 8, 'child', 'Reyansh', 8, 12, 'cancelled', 'manual'), (8, 9, 'adult', None, None, 13, 'pending', 'manual'), (10, 10, 'adult', None, None, 0, 'paid', 'manual'), (1, None, 'child', 'Saanvi', 10, 2, 'transferred', 'website')]
rows = []
for i, (lv, bt, grp, kid, age, pi, st, ch) in enumerate(EN):
    l = LEVEL[did(3, lv)]; amt = l[4]; g = round(amt * 0.18) if l[7] == 'add' else round(amt - amt / 1.18) if l[7] == 'included' else 0
    if l[7] == 'add': amt += g
    paid = st in ('paid', 'refunded', 'transferred')
    rows.append({'id': did(6, i + 1), 'class_id': did(3, lv), 'batch_id': did(4, bt) if bt else None, 'student_name': kid if grp == 'child' else nm(pi), 'student_group': grp, 'student_age': age,
                 'name': nm(pi), 'email': em(pi), 'phone': ph(pi), 'amount_paise': amt, 'gst_paise': g, 'status': st, 'channel': ch, 'payment_method': ('razorpay' if ch == 'website' else ['upi', 'cash', 'bank'][i % 3]) if paid else None,
                 'razorpay_order_id': f'order_demo_en{i + 1:03d}' if ch == 'website' else None, 'razorpay_payment_id': f'pay_demo_en{i + 1:03d}' if ch == 'website' and paid else None,
                 'invoice_no': 9101 + i, 'notes': 'Needs a left-handed holder' if i == 3 else None, 'created_at': TS(-25 + i, '18:00'), 'paid_at': TS(-25 + i, '18:10') if paid else None})
sql.append('-- class enrolments: children 5 to 15 and adults, placed in a batch or not yet, paid, unpaid, refunded, cancelled, transferred')
sql.append(ins('class_enrolments', list(rows[0].keys()), rows))
sql.append("""-- attendance: for every class already held, each paid student in that batch is marked present or absent
insert into class_attendance (session_id, enrolment_id, present)
select s.id, e.id, (abs(hashtext(s.id::text || e.id::text)) % 5) <> 0
from class_sessions s join class_enrolments e on e.batch_id = s.batch_id and e.status = 'paid'
where s.batch_id::text like 'dededede-%' and s.status = 'done';""")

# ---------- orders (15) and their items ----------
O = [('paid', 'website', [(1, 2)], 6000, 0, 'Happy birthday, Meera!', None, None), ('packed', 'website', [(2, 1), (5, 2)], 6000, 1, None, None, 'Pack with bubble wrap'), ('shipped', 'website', [(6, 1)], 0, 2, None, ('India Post', 'EM123456789IN'), None),
     ('delivered', 'website', [(9, 1), (10, 3)], 0, 3, None, ('Blue Dart', '90876543210'), None), ('pending', 'website', [(11, 1)], 6000, 4, None, None, None), ('cancelled', 'website', [(1, 1)], 6000, 5, None, None, 'Customer changed mind'),
     ('refunded', 'website', [(7, 1)], 6000, 6, None, None, 'Arrived damaged: refunded'), ('paid', 'manual', [(4, 1)], 0, 7, None, None, 'Pre-order: engrave "KR"'), ('delivered', 'manual', [(12, 1), (2, 1)], 0, 8, 'With love', ('DTDC', 'D12345678'), None),
     ('pending', 'manual', [(5, 5)], 6000, 9, None, None, 'Will pay at the studio'), ('shipped', 'website', [(1, 1), (3, 1)], 6000, 10, None, ('Delhivery', '1234567890123'), None), ('paid', 'website', [(10, 10)], 0, 11, None, None, None),
     ('delivered', 'manual', [(6, 2)], 0, 12, 'Congratulations on your new home', ('India Post', 'EM987654321IN'), 'Bulk gift order'), ('packed', 'website', [(9, 2)], 6000, 13, None, None, None), ('paid', 'website', [(2, 3)], 6000, 0, None, None, None)]
orows, irows = [], []; n_item = 0
for i, (st, ch, items, ship, pi, gift, track, note) in enumerate(O):
    oid = did(9, i + 1); sub = 0
    for (pn, qty) in items:
        t, price, g = PRICE[did(2, pn)]; base = price * qty
        gst = round(base * 0.18) if g == 'add' else round(base - base / 1.18) if g == 'included' else 0
        line = base + (gst if g == 'add' else 0); sub += line; n_item += 1
        irows.append({'id': did(0xa, n_item), 'order_id': oid, 'product_id': did(2, pn), 'title': t, 'unit_paise': price, 'qty': qty, 'gst_paise': gst})
    paid = st not in ('pending', 'cancelled'); n, e, p, city, state, pin = PEOPLE[pi]
    orows.append({'id': oid, 'name': n, 'email': em(pi), 'phone': ph(pi), 'shipping_address': {'recipient': n, 'phone': ph(pi), 'line1': f'{10 + pi}, Test Street', 'line2': '', 'city': city, 'state': state, 'pincode': pin},
                  'subtotal_paise': sub, 'shipping_paise': ship, 'total_paise': sub + ship, 'gift_message': gift, 'status': st, 'tracking_carrier': track[0] if track else None, 'tracking_number': track[1] if track else None,
                  'razorpay_order_id': f'order_demo_or{i + 1:03d}' if ch == 'website' else None, 'razorpay_payment_id': f'pay_demo_or{i + 1:03d}' if ch == 'website' and paid else None, 'invoice_no': 9201 + i,
                  'channel': ch, 'payment_method': ('razorpay' if ch == 'website' else ['upi', 'cash'][i % 2]) if paid else None, 'notes': note, 'created_at': TS(-40 + i * 2, '20:00'), 'paid_at': TS(-40 + i * 2, '20:03') if paid else None})
sql.append('-- orders: every status (to pack, packed, shipped, delivered, unpaid, cancelled, refunded), online and by hand, gift messages, tracking, private notes, free and paid shipping')
sql.append(ins('orders', list(orows[0].keys()), orows))
sql.append(ins('order_items', list(irows[0].keys()), irows))

# ---------- enquiries (12) ----------
E = [('contact', 'Do you have weekend batches?', {'topic': 'Classes'}), ('invitation', 'Wedding invitations for 250 guests, hand lettered names.', {'event': 'Wedding', 'quantity': 250, 'date': 'February'}),
     ('service', 'Live calligraphy at our store launch.', {'service': 'Live event', 'city': 'Chennai'}), ('collaboration', 'Brand collaboration for Diwali hampers.', {'brand': 'Demo Sweets Co.'}),
     ('hiring', 'I would love to teach kids art on weekends.', {'role': 'Teacher', 'portfolio': 'https://example.com/portfolio'}), ('contact', 'Is the nib set compatible with my holder?', {'topic': 'Store'}),
     ('invitation', 'Baby shower invitations, pastel colours.', {'event': 'Baby shower', 'quantity': 60}), ('service', 'Corporate workshop for 30 people.', {'service': 'Corporate workshop', 'people': 30}),
     ('contact', 'Can I pay by bank transfer?', {'topic': 'Payments'}), ('collaboration', 'School art week partnership.', {'organisation': 'Demo Public School'}),
     ('hiring', 'Internship for the summer?', {'role': 'Intern'}), ('contact', 'Please call me back about the kids camp.', {'topic': 'Workshops'})]
rows = [{'id': did(0xc, i + 1), 'kind': k, 'name': nm(i), 'email': em(i), 'phone': ph(i), 'message': m, 'details': d, 'handled': i % 3 == 0, 'created_at': TS(-i * 2, '11:00')} for i, (k, m, d) in enumerate(E)]
sql.append('-- inbox: every kind of enquiry, handled and not')
sql.append(ins('enquiries', list(rows[0].keys()), rows))

# ---------- events (10) and to-dos (12) ----------
EV = [('Demo: Meeting with the printer', 1, None, '3 pm'), ('Demo: Stall at the Sunday market', 6, 7, '9 am to 6 pm'), ('Demo: Diwali holiday, studio closed', 18, 22, None), ('Demo: Photo shoot for new products', -3, None, '11 am'),
      ('Demo: GST filing due', 8, None, None), ('Demo: Supplier visit', 12, None, '4:30 pm'), ('Demo: School art week', 25, 29, 'Mornings'), ('Demo: Instagram live', 0, None, '7 pm'),
      ('Demo: Pay studio rent', 19, None, None), ('Demo: Craft fair in Bengaluru', 45, 46, 'All day')]
sql.append('-- calendar events: today, past, upcoming, several days long, with and without a time')
sql.append(ins('events', ['id', 'title', 'note', 'on_date', 'end_date', 'time_text'], [{'id': did(0xd, i + 1), 'title': t, 'note': 'Dummy event' if i % 2 else None, 'on_date': D(a), 'end_date': D(b) if b else None, 'time_text': tm} for i, (t, a, b, tm) in enumerate(EV)]))
TD = [('Demo: Order more sumi ink', 2, False), ('Demo: Reply to wedding enquiry', -1, False), ('Demo: Post workshop photos', 0, False), ('Demo: Renew domain', 30, False), ('Demo: Call the framer', None, False),
      ('Demo: Update class timings', 5, False), ('Demo: Print certificates', -5, True), ('Demo: Pack Rohan order', -2, True), ('Demo: Buy tea for the studio', None, True), ('Demo: Send invoice to Demo Public School', 3, False),
      ('Demo: Book venue in Bengaluru', 14, False), ('Demo: Clean brushes', -10, True)]
sql.append('-- to-dos: overdue, due today, upcoming, no date, done')
sql.append(ins('todos', ['id', 'title', 'note', 'due_on', 'done', 'done_at'], [{'id': did(0xe, i + 1), 'title': t, 'note': 'Dummy to-do' if i % 3 == 0 else None, 'due_on': D(d) if d is not None else None, 'done': dn, 'done_at': TS(-1, '18:00') if dn else None} for i, (t, d, dn) in enumerate(TD)]))

# ---------- invoices (15), quotations and credit notes, and payments ----------
def calc(items, discount, gst_on):  # same maths as lib/invoiceCalc.js
    lines = [dict(i, net=round(i['qty'] * i['unit_paise'])) for i in items]; sub = sum(l['net'] for l in lines); disc = min(max(discount, 0), sub); left = disc
    for k, l in enumerate(lines):
        share = left if k == len(lines) - 1 else round(disc * (l['net'] / sub if sub else 0)); left -= share
        l['taxable'] = max(0, l['net'] - share); l['rate'] = (l['gst_rate'] or 0) if gst_on else 0; l['gst'] = round(l['taxable'] * l['rate'] / 100)
    taxable = sum(l['taxable'] for l in lines); gst = sum(l['gst'] for l in lines)
    return sub, disc, gst, taxable + gst
it = lambda d, q_, p, r=18, h='': {'desc': d, 'qty': q_, 'unit_paise': p, 'gst_rate': r, 'hsn': h}
INV = [  # (type, no, customer, items, discount, gst, status, issue, due, against, payments [(amount or 'rest', days ago, method)], notes)
    ('invoice', 'DEMO/2026-27/001', 0, [it('Wedding invitation design', 1, 1500000, 18, '998391'), it('Printed invitations', 250, 4000, 12, '4911')], 0, True, 'paid', -30, -15, None, [('rest', -20, 'bank')], 'Thank you for your business.'),
    ('invoice', 'DEMO/2026-27/002', 1, [it('Corporate lettering workshop (30 people)', 1, 4500000, 18, '999293')], 500000, True, 'sent', -12, 3, None, [(2000000, -10, 'bank'), (500000, -5, 'upi')], 'Advance received. Balance on the day.'),   # part paid
    ('invoice', 'DEMO/2026-27/003', 2, [it('Live calligraphy at store launch', 4, 600000)], 0, False, 'sent', -40, -10, None, [(200000, -30, 'cash')], None),   # overdue, small part paid
    ('invoice', 'DEMO/2026-27/004', 3, [it('Custom name cards', 120, 2500), it('Envelope addressing', 120, 3000)], 0, False, 'draft', -1, 14, None, [], None),
    ('invoice', 'DEMO/2026-27/005', 4, [it('Logo lettering', 1, 2500000, 18, '998391')], 0, True, 'paid', -60, -45, None, [(1000000, -58, 'upi'), (1000000, -50, 'upi'), ('rest', -44, 'bank')], 'Paid in three parts.'),
    ('invoice', 'DEMO/2026-27/006', 5, [it('Signage hand lettering', 2, 800000)], 0, False, 'cancelled', -25, -5, None, [], 'Cancelled by the client.'),
    ('invoice', 'DEMO/2026-27/007', 6, [it('School art week, 5 sessions', 5, 400000, 18, '999293')], 0, True, 'sent', -3, 27, None, [(500000, -2, 'cash'), (500000, -1, 'upi')], None),
    ('invoice', 'DEMO/2026-27/008', 7, [it('Gift hampers with lettered tags', 40, 45000, 12)], 200000, True, 'paid', -15, 0, None, [('rest', -14, 'card')], None),
    ('invoice', 'DEMO/2026-27/009', 8, [it('Mural sketch consultation', 1, 300000)], 0, False, 'sent', -5, 10, None, [(100000, -2, 'upi')], 'Token advance paid.'),
    ('quotation', 'DEMO-Q/2026-27/001', 9, [it('Bulk invitation printing', 500, 3500, 12, '4911')], 0, True, 'sent', -4, 26, None, [], 'Prices valid for 30 days.'),
    ('quotation', 'DEMO-Q/2026-27/002', 10, [it('Brand collaboration: Diwali packaging', 1, 6000000, 18)], 0, True, 'accepted', -20, 10, None, [], None),
    ('quotation', 'DEMO-Q/2026-27/003', 11, [it('Kids camp for 40 children', 40, 250000)], 1000000, False, 'draft', 0, 30, None, [], None),
    ('quotation', 'DEMO-Q/2026-27/004', 12, [it('Wall art', 1, 1800000)], 0, False, 'cancelled', -50, -20, None, [], 'Client went with another artist.'),
    ('credit_note', 'DEMO-CN/2026-27/001', 7, [it('Two damaged hampers', 2, 45000, 12)], 0, True, 'paid', -10, None, 'DEMO/2026-27/008', [], 'Refunded by card.'),
    ('credit_note', 'DEMO-CN/2026-27/002', 0, [it('Ten invitations not delivered', 10, 4000, 12)], 0, True, 'sent', -2, None, 'DEMO/2026-27/001', [], 'To be adjusted on the next order.')]
irows, prows, ledger_inv = [], [], []; pn = 0
for i, (ty, no, pi, items, disc, gst_on, st, issue, due, against, pays, notes) in enumerate(INV):
    sub, d, gst, total = calc(items, disc, gst_on); iid = did(0xf, i + 1); paid_sum = 0; last = None
    for (amt, ago, meth) in pays:
        a = total - paid_sum if amt == 'rest' else amt; paid_sum += a; pn += 1; pid = did(0x10, pn); last = (ago, meth)
        prows.append({'id': pid, 'invoice_id': iid, 'amount_paise': a, 'paid_on': D(ago), 'method': meth, 'note': 'Advance' if pn % 3 == 1 and amt != 'rest' else None})
        ledger_inv.append({'entry_date': D(ago), 'kind': 'in', 'category': 'Services', 'description': f"Invoice {no}{' (part payment)' if a < total else ''}", 'amount_paise': a, 'gst_paise': round(gst * a / total) if total else 0, 'method': meth, 'party': nm(pi), 'source': 'invoice', 'source_id': pid})
    refund = ty == 'credit_note' and st == 'paid'
    if refund: ledger_inv.append({'entry_date': D(issue), 'kind': 'out', 'category': 'Refunds', 'description': f'Credit note {no} against {against}', 'amount_paise': total, 'gst_paise': gst, 'method': 'card', 'party': nm(pi), 'source': 'invoice', 'source_id': iid})
    n, e, p, city, state, pin = PEOPLE[pi]
    irows.append({'id': iid, 'doc_type': ty, 'invoice_no': no, 'against_no': against, 'issue_date': D(issue), 'due_date': D(due) if due is not None else None, 'customer_name': n, 'customer_email': em(pi), 'customer_phone': ph(pi),
                  'customer_address': f'{10 + pi}, Test Street\n{city} - {pin}\n{state}', 'customer_gstin': '33ABCDE1234F1Z5' if gst_on and i % 2 == 0 else None, 'items': Json(items), 'discount_paise': d, 'gst_enabled': gst_on, 'gst_rate': 18,
                  'subtotal_paise': sub, 'gst_paise': gst, 'total_paise': total, 'notes': notes, 'status': st, 'paid_on': D(last[0]) if st == 'paid' and last else D(issue) if refund else None,
                  'payment_method': last[1] if st == 'paid' and last else 'card' if refund else None, 'last_reminder_at': TS(-3, '10:00') if no.endswith('003') and ty == 'invoice' else None})
sql.append('-- invoices: paid, part paid, paid in three parts, overdue, draft, cancelled, with and without GST and discount; quotations (sent, accepted, draft, cancelled); credit notes (refunded and not)')
sql.append(ins('invoices', list(irows[0].keys()), irows))
sql.append('-- payments received against those invoices (full and part payments)')
sql.append(ins('invoice_payments', list(prows[0].keys()), prows))

# ---------- accounts ----------
MAN = [('in', 'Custom invitations', 'Demo: Name cards paid in cash', 450000, 0, 'cash', 'Walk-in customer', -33), ('in', 'Collaborations', 'Demo: Brand collaboration fee', 2500000, 381356, 'bank', 'Demo Sweets Co.', -18),
       ('in', 'Other income', 'Demo: Sold old easels', 300000, 0, 'upi', 'Neighbour', -9), ('out', 'Materials and supplies', 'Demo: Paper and ink stock', 1250000, 190678, 'bank', 'Demo Art Supplies', -27),
       ('out', 'Printing', 'Demo: Workshop handouts', 180000, 0, 'upi', 'Demo Print Shop', -22), ('out', 'Venue rent', 'Demo: Bengaluru venue', 800000, 0, 'bank', 'The Bangalore Local', -21),
       ('out', 'Teacher or helper pay', 'Demo: Assistant for kids camp', 600000, 0, 'upi', 'Helper', -15), ('out', 'Shipping and courier', 'Demo: India Post charges', 95000, 0, 'cash', 'India Post', -12),
       ('out', 'Marketing', 'Demo: Instagram ads', 200000, 30508, 'card', 'Meta', -8), ('out', 'Software and subscriptions', 'Demo: Website hosting', 150000, 22881, 'card', 'Hosting company', -6),
       ('out', 'Equipment', 'Demo: New light box', 450000, 68644, 'upi', 'Demo Electronics', -4), ('out', 'Utilities', 'Demo: Studio electricity', 320000, 0, 'bank', 'TNEB', -2),
       ('out', 'Travel', 'Demo: Cab to Bengaluru venue', 250000, 0, 'upi', 'Cab', -20), ('out', 'Taxes and fees', 'Demo: Professional tax', 125000, 0, 'bank', 'Corporation', -40)]
ledger = [{'entry_date': D(ago), 'kind': k, 'category': c, 'description': ds, 'amount_paise': a, 'gst_paise': g, 'method': m, 'party': p, 'source': 'manual', 'source_id': None} for (k, c, ds, a, g, m, p, ago) in MAN] + ledger_inv
for j, r in enumerate(ledger): r['id'] = did(0x11, j + 1)
sql.append('-- accounts: money in and out by hand in every main category, plus the invoice payments and the refund above')
sql.append(ins('ledger_entries', ['id', 'entry_date', 'kind', 'category', 'description', 'amount_paise', 'gst_paise', 'method', 'party', 'source', 'source_id'], ledger))
sql.append("""-- accounts: money in for every paid dummy order, booking and enrolment (as the website does), Razorpay fees for online ones, and refunds
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
  ('class_batches', (select count(*) from class_batches where id::text like 'dededede-%')), ('class_sessions', (select count(*) from class_sessions where id::text like 'dededede-%')),
  ('class_attendance', (select count(*) from class_attendance a join class_sessions s on s.id = a.session_id where s.id::text like 'dededede-%')),
  ('class_enrolments', (select count(*) from class_enrolments where id::text like 'dededede-%')), ('bookings', (select count(*) from bookings where id::text like 'dededede-%')),
  ('workshop_waitlist', (select count(*) from workshop_waitlist where id::text like 'dededede-%')), ('customers', (select count(*) from customers where id::text like 'dededede-%')),
  ('orders', (select count(*) from orders where id::text like 'dededede-%')), ('order_items', (select count(*) from order_items where id::text like 'dededede-%')),
  ('enquiries', (select count(*) from enquiries where id::text like 'dededede-%')), ('events', (select count(*) from events where id::text like 'dededede-%')),
  ('todos', (select count(*) from todos where id::text like 'dededede-%')), ('invoices', (select count(*) from invoices where id::text like 'dededede-%')),
  ('invoice_payments', (select count(*) from invoice_payments where id::text like 'dededede-%')), ('ledger_entries', (select count(*) from ledger_entries where id::text like 'dededede-%'))
) t(name, n);
commit;""")

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
open(os.path.join(root, 'supabase', 'dummy.sql'), 'w').write('\n\n'.join(sql) + '\n')
print('wrote supabase/dummy.sql')
