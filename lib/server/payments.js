import { q, rpc, getSettings } from './db.js';
import { fetchPayment } from './razorpay.js';
import { buildInvoice, gstInside, esc } from './invoice.js';
import { sendEmail, customerReceipt, businessAlert, BUSINESS_TO } from './email.js';
import { iso } from './guard.js';
import { orderNumber } from '../numbering.js';
const enc = encodeURIComponent;

/** Called when Razorpay confirms a payment. Safe to call many times: only the first call changes anything. */
export async function finalizePayment(rzpOrderId, paymentId, paidAmountPaise) {
  let rows = await q(`orders?razorpay_order_id=eq.${enc(rzpOrderId)}&select=*,order_items(*)`);
  if (rows?.length) return finalizeOrder(rows[0], paymentId, paidAmountPaise);
  rows = await q(`bookings?razorpay_order_id=eq.${enc(rzpOrderId)}&select=*,workshops(title,starts_at,venue_name)`);
  if (rows?.length) return finalizeBooking(rows[0], paymentId, paidAmountPaise);
  rows = await q(`class_enrolments?razorpay_order_id=eq.${enc(rzpOrderId)}&select=*,class_levels(title,level,sessions)`);
  if (rows?.length) return finalizeEnrolment(rows[0], paymentId, paidAmountPaise);
  return { found: false };
}

async function claim(table, id, paymentId) {
  const rows = await q(`${table}?id=eq.${id}&status=eq.pending`, { method: 'PATCH', prefer: 'return=representation',
    body: { status: 'paid', paid_at: new Date().toISOString(), razorpay_payment_id: paymentId } });
  return rows?.[0] || null;                                 // null = somebody else already confirmed it
}
async function ledger(entry) { try { await q('ledger_entries', { method: 'POST', body: entry, prefer: 'return=minimal' }); } catch (e) { console.error('ledger', e.status, e.detail); } }
/** The fee Razorpay keeps is a business cost: record it as an expense. Uses the real fee from Razorpay when available, otherwise an estimate from Settings. */
async function recordFee({ source_id, amount, paymentId, label, settings }) {
  try {
    let fee = 0, tax = 0, est = false; const pay = paymentId ? await fetchPayment(paymentId) : null;
    if (pay && Number(pay.fee) > 0) { fee = Number(pay.fee); tax = Number(pay.tax) || 0; }
    else { const pct = Number(settings?.gateway?.fee_percent ?? 2); const base = Math.round(amount * pct / 100); tax = Math.round(base * 0.18); fee = base + tax; est = true; }
    if (fee > 0) await ledger({ entry_date: iso(), kind: 'out', category: 'Payment gateway fees', description: `Razorpay fee${est ? ' (estimated)' : ''}: ${label}`, amount_paise: fee, gst_paise: tax, method: 'razorpay', party: 'Razorpay', source: 'fee', source_id });
  } catch (e) { console.error('fee', e.message); }
}
async function customer(c) {                    // add or update this person in the customers list (matched by email)
  if (!c.email) return; const row = { name: c.name, email: String(c.email).toLowerCase(), source: 'website' };
  for (const k of ['phone', 'address_line1', 'address_line2', 'city', 'state', 'pincode', 'user_id']) if (c[k]) row[k] = c[k];
  try { await q('customers?on_conflict=email', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: row }); } catch (e) { console.error('customer', e.status, e.detail); }
}
/** Safety notes for the owner. They are written on the record (notes) and emailed once, so nothing needs to be remembered. */
async function flag(table, id, current, note, subject, detail) {
  if (String(current || '').includes(note)) return;                       // already flagged (the payment can be confirmed twice: by the browser and by the provider)
  try { await q(`${table}?id=eq.${id}`, { method: 'PATCH', body: { notes: [current, note].filter(Boolean).join('\n') } }); } catch (e) { console.error('flag', e.message); }
  await mail({ to: BUSINESS_TO(), subject, html: `<p style="font-family:sans-serif">${esc(detail)}</p>` });
}
const LATE = 'ATTENTION: paid after it was cancelled. Refund it or sort it out.';
async function mail(m) { try { return await sendEmail(m); } catch (e) { console.error('email', e.message); } }

