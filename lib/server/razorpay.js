import crypto from 'node:crypto';
export const razorpayReady = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export async function createRzpOrder({ amountPaise, receipt, notes = {} }) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const r = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: String(receipt).slice(0, 40), notes }) });
  const j = await r.json(); if (!r.ok) { const e = new Error('razorpay order failed'); e.detail = j; throw e; } return j;
}
const authHeader = () => 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
/** Details of one payment, including the fee Razorpay kept and the GST on that fee (both in paise). Returns null if it cannot be read. */
export async function fetchPayment(paymentId) {
  try { const r = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: authHeader() }, cache: 'no-store' }); return r.ok ? await r.json() : null; } catch { return null; }
}
/** Sends the money back to the customer's original payment method. Throws with a readable message when Razorpay says no. */
export async function refundPayment(paymentId, amountPaise, reason) {
  const r = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refunds`, { method: 'POST', headers: { Authorization: authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amountPaise, speed: 'normal', notes: { reason: String(reason || '').slice(0, 200) } }) });
  const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j?.error?.description || 'Razorpay could not refund this payment'); e.detail = j; throw e; } return j;
}
const safeEqual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
/** Browser return signature: HMAC-SHA256 of "order_id|payment_id" with the key secret */
export function verifyPaymentSignature(orderId, paymentId, signature, secret = process.env.RAZORPAY_KEY_SECRET) {
  if (!secret || !orderId || !paymentId || !signature) return false;
  return safeEqual(crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex'), signature);
}
/** Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret */
export function verifyWebhookSignature(rawBody, signature, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!secret || !signature) return false;
  return safeEqual(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'), signature);
}
