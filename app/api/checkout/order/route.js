import { q, dbReady, getSettings, userFromRequest } from '@/lib/server/db';
import { createRzpOrder, razorpayReady } from '@/lib/server/razorpay';
import { rateLimit, sameOrigin, readJson, str, isEmail, isPhone, isPin, intIn, json } from '@/lib/server/guard';
export const runtime = 'nodejs';
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'order', 8)) return json({ error: 'slow_down' }, 429);
  if (!dbReady() || !razorpayReady()) return json({ error: 'payments_not_configured' }, 503);
  let b; try { b = await readJson(req); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  const c = b.customer || {}, a = b.address || {};
  const name = str(c.name, 120), email = str(c.email).toLowerCase(), phone = str(c.phone, 20);
  const addr = { recipient: str(a.recipient || name, 120), phone: str(a.phone || phone, 20), line1: str(a.line1, 200), line2: str(a.line2, 200), city: str(a.city, 80), state: str(a.state, 80), pincode: str(a.pincode, 6) };
  if (!name || !isEmail(email) || !isPhone(phone) || !addr.line1 || !addr.city || !addr.state || !isPin(addr.pincode)) return json({ error: 'invalid_details' }, 400);
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 20) return json({ error: 'empty_cart' }, 400);
  const want = new Map(); for (const i of b.items) { const qty = intIn(i.qty, 1, 10), slug = str(i.slug, 100); if (!qty || !slug) return json({ error: 'invalid_items' }, 400); want.set(slug, (want.get(slug) || 0) + qty); }
  try {
    const slugs = [...want.keys()].map((s) => `"${s.replace(/"/g, '')}"`).join(',');
    const products = await q(`products?slug=in.(${encodeURIComponent(slugs)})&active=eq.true&select=id,slug,title,price_paise,stock,allow_preorder`);
    if (products.length !== want.size) return json({ error: 'unavailable' }, 409);
    let subtotal = 0; const lines = [];
    for (const p of products) {
      const qty = want.get(p.slug);
      if (qty > 10 || (!p.allow_preorder && p.stock < qty)) return json({ error: 'out_of_stock', item: p.title }, 409);
      subtotal += p.price_paise * qty; lines.push({ product_id: p.id, title: p.title, unit_paise: p.price_paise, qty });
    }
    const settings = await getSettings(); const ship = settings.shipping || { flat_paise: 0, free_above_paise: 0 };
    const shipping = ship.free_above_paise && subtotal >= ship.free_above_paise ? 0 : (ship.flat_paise || 0);
    const total = subtotal + shipping;
    const user = await userFromRequest(req).catch(() => null);
    const [order] = await q('orders', { method: 'POST', prefer: 'return=representation', body: { user_id: user?.id || null, name, email, phone, shipping_address: addr, subtotal_paise: subtotal, shipping_paise: shipping, total_paise: total, gift_message: str(b.gift_message, 500) || null } });
    await q('order_items', { method: 'POST', prefer: 'return=minimal', body: lines.map((l) => ({ ...l, order_id: order.id })) });
    let rzp; try { rzp = await createRzpOrder({ amountPaise: total, receipt: order.id.slice(0, 8), notes: { order_id: order.id } }); }
    catch (e) { await q(`orders?id=eq.${order.id}`, { method: 'PATCH', body: { status: 'cancelled' } }); console.error('rzp', e.detail); return json({ error: 'payment_provider' }, 502); }
    await q(`orders?id=eq.${order.id}`, { method: 'PATCH', body: { razorpay_order_id: rzp.id } });
    return json({ order_id: order.id, razorpay_order_id: rzp.id, amount: total, currency: 'INR', key_id: process.env.RAZORPAY_KEY_ID, name, email, phone });
  } catch (e) { console.error('checkout', e.status, e.detail || e.message); return json({ error: 'server' }, 500); }
}
