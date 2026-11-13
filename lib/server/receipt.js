// Finds a paid order, workshop booking or class enrolment by id and shapes it as an invoice-style receipt page. Used by the website receipt page and the Manager.
import { q, getSettings } from './db.js';
import { buildInvoice } from './invoice.js';
import { receiptSheet } from '../receiptSheet.js';
import { orderNumber } from '../numbering.js';
export async function loadReceipt(id, { manager = false } = {}) {
  let inv = null; let ref = '';
  const settings = await getSettings().catch(() => ({}));
  const paidBooking = manager ? 'in.(paid,transferred)' : 'eq.paid';
  const [o] = await q(`orders?id=eq.${id}&status=in.(paid,packed,shipped,delivered)&select=*,order_items(*)`).catch(() => []);
  if (o) { const on = orderNumber(o, settings); ref = on ? `Order ${on}` : ''; }
  if (o) inv = buildInvoice({ kind: 'order', row: { ...o, status: 'paid' }, items: (o.order_items || []).map((i) => ({ title: i.title, qty: i.qty, unit_paise: i.unit_paise })), settings });
  else { const [b] = await q(`bookings?id=eq.${id}&status=${paidBooking}&select=*,workshops(title)`).catch(() => []);
    if (b) inv = buildInvoice({ kind: 'booking', row: { ...b, status: 'paid' }, items: [{ title: `${b.workshops?.title || 'Workshop'} (${b.seats} ${b.seats > 1 ? 'seats' : 'seat'})`, qty: b.seats, unit_paise: Math.round(b.amount_paise / b.seats) }], settings });
    else { const [e] = await q(`class_enrolments?id=eq.${id}&status=${paidBooking}&select=*,class_levels(title,level,sessions)`).catch(() => []);
      if (e) inv = buildInvoice({ kind: 'enrolment', row: { ...e, status: 'paid' }, items: [{ title: `${e.class_levels?.title || 'Writing class'}, ${e.class_levels?.level || ''} (${e.class_levels?.sessions || 8} classes) for ${e.student_name}`, qty: 1, unit_paise: e.amount_paise }], settings }); } }
  if (!inv) return null;
  return { sheet: receiptSheet(inv, { ref, terms: settings.invoice?.terms || '' }), name: inv.no };
}
