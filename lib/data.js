// Placeholder content copied from the old site. Later this is read from the database.
export const img = (id) => `/img/${id}.webp`;

export const business = {
  name: 'Thin Black Brush',
  tagline: "The Artists' Commonroom",
  phone: '+91 99620 50962', phone2: '+91 95666 25373',
  email: 'thinblackbrush@gmail.com',
  address: ['2nd Floor - Berachah, 13/7,', '1st Cross St, Trustpuram,', 'Kodambakkam,', 'Chennai, Tamil Nadu 600024'],
  instagram: 'https://www.instagram.com/thinblackbrush',
  facebook: 'https://www.facebook.com/thinblackbrush',
  whatsapp: 'https://wa.me/919962050962',
  upi: 'thinblack@ybl',
};

export const images = {
  logo: img('c8814ca489'), wordmark: img('a1e6dfa730'),
  hero: img('cb028c51a9'), studio: img('cafdbd8687'), teaching: img('5c8f647552'),
  gallery: ['cbe16ef83a', 'd1065c139e', 'cafdbd8687', '31648a2db3', '6f01eba695', 'a4776a3df0'].map(img),
};

export const workshops = [
  {
    slug: 'beginners-watercolor-course', title: 'Beginners Watercolor Course',
    summary: 'A beginner friendly course to understand the basics of watercolour.',
    venue: 'The Bangalore Local', address: '1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka',
    starts_at: '2026-10-31T10:00:00+05:30', price: 2300, friendPrice: 2100, capacity: 12,
    image: img('16cc08c542'),
    description: ['The class has been constructed to help a beginner understand watercolour as a medium.',
      'Techniques learnt will be applied throughout the class to gain hands-on experience. At the end you will create your own watercolour paintings.'],
    learn: ['Introduction to watercolour as a medium', 'Techniques involved in watercolour', 'Understanding watercolour and ink'],
    includes: ['Artist grade watercolour paints (tubes)', 'Watercolor sheets', 'Round brush', 'Flat brush', 'Pencil', 'Eraser'],
    note: 'All materials are provided and you take the basic kit home.',
  },
  {
    slug: 'modern-dip-pen-calligraphy', title: 'Modern Dip Pen Calligraphy',
    summary: 'A beginner friendly workshop, in-person course inclusive of all materials.',
    venue: 'The Bangalore Local', address: '1st Cross Road, 1st Block Koramangala, Bengaluru, Karnataka',
    starts_at: '2026-11-01T10:00:00+05:30', price: 2300, capacity: 12,
    image: img('26928ebd04'),
    description: ['Learn the basics of calligraphy, from basic strokes and practice drills to letter formation (uppercase and lowercase), numbers and connecting words.'],
    learn: ['Section 1 - Introduction, materials and maintenance, basic strokes', 'Section 2 - Letter formation, lowercase alphabets',
      'Section 3 - Uppercase alphabets, numbers, word formation, guidelines', 'Section 4 - Exploring different modern calligraphy styles'],
    includes: ['Oblique holder', 'Speedball Calligraphy Ink', 'Leonardt 40 nib', 'Calligraphy practice sheets', 'Alphabet sheet'],
    note: 'The workshop is inclusive of the kit.',
  },
];

export const classes = [
  { n: 1, title: 'Basics of Handwriting - Level 1', price: 6000, text: 'Focuses on foundational handwriting skills, including proper letter formation and legibility.' },
  { n: 2, title: 'Basics of Handwriting - Level 2', tag: 'Includes faux calligraphy', price: 6000, text: 'Builds on basic handwriting skills with the introduction of faux calligraphy techniques for decorative writing.' },
  { n: 3, title: 'Handwriting and Calligraphy - Level 1', tag: 'Faux calligraphy and brush lettering', price: 7500, text: 'Combines handwriting improvement with introductory faux calligraphy and brush lettering techniques.' },
  { n: 4, title: 'Handwriting and Calligraphy - Level 2', tag: 'Faux calligraphy, brush lettering and modern dip pen', price: 10000, text: 'Expands on handwriting and calligraphy skills, introducing advanced techniques like modern dip pen calligraphy.' },
];

export const products = [
  { slug: '2024-maroon-planner', title: '2024 Maroon Planner', price: 800, stock: 10,
    images: ['4aab591127', 'e36ba5ccbd', '446e583c2f', '89b568b6e9', '53620e4909', '3557599996', 'f6d88b9621'].map(img),
    text: 'A daily planner made to fit into any bag of yours. It will help you plan, track and set goals for the next 365 days.',
    details: ['A daily dotted planner', 'Monthly grid pages', '2023, 2024 and 2025 calendar pages', 'Daily dotted spread', 'Trackers', 'Vision boards every 3 months', 'Blind emboss cover', '80 GSM natural shade paper, 300 GSM cover', 'A5 size, 160 pages'],
    shipping: 'Pre-orders for the 2024 planners are on! Planners will be shipped after 8 days.' },
  { slug: 'calligraphy-guideline-book', title: 'Landscape Calligraphy Guideline Book', price: 450, stock: 10,
    images: ['33e1b05fd6', '14db4f6757', '49e5145119', 'bc78b732e5'].map(img),
    text: "A beginner's best friend. These guidelines are perfect for Modern, Copperplate, Spencerian and Brush Lettering!",
    details: ['A4 landscape orientation, tearable sheets', '50 pages', '55 degree slant', '100 gsm smooth calligraphy paper'] },
  { slug: 'pre-order-pattern-oblique-holder', title: 'Pre Order - Pattern Oblique Holder', price: 1650, stock: 0,
    images: ['42e66b73f9', '474bc3b535'].map(img),
    text: "These holders are custom made and take up to 2 weeks from the date of the order. Handcrafted by our local artisans, they work with all nibs.",
    details: ['Length: 18 cm'] },
  { slug: 'wooden-oblique-holder', title: 'Wooden Oblique Holder', price: 1000, stock: 0,
    images: ['92614d0a22', '87e346a291'].map(img),
    text: 'Handcrafted by our local artisans. A pure joy to work with. Regular oblique holders that work with all nibs.',
    details: ['Length: 20 cm'] },
  { slug: 'wooden-oblique-holder-circle', title: 'Wooden Oblique Holder - Circle', price: 1350, stock: 0,
    images: ['086f6a6e37', '7f7b448ab8'].map(img),
    text: 'Handcrafted by our local artisans. A pure joy to work with. Regular oblique holders that work with all nibs.',
    details: ['Length: 20 cm'] },
];
export const returnPolicy = 'As all our products are completely handmade from scratch there might be slight differences. Goods once sold will not be taken back. In case of any queries do get in touch with us and we will do our best.';

export const collaborators = [
  { name: 'IIT Madras', img: img('0f81005210') }, { name: 'Teach For India', img: img('65827d2dd3') },
  { name: 'Bombay Shirt Company', img: img('5d3531b4c4') }, { name: 'Bhumi', img: img('4480b82041') },
  { name: 'Think Music', img: img('995871d30d') }, { name: 'The Glass Box', img: img('bb92c0e6df') },
  { name: 'Caratlane', img: img('e4d0ea11bc') }, { name: 'HackerEarth', img: img('e5bfcf8182') },
  { name: 'Paperflite', img: img('fae46dc1fe') },
];

export const rupees = (n) => '₹' + Number(n).toLocaleString('en-IN');
export const isPast = (w) => new Date(w.starts_at) < new Date();
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