async function shortStock(order) {
  try { const items = await q(`order_items?order_id=eq.${order.id}&select=title,qty,stock_taken,product_id,products(allow_preorder)`);
    const bad = (items || []).filter((i) => i.product_id && !i.products?.allow_preorder && (i.stock_taken ?? i.qty) < i.qty).map((i) => `${i.title} (needed ${i.qty}, had ${i.stock_taken ?? 0})`); return bad.join(', '); } catch { return ''; }
}
async function finalizeOrder(order, paymentId, paid) {
  if (paid != null && paid !== order.total_paise) return { found: true, kind: 'order', id: order.id, error: 'amount_mismatch' };
  if (order.status === 'cancelled') { await flag('orders', order.id, order.notes, LATE, `Payment received for a cancelled order: ${order.name}`, `${order.name} paid ${order.total_paise / 100} rupees for an order you had cancelled (payment ${paymentId}). The order is still cancelled and the money is not in your accounts. Please refund it from your payment provider, or reopen the order.`); return { found: true, kind: 'order', id: order.id, already: true }; }
  if (order.status !== 'pending') return { found: true, kind: 'order', id: order.id, already: true };
  const row = await claim('orders', order.id, paymentId); if (!row) return { found: true, kind: 'order', id: order.id, already: true };
  try { await rpc('order_stock_internal', { p_order: order.id, p_take: true }); }        // takes stock once and remembers how much, so a refund can give it back exactly
  catch { for (const it of order.order_items || []) if (it.product_id) { try { await rpc('decrement_stock', { p_id: it.product_id, p_qty: it.qty }); } catch (e) { console.error('stock', e.message); } } }   // database update v9 not run yet
  const short = await shortStock(order);          // paid for more than was left (two people bought the last one)
  if (short) await flag('orders', order.id, row.notes, 'ATTENTION: not enough stock for every item: ' + short, `Order paid but short on stock: ${order.name}`, `${order.name} paid for an order but you did not have enough stock for: ${short}. Please contact them, or refund.`);
  const settings = await getSettings().catch(() => ({})); const gst = settings.gst || {};
  const full = { ...order, ...row }; const on = orderNumber(order, settings); const ref = on ? `Order ${on}` : '';
  const inv = buildInvoice({ kind: 'order', row: full, items: (order.order_items || []).map((i) => ({ title: i.title, qty: i.qty, unit_paise: i.unit_paise })), settings, ref });
  await ledger({ entry_date: iso(), kind: 'in', category: 'Store sales', description: `Online order ${on || inv.no}`, amount_paise: order.total_paise, gst_paise: (order.order_items || []).reduce((t, x) => t + (x.gst_paise || 0), 0), method: 'razorpay', party: order.name, source: 'order', source_id: order.id });
  await recordFee({ source_id: order.id, amount: order.total_paise, paymentId, label: `order ${inv.no}`, settings });
  const a = order.shipping_address || {}; await customer({ name: order.name, email: order.email, phone: order.phone, address_line1: a.line1, address_line2: a.line2, city: a.city, state: a.state, pincode: a.pincode, user_id: order.user_id });
  await mail(customerReceipt(inv, 'Order'));
  await mail(businessAlert(inv, 'order', (order.order_items || []).map((i) => `${i.title} × ${i.qty}`).join('<br>')));
  return { found: true, kind: 'order', id: order.id };
}

