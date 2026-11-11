import { q, rpc, getSettings } from './db.js';
import { buildInvoice, gstInside } from './invoice.js';
import { sendEmail, customerReceipt, businessAlert } from './email.js';
import { iso } from './guard.js';
const enc = encodeURIComponent;

/** Called when Razorpay confirms a payment. Safe to call many times: only the first call changes anything. */
export async function finalizePayment(rzpOrderId, paymentId, paidAmountPaise) {
  let rows = await q(`orders?razorpay_order_id=eq.${enc(rzpOrderId)}&select=*,order_items(*)`);
  if (rows?.length) return finalizeOrder(rows[0], paymentId, paidAmountPaise);
  rows = await q(`bookings?razorpay_order_id=eq.${enc(rzpOrderId)}&select=*,workshops(title,starts_at,venue_name)`);
  if (rows?.length) return finalizeBooking(rows[0], paymentId, paidAmountPaise);
  return { found: false };
}

async function claim(table, id, paymentId) {
  const rows = await q(`${table}?id=eq.${id}&status=eq.pending`, { method: 'PATCH', prefer: 'return=representation',
    body: { status: 'paid', paid_at: new Date().toISOString(), razorpay_payment_id: paymentId } });
  return rows?.[0] || null;                                 // null = somebody else already confirmed it
}
async function ledger(entry) { try { await q('ledger_entries', { method: 'POST', body: entry, prefer: 'return=minimal' }); } catch (e) { console.error('ledger', e.status, e.detail); } }
async function mail(m) { try { return await sendEmail(m); } catch (e) { console.error('email', e.message); } }

async function finalizeOrder(order, paymentId, paid) {
  if (paid != null && paid !== order.total_paise) return { found: true, kind: 'order', id: order.id, error: 'amount_mismatch' };
  if (order.status !== 'pending') return { found: true, kind: 'order', id: order.id, already: true };
  const row = await claim('orders', order.id, paymentId); if (!row) return { found: true, kind: 'order', id: order.id, already: true };
  for (const it of order.order_items || []) if (it.product_id) { try { await rpc('decrement_stock', { p_id: it.product_id, p_qty: it.qty }); } catch (e) { console.error('stock', e.message); } }
  const settings = await getSettings().catch(() => ({})); const gst = settings.gst || {};
  const full = { ...order, ...row };
  const inv = buildInvoice({ kind: 'order', row: full, items: (order.order_items || []).map((i) => ({ title: i.title, qty: i.qty, unit_paise: i.unit_paise })), settings });
  await ledger({ entry_date: iso(), kind: 'in', category: 'Store sales', description: `Online order ${inv.no}`, amount_paise: order.total_paise, gst_paise: gst.enabled ? gstInside(order.total_paise, gst.rate_percent || 18) : 0, method: 'razorpay', party: order.name, source: 'order', source_id: order.id });
  await mail(customerReceipt(inv, 'Order'));
  await mail(businessAlert(inv, 'order', (order.order_items || []).map((i) => `${i.title} × ${i.qty}`).join('<br>')));
  return { found: true, kind: 'order', id: order.id };
}

async function finalizeBooking(b, paymentId, paid) {
  if (paid != null && paid !== b.amount_paise) return { found: true, kind: 'booking', id: b.id, error: 'amount_mismatch' };
  if (b.status !== 'pending') return { found: true, kind: 'booking', id: b.id, already: true };
  const row = await claim('bookings', b.id, paymentId); if (!row) return { found: true, kind: 'booking', id: b.id, already: true };
  const settings = await getSettings().catch(() => ({})); const gst = settings.gst || {};
  const per = b.seats ? Math.round(b.amount_paise / b.seats) : b.amount_paise;
  const inv = buildInvoice({ kind: 'booking', row: { ...b, ...row }, items: [{ title: `${b.workshops?.title || 'Workshop'} (${b.seats} ${b.seats > 1 ? 'seats' : 'seat'})`, qty: b.seats, unit_paise: per }], settings });
  await ledger({ entry_date: iso(), kind: 'in', category: 'Workshops', description: `${b.workshops?.title || 'Workshop'} · ${b.seats} seat(s)`, amount_paise: b.amount_paise, gst_paise: gst.enabled ? gstInside(b.amount_paise, gst.rate_percent || 18) : 0, method: 'razorpay', party: b.name, source: 'booking', source_id: b.id });
  await mail(customerReceipt(inv, 'Booking'));
  await mail(businessAlert(inv, 'booking', `${b.workshops?.title || ''}<br>${b.seats} seat(s)`));
  return { found: true, kind: 'booking', id: b.id };
}
