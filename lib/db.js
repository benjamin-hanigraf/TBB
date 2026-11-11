// Reads live content from Supabase. Falls back to built-in content if the database is unreachable.
import { workshops as fbWorkshops, products as fbProducts, images as fbImages, img } from './data';
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

export async function getWorkshops() {
  const rows = await rest('workshops_public?select=*&order=starts_at.asc');
  if (!rows) return fbWorkshops;
  return rows.map(w => ({
    slug: w.slug, title: w.title, summary: w.summary, venue: w.venue_name, address: w.venue_address, map: w.map_link,
    starts_at: w.starts_at, price: w.price_paise / 100, friendPrice: w.friend_price_paise ? w.friend_price_paise / 100 : null,
    capacity: w.capacity, seatsLeft: w.seats_left, cancelled: w.status === 'cancelled', image: photo(w.image_path),
    description: (w.description || '').split('\n\n').filter(Boolean), learn: w.learn || [], includes: w.includes || [], note: w.note || '',
  }));
}
export async function getWorkshop(slug) { return (await getWorkshops()).find(w => w.slug === slug); }

export async function getProducts() {
  const rows = await rest('products?select=*&active=eq.true&order=sort_order.asc');
  if (!rows) return fbProducts;
  return rows.map(p => ({
    slug: p.slug, title: p.title, price: p.price_paise / 100, stock: p.stock, preorder: p.allow_preorder,
    images: (p.images || []).map(photo), text: p.description, details: p.details || [], shipping: p.shipping_note,
  }));
}
export async function getProduct(slug) { return (await getProducts()).find(p => p.slug === slug); }

// editable website photos: she changes these from her app
export async function getImages() {
  const rows = await rest('site_images?select=key,path');
  const m = { ...fbImages };
  (rows || []).forEach(r => { m[r.key] = photo(r.path); });
  return m;
}
