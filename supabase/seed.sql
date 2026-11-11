-- 1. extra columns the pages need
alter table workshops add column if not exists learn text[] default '{}';
alter table workshops add column if not exists note text;
drop view if exists workshops_public;
create view workshops_public with (security_invoker = false) as
select w.*, (w.starts_at < now()) as is_past,
  greatest(w.capacity - coalesce((select sum(b.seats) from bookings b
     where b.workshop_id = w.id and b.status in ('paid','pending')
       and (b.status = 'paid' or b.created_at > now() - interval '30 minutes')),0),0) as seats_left
from workshops w where w.status in ('published','cancelled');
grant select on workshops_public to anon, authenticated;

-- 2. placeholder workshops (from the old site)
insert into workshops (slug,title,summary,description,venue_name,venue_address,starts_at,price_paise,friend_price_paise,capacity,includes,learn,note,image_path,status) values
('beginners-watercolor-course','Beginners Watercolor Course','A beginner friendly course to understand the basics of watercolour.',
 E'The class has been constructed to help a beginner understand watercolour as a medium.\n\nTechniques learnt will be applied throughout the class to gain hands-on experience. At the end you will create your own watercolour paintings.',
 'The Bangalore Local','1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka','2026-10-31 10:00+05:30',230000,210000,12,
 array['Artist grade watercolour paints (tubes)','Watercolor sheets','Round brush','Flat brush','Pencil','Eraser'],
 array['Introduction to watercolour as a medium','Techniques involved in watercolour','Understanding watercolour and ink'],
 'All materials are provided and you take the basic kit home.','/img/16cc08c542.webp','published'),
('modern-dip-pen-calligraphy','Modern Dip Pen Calligraphy','A beginner friendly workshop, in-person course inclusive of all materials.',
 'Learn the basics of calligraphy, from basic strokes and practice drills to letter formation (uppercase and lowercase), numbers and connecting words.',
 'The Bangalore Local','1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka','2026-11-01 10:00+05:30',230000,null,12,
 array['Oblique holder','Speedball Calligraphy Ink','Leonardt 40 nib','Calligraphy practice sheets','Alphabet sheet'],
 array['Section 1 - Introduction, materials and maintenance, basic strokes','Section 2 - Letter formation, lowercase alphabets','Section 3 - Uppercase alphabets, numbers, word formation, guidelines','Section 4 - Exploring different modern calligraphy styles'],
 'The workshop is inclusive of the kit.','/img/26928ebd04.webp','published')
on conflict (slug) do nothing;

-- 3. products
insert into products (slug,title,description,details,price_paise,stock,images,shipping_note,sort_order) values
('2024-maroon-planner','2024 Maroon Planner','A daily planner made to fit into any bag of yours. It will help you plan, track and set goals for the next 365 days.',
 array['A daily dotted planner','Monthly grid pages','2023, 2024 and 2025 calendar pages','Daily dotted spread','Trackers','Vision boards every 3 months','Blind emboss cover','80 GSM natural shade paper, 300 GSM cover','A5 size, 160 pages'],
 80000,10,array['/img/4aab591127.webp','/img/e36ba5ccbd.webp','/img/446e583c2f.webp','/img/89b568b6e9.webp','/img/53620e4909.webp','/img/3557599996.webp','/img/f6d88b9621.webp'],
 'Pre-orders for the 2024 planners are on! Planners will be shipped after 8 days.',1),
('calligraphy-guideline-book','Landscape Calligraphy Guideline Book',E'A beginner''s best friend. These guidelines are perfect for Modern, Copperplate, Spencerian and Brush Lettering!',
 array['A4 landscape orientation, tearable sheets','50 pages','55 degree slant','100 gsm smooth calligraphy paper'],
 45000,10,array['/img/33e1b05fd6.webp','/img/14db4f6757.webp','/img/49e5145119.webp','/img/bc78b732e5.webp'],null,2),
('pre-order-pattern-oblique-holder','Pre Order - Pattern Oblique Holder','These holders are custom made and take up to 2 weeks from the date of the order. Handcrafted by our local artisans, they work with all nibs.',
 array['Length: 18 cm'],165000,0,array['/img/42e66b73f9.webp','/img/474bc3b535.webp'],null,3),
('wooden-oblique-holder','Wooden Oblique Holder','Handcrafted by our local artisans. A pure joy to work with. Regular oblique holders that work with all nibs.',
 array['Length: 20 cm'],100000,0,array['/img/92614d0a22.webp','/img/87e346a291.webp'],null,4),
('wooden-oblique-holder-circle','Wooden Oblique Holder - Circle','Handcrafted by our local artisans. A pure joy to work with. Regular oblique holders that work with all nibs.',
 array['Length: 20 cm'],135000,0,array['/img/086f6a6e37.webp','/img/7f7b448ab8.webp'],null,5)
on conflict (slug) do nothing;

-- 4. website photos she can swap from her app
insert into site_images (key,label,path,alt) values
('hero','Home page - main photo','/img/cb028c51a9.webp','Hands practising modern calligraphy'),
('teaching','Writing classes photo','/img/5c8f647552.webp','Teaching a writing class'),
('studio','Studio photo','/img/cafdbd8687.webp','Workshop at the studio')
on conflict (key) do nothing;

-- 5. wording clean-up (run after the first seed)
update workshops set title='Beginners Watercolour Course', summary='A beginner-friendly course on the basics of watercolour.' where slug='beginners-watercolor-course';
update products set title='Pattern Oblique Holder', allow_preorder=true where slug='pre-order-pattern-oblique-holder';
update products set title='Wooden Oblique Holder (Circle)' where slug='wooden-oblique-holder-circle';
