// Reads live content from Supabase. Falls back to built-in content if the database is unreachable.
import { CONTACT_LINES } from './address';
import { returnPolicy, business as fbBusiness, workshops as fbWorkshops, products as fbProducts, images as fbImages, classes as fbClasses, img } from './data';
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function rest(path) {
  if (!URL_ || !KEY) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, next: { revalidate: 60 } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
export const photo = (p) => !p ? '' : /^(\/|https?:)/.test(p) ? p : `${URL_}/storage/v1/object/public/media/${p}`;

const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const earlyOn = (w) => w.early_price_paise != null && w.early_until && w.early_until >= todayIST();
const earlyBird = (w) => (earlyOn(w) ? { earlyUntil: w.early_until, regularPrice: w.price_paise / 100 } : {});
export const GOOD_TO_KNOW = ['Please arrive on time.', 'Bookings are confirmed on payment.', 'Tickets are non-refundable, but can be transferred to someone else with prior notice to the TBB team.'];
const lines = (t) => String(t || '').split('\n').map((l) => l.trim()).filter(Boolean);
/** The shop and workshop notes the owner writes once in Settings. A product or workshop without its own note uses these. */
async function storeNotes() { const rows = await rest('settings?select=value&key=eq.store'); const s = rows?.[0]?.value || {}; return { shipping: s.shipping_note || '', returns: s.return_note || returnPolicy, good: lines(s.good_to_know).length ? lines(s.good_to_know) : GOOD_TO_KNOW }; }
export async function getWorkshops() {
  const [rows, notes] = await Promise.all([rest('workshops_public?select=*&order=starts_at.asc'), storeNotes()]);
  if (!rows) return fbWorkshops;
  return rows.filter(w => w.status !== 'cancelled').map(w => ({      // a cancelled workshop is never shown on the website: not in lists, not by direct link, not in the sitemap
    slug: w.slug, title: w.title, summary: w.summary, venue: w.venue_name, address: w.venue_address, map: w.map_link,
    starts_at: w.starts_at, ends_at: w.ends_at, kind: w.kind, gstMode: w.gst_mode || 'none', ...earlyBird(w), price: (earlyOn(w) ? w.early_price_paise : w.price_paise) / 100, friendPrice: w.friend_price_paise ? w.friend_price_paise / 100 : null,
    capacity: w.capacity, seatsLeft: w.seats_left, cancelled: w.status === 'cancelled', image: photo(w.images?.[0] || w.image_path), images: (w.images?.length ? w.images : [w.image_path]).filter(Boolean).map(photo),
    description: (w.description || '').split('\n\n').filter(Boolean), learn: w.learn || [], includes: w.includes || [], note: w.note || '', goodToKnow: notes.good,
  }));
}
export async function getWorkshop(slug) { return (await getWorkshops()).find(w => w.slug === slug); }

export async function getProducts() {
  const [rows, notes] = await Promise.all([rest('products?select=*&active=eq.true&order=sort_order.asc,created_at.desc'), storeNotes()]);
  if (!rows) return fbProducts;
  return rows.map(p => ({
    slug: p.slug, title: p.title, price: p.price_paise / 100, gstMode: p.gst_mode || 'none', stock: p.stock, preorder: p.allow_preorder,
    images: (p.images || []).map(photo), text: p.description, details: p.details || [], shipping: p.shipping_note || notes.shipping, returns: p.return_note || notes.returns,
  }));
}
export async function getProduct(slug) { return (await getProducts()).find(p => p.slug === slug); }

// editable website photos: she changes these from her app
export async function getImages() {
  const rows = await rest('site_images?select=key,path');
  const m = { ...fbImages }; const by = {}; (rows || []).forEach((r) => { by[r.key] = photo(r.path); m[r.key] = by[r.key]; });
  m.hero = fbImages.hero; m.classes_banner = fbImages.classes_banner;   // fixed in the code, so a database row can never swap them back
  m.gallery = [1, 2, 3, 4, 5, 6].map((n, i) => by[`gallery_${n}`] || fbImages.gallery[i]);
  m.invites = [1, 2, 3].map((n, i) => by[`invite_${n}`] || fbImages.invites[i]);
  m.memorySrc = [1, 2, 3, 4].map((n, i) => by[`memory_${n}`] || null);
  return m;
}

export async function getClasses() {
  const [rows, types] = await Promise.all([rest('class_levels?select=*&active=eq.true&order=sort_order.asc'), rest('class_types?select=name,sort_order&order=sort_order.asc')]);
  if (!rows) return fbClasses;
  const order = (types || []).map((t) => t.name);
  return rows.map((c, i) => ({ n: i + 1, slug: c.slug, id: c.id, track: c.track, tone: Math.max(0, order.indexOf(c.track)) % 4, gstMode: c.gst_mode || 'none', title: c.title, level: c.level, text: c.description, covers: c.covers || [], price: c.price_paise / 100, sessions: c.sessions }));
}

/** Studio details come from Settings in the Manager (one place to change them); the built-in values are only a fallback. */
export async function getBusiness() {
  const rows = await rest('settings?select=value&key=eq.business'); const s = rows?.[0]?.value || {}; const b = { ...fbBusiness };
  for (const k of ['name', 'phone', 'phone2', 'email', 'map', 'instagram', 'facebook', 'upi']) if (s[k]) b[k] = s[k];
  if (s.instagram) b.instagramHandle = String(s.instagram).replace(/\/+$/, '').split('/').pop().replace(/^@/, '');
  if (s.whatsapp) b.whatsapp = `https://wa.me/${String(s.whatsapp).replace(/\D/g, '')}`;
  const lines = (t) => String(t || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines(s.address).length) b.address = lines(s.address);
  b.contactAddress = lines(s.address_contact).length ? lines(s.address_contact) : CONTACT_LINES;
  return b;
}
