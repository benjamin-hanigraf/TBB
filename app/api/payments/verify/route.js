import { verifyPaymentSignature } from '@/lib/server/razorpay';
import { finalizePayment } from '@/lib/server/payments';
import { rateLimit, sameOrigin, readJson, str, json } from '@/lib/server/guard';
export const runtime = 'nodejs';
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'verify', 20)) return json({ error: 'slow_down' }, 429);
  let b; try { b = await readJson(req, 2000); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  const o = str(b.razorpay_order_id, 60), p = str(b.razorpay_payment_id, 60), s = str(b.razorpay_signature, 128);
  if (!verifyPaymentSignature(o, p, s)) return json({ error: 'bad_signature' }, 400);
  try { const r = await finalizePayment(o, p); return r.found ? json({ ok: true, kind: r.kind, id: r.id }) : json({ error: 'unknown_order' }, 404); }
  catch (e) { console.error('verify', e.message); return json({ error: 'server' }, 500); }
}
