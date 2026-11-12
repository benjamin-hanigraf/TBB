import { ADDRESS_LINES } from './address.js';
// Placeholder content copied from the old site. Later this is read from the database.
export const img = (id) => `/img/${id}.webp`;

export const business = {
  name: 'Thin Black Brush',
  tagline: "The Artists' Commonroom",
  phone: '+91 99620 50962', phone2: '+91 95666 25373',
  email: 'thinblackbrush@gmail.com',
  address: ADDRESS_LINES,
  map: 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7',
  instagramHandle: 'thinblackbrush',
  instagram: 'https://www.instagram.com/thinblackbrush',
  facebook: 'https://www.facebook.com/thinblackbrush',
  whatsapp: 'https://wa.me/919962050962',
  upi: 'thinblack@ybl',
};

export const images = {
  logo: '/img/logo.png', logoLine: '/img/logo-line.png', brush: '/img/brush.png',
  invites: ['55fd8e1e6e', 'ac911ad304', '3c20fb04cd'].map(img),
  hero: img('31648a2db3'), classes_banner: img('cb028c51a9'), studio: img('cafdbd8687'), teaching: img('5c8f647552'),
  gallery: ['cbe16ef83a', 'd1065c139e', 'cafdbd8687', '31648a2db3', '6f01eba695', 'a4776a3df0'].map(img),
};

export const workshops = [
  {
    slug: 'beginners-watercolor-course', title: 'Beginners Watercolour Course',
    summary: 'A beginner-friendly course on the basics of watercolour.',
    venue: 'The Bangalore Local', address: '1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka',
    starts_at: '2026-10-31T10:00:00+05:30', price: 2300, friendPrice: 2100, capacity: 12,
    image: img('16cc08c542'),
    description: ['This class helps beginners understand watercolour as a medium.',
      'You will apply each technique as you learn it, and finish by creating your own watercolour paintings.'],
    learn: ['Introduction to watercolour as a medium', 'Techniques involved in watercolour', 'Understanding watercolour and ink'],
    includes: ['Artist grade watercolour paints (tubes)', 'Watercolour sheets', 'Round brush', 'Flat brush', 'Pencil', 'Eraser'],
    note: 'All materials are provided, and you take the basic kit home.',
  },
  {
    slug: 'modern-dip-pen-calligraphy', title: 'Modern Dip Pen Calligraphy',
    summary: 'A beginner-friendly, in-person workshop with all materials included.',
    venue: 'The Bangalore Local', address: '1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka',
    starts_at: '2026-11-01T10:00:00+05:30', price: 2300, capacity: 12,
    image: img('26928ebd04'),
    description: ['Learn the basics of calligraphy, from strokes and practice drills to uppercase and lowercase letters, numbers and connecting words.'],
    learn: ['Introduction, materials, maintenance and basic strokes', 'Letter formation and lowercase alphabets', 'Uppercase alphabets, numbers, word formation and guidelines', 'Exploring different modern calligraphy styles'],
    includes: ['Oblique holder', 'Speedball calligraphy ink', 'Leonardt 40 nib', 'Calligraphy practice sheets', 'Alphabet sheet'],
    note: 'The kit is included in the price.',
  },
];

export const classes = [
  { n: 1, slug: 'handwriting-1', sessions: 8, track: 'Handwriting', tone: 0, title: 'Basics of Handwriting', level: 'Level 1', text: 'Foundational handwriting skills, including proper letter formation and legibility.', covers: ['Letter formation', 'Legibility'], price: 6000 },
  { n: 2, slug: 'handwriting-2', sessions: 8, track: 'Handwriting', tone: 0, title: 'Basics of Handwriting', level: 'Level 2', text: 'Builds on the basics with decorative writing techniques.', covers: ['Letter formation', 'Legibility', 'Faux calligraphy'], price: 6000 },
  { n: 3, slug: 'calligraphy-1', sessions: 8, track: 'Handwriting + Calligraphy', tone: 1, title: 'Handwriting and Calligraphy', level: 'Level 1', text: 'Combines handwriting improvement with an introduction to decorative lettering.', covers: ['Handwriting improvement', 'Faux calligraphy', 'Brush lettering'], price: 7500 },
  { n: 4, slug: 'calligraphy-2', sessions: 8, track: 'Handwriting + Calligraphy', tone: 1, title: 'Handwriting and Calligraphy', level: 'Level 2', text: 'Takes your skills further, with advanced techniques and tools.', covers: ['Handwriting improvement', 'Faux calligraphy', 'Brush lettering', 'Modern dip pen calligraphy'], price: 10000 },
];

