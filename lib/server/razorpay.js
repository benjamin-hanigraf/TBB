import crypto from 'node:crypto';
export const razorpayReady = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export async function createRzpOrder({ amountPaise, receipt, notes = {} }) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const r = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: String(receipt).slice(0, 40), notes }) });
  const j = await r.json(); if (!r.ok) { const e = new Error('razorpay order failed'); e.detail = j; throw e; } return j;
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
