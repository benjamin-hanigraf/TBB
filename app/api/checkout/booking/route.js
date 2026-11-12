import { q, rpc, dbReady, userFromRequest } from '@/lib/server/db';
import { createRzpOrder, razorpayReady } from '@/lib/server/razorpay';
import { gstLine } from '@/lib/gst';
import { rateLimit, sameOrigin, readJson, str, isEmail, isPhone, intIn, json } from '@/lib/server/guard';
export const runtime = 'nodejs';
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'booking', 8)) return json({ error: 'slow_down' }, 429);
  if (!dbReady() || !razorpayReady()) return json({ error: 'payments_not_configured' }, 503);
  let b; try { b = await readJson(req); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  const name = str(b.name, 120), email = str(b.email).toLowerCase(), phone = str(b.phone, 20), seats = intIn(b.seats, 1, 10), slug = str(b.slug, 100);
  if (!name || !isEmail(email) || !isPhone(phone) || !seats || !slug) return json({ error: 'invalid_details' }, 400);
  try {
    const [w] = await q(`workshops?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,price_paise,friend_price_paise,starts_at,early_price_paise,early_until,gst_mode`);
    if (!w || new Date(w.starts_at) <= new Date()) return json({ error: 'closed' }, 409);
    const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
    const base = w.early_price_paise != null && w.early_until && w.early_until >= today ? Math.min(w.early_price_paise, w.price_paise) : w.price_paise;
    const per = seats >= 2 && w.friend_price_paise ? Math.min(w.friend_price_paise, base) : base; const g = gstLine(per, seats, w.gst_mode); const amount = g.total; const gstPaise = w.gst_mode === 'none' ? 0 : g.gst;
    // stop one person from holding many seats without paying: at most 2 unpaid holds per email or phone in 30 minutes
    const since = new Date(Date.now() - 30 * 60_000).toISOString();
    const holds = await q(`bookings?status=eq.pending&created_at=gte.${encodeURIComponent(since)}&or=(email.eq.${encodeURIComponent(email)},phone.eq.${encodeURIComponent(phone)})&select=id`);
    if ((holds || []).length >= 2) return json({ error: 'slow_down' }, 429);
    const user = await userFromRequest(req).catch(() => null);
    let id; try { id = await rpc('book_seats', { p_workshop: w.id, p_user: user?.id || null, p_name: name, p_email: email, p_phone: phone, p_seats: seats, p_amount: amount }); }
    catch (e) { const m = JSON.stringify(e.detail || ''); return json({ error: m.includes('sold_out') ? 'sold_out' : 'closed' }, 409); }
    if (amount === 0) return json({ error: 'free_not_supported' }, 400);
    let rzp; try { rzp = await createRzpOrder({ amountPaise: amount, receipt: String(id).slice(0, 8), notes: { booking_id: id } }); }
    catch (e) { await q(`bookings?id=eq.${id}`, { method: 'PATCH', body: { status: 'cancelled' } }); console.error('rzp', e.detail); return json({ error: 'payment_provider' }, 502); }
    await q(`bookings?id=eq.${id}`, { method: 'PATCH', body: { razorpay_order_id: rzp.id, gst_paise: gstPaise } });
    return json({ booking_id: id, razorpay_order_id: rzp.id, amount, currency: 'INR', key_id: process.env.RAZORPAY_KEY_ID, name, email, phone });
  } catch (e) { console.error('booking', e.status, e.detail || e.message); return json({ error: 'server' }, 500); }
}