/** A payment can arrive after the 30-minute seat hold ended, or after the workshop was cancelled. The money is real, so the booking is kept, but the owner is told. */
async function checkSeats(b) {
  try {
    const [w] = await q(`workshops?id=eq.${b.workshop_id}&select=title,capacity,status,starts_at`); if (!w) return;
    const paid = await q(`bookings?workshop_id=eq.${b.workshop_id}&status=eq.paid&select=seats`); const used = (paid || []).reduce((t, x) => t + x.seats, 0);
    const why = w.status === 'cancelled' ? 'This workshop is cancelled.' : used > w.capacity ? `The workshop is now over its limit (${used} seats booked, ${w.capacity} available).` : new Date(w.starts_at) <= new Date() ? 'This workshop has already started.' : '';
    if (why) await flag('bookings', b.id, b.notes, 'ATTENTION: ' + why + ' Make room or refund.', `Booking needs your attention: ${b.name}`, `${b.name} paid for ${w.title}. ${why} Please make room for them, or refund.`);
  } catch (e) { console.error('seats', e.message); }
}
async function finalizeBooking(b, paymentId, paid) {
  if (paid != null && paid !== b.amount_paise) return { found: true, kind: 'booking', id: b.id, error: 'amount_mismatch' };
  if (b.status === 'cancelled') { await flag('bookings', b.id, b.notes, LATE, `Payment received for a cancelled booking: ${b.name}`, `${b.name} paid ${b.amount_paise / 100} rupees for a booking that was cancelled (payment ${paymentId}). It is still cancelled and the money is not in your accounts. Please refund it from your payment provider, or reopen the booking.`); return { found: true, kind: 'booking', id: b.id, already: true }; }
  if (b.status !== 'pending') return { found: true, kind: 'booking', id: b.id, already: true };
  const row = await claim('bookings', b.id, paymentId); if (!row) return { found: true, kind: 'booking', id: b.id, already: true };
  await checkSeats(b);
  const settings = await getSettings().catch(() => ({})); const gst = settings.gst || {};
  const per = b.seats ? Math.round(b.amount_paise / b.seats) : b.amount_paise;
  const inv = buildInvoice({ kind: 'booking', row: { ...b, ...row }, items: [{ title: `${b.workshops?.title || 'Workshop'} (${b.seats} ${b.seats > 1 ? 'seats' : 'seat'})`, qty: b.seats, unit_paise: per }], settings });
  await ledger({ entry_date: iso(), kind: 'in', category: 'Workshops', description: `${b.workshops?.title || 'Workshop'} · ${b.seats} seat(s)`, amount_paise: b.amount_paise, gst_paise: b.gst_paise || 0, method: 'razorpay', party: b.name, source: 'booking', source_id: b.id });
  await recordFee({ source_id: b.id, amount: b.amount_paise, paymentId, label: b.workshops?.title || 'workshop booking', settings });
  await customer({ name: b.name, email: b.email, phone: b.phone, user_id: b.user_id });
  await mail(customerReceipt(inv, 'Booking'));
  await mail(businessAlert(inv, 'booking', `${b.workshops?.title || ''}<br>${b.seats} seat(s)`));
  return { found: true, kind: 'booking', id: b.id };
}

async function finalizeEnrolment(e, paymentId, paid) {
  if (paid != null && paid !== e.amount_paise) return { found: true, kind: 'enrolment', id: e.id, error: 'amount_mismatch' };
  if (e.status === 'cancelled') { await flag('class_enrolments', e.id, e.notes, LATE, `Payment received for a cancelled enrolment: ${e.student_name}`, `${e.name} paid ${e.amount_paise / 100} rupees for an enrolment that was cancelled (payment ${paymentId}). It is still cancelled and the money is not in your accounts. Please refund it from your payment provider, or reopen the enrolment.`); return { found: true, kind: 'enrolment', id: e.id, already: true }; }
  if (e.status !== 'pending') return { found: true, kind: 'enrolment', id: e.id, already: true };
  const row = await claim('class_enrolments', e.id, paymentId); if (!row) return { found: true, kind: 'enrolment', id: e.id, already: true };
  const settings = await getSettings().catch(() => ({})); const gst = settings.gst || {}; const lv = e.class_levels || {};
  const label = `${lv.title || 'Writing class'}, ${lv.level || ''} (${lv.sessions || 8} classes) for ${e.student_name}`.replace(/\s+,/g, ',');
  const inv = buildInvoice({ kind: 'enrolment', row: { ...e, ...row }, items: [{ title: label, qty: 1, unit_paise: e.amount_paise }], settings });
  await ledger({ entry_date: iso(), kind: 'in', category: 'Classes', description: label, amount_paise: e.amount_paise, gst_paise: e.gst_paise || 0, method: 'razorpay', party: e.name, source: 'enrolment', source_id: e.id });
  await recordFee({ source_id: e.id, amount: e.amount_paise, paymentId, label, settings });
  await customer({ name: e.name, email: e.email, phone: e.phone, user_id: e.user_id });
  await mail(customerReceipt(inv, 'Enrolment'));
  await mail(businessAlert(inv, 'class enrolment', `${esc(label)}<br>${e.student_group === 'child' ? `Child, age ${e.student_age}` : 'Adult'}`));
  return { found: true, kind: 'enrolment', id: e.id };
}