export const products = [
  { slug: '2024-maroon-planner', title: '2024 Maroon Planner', price: 800, stock: 10,
    images: ['4aab591127', 'e36ba5ccbd', '446e583c2f', '89b568b6e9', '53620e4909', '3557599996', 'f6d88b9621'].map(img),
    text: 'A daily planner that fits into any bag, to help you plan, track and set goals for the next 365 days.',
    details: ['A daily dotted planner', 'Monthly grid pages', '2023, 2024 and 2025 calendar pages', 'Daily dotted spread', 'Trackers', 'Vision boards every 3 months', 'Blind emboss cover', '80 GSM natural shade paper, 300 GSM cover', 'A5 size, 160 pages'],
    shipping: 'Pre-orders are open. Planners ship 8 days after your order.' },
  { slug: 'calligraphy-guideline-book', title: 'Landscape Calligraphy Guideline Book', price: 450, stock: 10,
    images: ['33e1b05fd6', '14db4f6757', '49e5145119', 'bc78b732e5'].map(img),
    text: "A beginner's best friend. These guidelines suit Modern, Copperplate, Spencerian and Brush Lettering.",
    details: ['A4 landscape, with tearable sheets', '50 pages', '55° slant', '100 gsm smooth calligraphy paper'] },
  { slug: 'pre-order-pattern-oblique-holder', title: 'Pattern Oblique Holder', preorder: true, price: 1650, stock: 0,
    images: ['42e66b73f9', '474bc3b535'].map(img),
    text: "Custom made to order and ready within 2 weeks. Handcrafted by our local artisans, these regular oblique holders work with all nibs.",
    details: ['Length: 18 cm'] },
  { slug: 'wooden-oblique-holder', title: 'Wooden Oblique Holder', price: 1000, stock: 0,
    images: ['92614d0a22', '87e346a291'].map(img),
    text: 'Handcrafted by our local artisans, and a joy to work with. These regular oblique holders work with all nibs.',
    details: ['Length: 20 cm'] },
  { slug: 'wooden-oblique-holder-circle', title: 'Wooden Oblique Holder (Circle)', price: 1350, stock: 0,
    images: ['086f6a6e37', '7f7b448ab8'].map(img),
    text: 'Handcrafted by our local artisans, and a joy to work with. These regular oblique holders work with all nibs.',
    details: ['Length: 20 cm'] },
];
export const returnPolicy = 'Every product is handmade from scratch, so slight differences are natural. Goods once sold cannot be taken back. If you have any questions, get in touch and we will do our best to help.';

export const collaborators = [
  { name: 'IIT Madras', img: img('0f81005210') }, { name: 'Teach For India', img: img('65827d2dd3') },
  { name: 'Bombay Shirt Company', img: img('5d3531b4c4') }, { name: 'Bhumi', img: img('4480b82041') },
  { name: 'Think Music', img: img('995871d30d') }, { name: 'The Glass Box', img: img('bb92c0e6df') },
  { name: 'CaratLane', img: img('e4d0ea11bc') }, { name: 'HackerEarth', img: img('e5bfcf8182') },
  { name: 'Paperflite', img: img('fae46dc1fe') },
];
export const memories = [
  { src: img('46fb7712d6'), cap: 'A session at IIT Madras' }, { src: img('b6a47a5a0d'), cap: 'Teach For India' },
  { src: img('0f9b608e69'), cap: 'Workshop moments' }, { src: img('80436c064f'), cap: 'In the press' },
];

export const rupees = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const isPast = (w) => new Date(w.starts_at) < new Date();
export const when = (d) => fmtDate(d);
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
