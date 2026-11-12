// What each spreadsheet (CSV) looks like for each list, and how every row is checked and cleaned before saving.
import { RULES, titleCase, cleanEmail, cleanPhone, cleanPin } from './format.js';
import { rupeesToPaise } from './accounting.js';
import { yes, asList, asDate, asTime, istISO, norm } from './csv.js';
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const sent = (s) => RULES.sentence.done(String(s || '').trim());
const pick = (o, ...names) => { for (const n of names) { const v = o[norm(n)]; if (v !== undefined && v !== '') return v; } return ''; };
const bool = (v, dflt) => (v === '' ? dflt : yes(v));
const col = (label, ex, req = false, hint = '') => ({ label, ex, req, hint });

export const SPECS = {
  products: {
    title: 'products', noun: 'product', table: 'products', onConflict: 'slug', file: 'products-template.csv',
    columns: [col('Name', 'Wooden Oblique Holder', true), col('Price', '1000', true, 'In rupees'), col('In stock', '5'), col('Pre-order', 'no', false, 'yes or no'), col('Show in store', 'yes', false, 'yes or no'), col('GST', 'none', false, 'none, add (18% on top) or included'),
      col('Description', 'Handcrafted by our local artisans.'), col('Details', 'Length: 20 cm | Hand-turned wood', false, 'Separate points with |'), col('Shipping note', ''), col('Return note', ''), col('Photos', '', false, 'Photo web addresses, separated by |'), col('Code', '', false, 'Leave empty for new products')],
    convert(o) {
      const title = RULES.title.done(pick(o, 'Name', 'Title', 'Product name')); if (!title) return { error: 'Name is missing' };
      const price = rupeesToPaise(pick(o, 'Price')); if (!(price > 0)) return { error: 'Price is missing or not a number' };
      return { row: { slug: slugify(pick(o, 'Code') || title), title, price_paise: price, gst_mode: /^add/i.test(pick(o, 'GST')) ? 'add' : /^incl/i.test(pick(o, 'GST')) ? 'included' : 'none', stock: Math.max(0, parseInt(pick(o, 'In stock', 'Stock'), 10) || 0), allow_preorder: bool(pick(o, 'Pre-order', 'Preorder'), false), active: bool(pick(o, 'Show in store', 'Active'), true),
        description: sent(pick(o, 'Description')) || null, details: asList(pick(o, 'Details')), shipping_note: sent(pick(o, 'Shipping note')) || null, return_note: sent(pick(o, 'Return note')) || null, images: asList(pick(o, 'Photos', 'Images')) } };
    },
    show: (r) => `${r.title} · ₹${r.price_paise / 100} · ${r.stock} in stock`,
  },
  workshops: {
    title: 'workshops', noun: 'workshop', table: 'workshops', onConflict: 'slug', file: 'workshops-template.csv',
    columns: [col('Title', 'Beginners Watercolour Course', true), col('Date', '25/12/2026', true, 'DD/MM/YYYY'), col('Time', '10:00 AM'), col('Venue', 'Thin Black Brush Studio', true), col('Venue address', '2nd Floor, Berachah Building, 13/7, 1st Cross St, Trustpuram, Kodambakkam, Chennai - 600024'),
      col('Price', '2300', true, 'Per person, in rupees'), col('Friend price', '2100', false, 'Per person when 2 or more book'), col('Seats', '12'), col('Status', 'draft', false, 'draft or published'), col('Summary', 'A beginner-friendly course.'), col('Description', ''),
      col('What participants learn', 'Basic strokes | Colour mixing', false, 'Separate points with |'), col('Kit includes', 'Paints | Brushes | Paper', false, 'Separate items with |'), col('Note', ''), col('Photo', '', false, 'Photo web address'), col('Code', '', false, 'Leave empty for new workshops')],
    convert(o) {
      const title = RULES.title.done(pick(o, 'Title', 'Name')); if (!title) return { error: 'Title is missing' };
      const date = asDate(pick(o, 'Date')); if (!date) return { error: 'Date must look like 25/12/2026' };
      const time = asTime(pick(o, 'Time')); if (!time) return { error: 'Time must look like 10:30 AM' };
      const venue = titleCase(pick(o, 'Venue')); if (!venue) return { error: 'Venue is missing' };
      const price = rupeesToPaise(pick(o, 'Price')); if (!(price >= 0) || pick(o, 'Price') === '') return { error: 'Price is missing or not a number' };
      const friend = pick(o, 'Friend price'); const status = /^pub/i.test(pick(o, 'Status')) ? 'published' : 'draft';
      return { row: { slug: slugify(pick(o, 'Code') || `${title}-${date.replace(/-/g, '')}`), title, kind: 'workshop', summary: sent(pick(o, 'Summary')) || null, description: sent(pick(o, 'Description')) || null, venue_name: venue, venue_address: titleCase(pick(o, 'Venue address')) || null,
        starts_at: istISO(date, time), price_paise: price, friend_price_paise: friend ? rupeesToPaise(friend) : null, capacity: Math.max(1, parseInt(pick(o, 'Seats'), 10) || 12), includes: asList(pick(o, 'Kit includes', 'Includes')), learn: asList(pick(o, 'What participants learn', 'What students learn', 'Learn')), note: sent(pick(o, 'Note')) || null, image_path: asList(pick(o, 'Photo'))[0] || null, status } };
    },
    show: (r) => `${r.title} · ${r.starts_at.slice(0, 10)} · ${r.venue_name} · ₹${r.price_paise / 100}`,
  },
  classes: {
    title: 'class levels', noun: 'class level', table: 'class_levels', onConflict: 'slug', file: 'classes-template.csv',
    columns: [col('Course name', 'Basics of Handwriting', true), col('Level', 'Level 1', true), col('Type', 'Handwriting', false, 'Any type name, for example Handwriting'), col('Price', '6000', true, 'For the whole course, in rupees'), col('Number of classes', '8'),
      col('Description', 'Foundational handwriting skills.'), col('Covers', 'Letter formation | Legibility', false, 'Separate points with |'), col('Show on website', 'yes', false, 'yes or no'), col('Order', '1', false, 'Smaller numbers come first'), col('Code', '', false, 'Leave empty for new levels')],
    convert(o) {
      const title = RULES.title.done(pick(o, 'Course name', 'Title', 'Name')); if (!title) return { error: 'Course name is missing' };
      const level = RULES.title.done(pick(o, 'Level')); if (!level) return { error: 'Level is missing' };
      const price = rupeesToPaise(pick(o, 'Price')); if (!(price >= 0) || pick(o, 'Price') === '') return { error: 'Price is missing or not a number' };
      const track = titleCase(pick(o, 'Type')) || 'Handwriting';
      return { row: { slug: slugify(pick(o, 'Code') || `${track}-${level}-${title}`), track, title, level, description: sent(pick(o, 'Description')) || null, covers: asList(pick(o, 'Covers')), price_paise: price, sessions: Math.max(1, parseInt(pick(o, 'Number of classes', 'Sessions'), 10) || 8), active: bool(pick(o, 'Show on website', 'Active'), true), sort_order: parseInt(pick(o, 'Order'), 10) || 0 } };
    },
    show: (r) => `${r.title}, ${r.level} · ₹${r.price_paise / 100} · ${r.sessions} classes`,
  },
  invoices: {
    title: 'invoices', noun: 'invoice', table: 'invoices', onConflict: 'invoice_no', file: 'invoices-template.csv',
    columns: [col('Invoice no', 'TBB/2026-27/001', true), col('Date', '25/12/2026', true, 'DD/MM/YYYY'), col('Customer', 'Anita Rao', true), col('Email', ''), col('Phone', ''), col('Address', ''), col('Amount', '2300', true, 'Total in rupees'), col('Status', 'paid', false, 'paid or unpaid. Imported invoices are not added to the accounts')],
    convert(o) {
      const no = pick(o, 'Invoice no', 'Invoice number', 'Number').trim(); if (!no) return { error: 'Invoice number is missing' };
      const date = asDate(pick(o, 'Date')); if (!date) return { error: 'Date must look like 25/12/2026' };
      const name = titleCase(pick(o, 'Customer', 'Name')); if (!name) return { error: 'Customer is missing' };
      const amt = rupeesToPaise(pick(o, 'Amount', 'Total')); if (!(amt > 0)) return { error: 'Amount is missing or not a number' };
      const paid = /^paid/i.test(pick(o, 'Status')); const email = cleanEmail(pick(o, 'Email'));
      return { row: { invoice_no: no, issue_date: date, customer_name: name, customer_email: email || null, customer_phone: pick(o, 'Phone') ? cleanPhone(pick(o, 'Phone')) : null, customer_address: titleCase(pick(o, 'Address')) || null,
        items: [{ desc: 'Imported invoice', qty: 1, unit_paise: amt, gst_rate: 0, hsn: '' }], discount_paise: 0, gst_enabled: false, gst_rate: 0, subtotal_paise: amt, gst_paise: 0, total_paise: amt, status: paid ? 'paid' : 'draft', paid_on: paid ? date : null } };
    },
    show: (r) => `${r.invoice_no} · ${r.customer_name} · ₹${r.total_paise / 100} · ${r.status === 'paid' ? 'paid' : 'unpaid'}`,
  },
  customers: {
    title: 'customers', noun: 'customer', table: 'customers', onConflict: 'email', file: 'customers-template.csv',
    columns: [col('Name', 'Anita Rao', true), col('Email', 'anita@example.com', false, 'Used to avoid duplicates'), col('Phone', '98765 43210'), col('Address line 1', '12 Lake View Road'), col('Address line 2', ''), col('City', 'Chennai'), col('State', 'Tamil Nadu'), col('Pincode', '600024'), col('Notes', ''),
      col('Source', 'wix', false, 'wix, manual or import'), col('Marketing OK', 'no', false, 'yes only if they agreed to news')],
    convert(o) {
      const name = titleCase(pick(o, 'Name', 'Full name', 'Customer')) || titleCase([pick(o, 'First name'), pick(o, 'Last name')].filter(Boolean).join(' ')); if (!name) return { error: 'Name is missing' };
      const email = cleanEmail(pick(o, 'Email', 'Email address')); if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return { error: `Email "${email}" does not look right` };
      const src = pick(o, 'Source').toLowerCase(); const phone = pick(o, 'Phone', 'Mobile');
      return { row: { name, email: email || null, phone: phone ? cleanPhone(phone) : null, address_line1: titleCase(pick(o, 'Address line 1', 'Address')) || null, address_line2: titleCase(pick(o, 'Address line 2')) || null, city: titleCase(pick(o, 'City')) || null, state: titleCase(pick(o, 'State')) || null,
        pincode: cleanPin(pick(o, 'Pincode', 'Zip')) || null, notes: sent(pick(o, 'Notes')) || null, source: ['wix', 'manual', 'import', 'website'].includes(src) ? src : 'import', marketing_opt_in: yes(pick(o, 'Marketing OK', 'Marketing')) } };
    },
    show: (r) => `${r.name}${r.email ? ` · ${r.email}` : ''}${r.phone ? ` · ${r.phone}` : ''}`,
  },
};
/** run a whole sheet through a spec: returns { rows, errors:[{line,message}] } with repeated codes/emails merged (last one wins) */
export function readSheet(spec, objects) {
  const rows = [], errors = [];
  objects.forEach((o, i) => { const r = spec.convert(o); if (r.error) errors.push({ line: i + 2, message: r.error }); else rows.push(r.row); });
  const key = spec.onConflict, seen = new Map(); rows.forEach((r, i) => { if (r[key]) seen.set(r[key], i); });
  return { rows: rows.filter((r, i) => !r[key] || seen.get(r[key]) === i), errors };
}
