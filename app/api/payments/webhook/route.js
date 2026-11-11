import { verifyWebhookSignature } from '@/lib/server/razorpay';
import { finalizePayment } from '@/lib/server/payments';
export const runtime = 'nodejs';
// Razorpay calls this by itself when a payment is captured, even if the customer closes the browser.
export async function POST(req) {
  const raw = await req.text();
  if (raw.length > 200_000 || !verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature'))) return new Response('invalid', { status: 400 });
  let ev; try { ev = JSON.parse(raw); } catch { return new Response('bad', { status: 400 }); }
  if (!['payment.captured', 'order.paid'].includes(ev.event)) return new Response('ignored', { status: 200 });
  const pay = ev.payload?.payment?.entity; if (!pay?.order_id || !pay?.id) return new Response('ignored', { status: 200 });
  try { await finalizePayment(pay.order_id, pay.id, pay.amount); return new Response('ok', { status: 200 }); }
  catch (e) { console.error('webhook', e.message); return new Response('retry', { status: 500 }); }
}
