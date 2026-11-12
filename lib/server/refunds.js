// Refunds for paid bookings, class enrolments and orders. Used by the owner-only route /api/manager/refund.
//  how = 'online': the payment provider sends the money back (only for payments made online).
//  how = 'sent':   the owner already sent it back another way (UPI, cash, bank...); it is only recorded.
// Either way the item is marked refunded and the refund goes into the accounts once. An order's items go back in stock only if
// restock is true (the owner is asked: they may be damaged or not returned).
import { q, rpc } from './db.js';
import { gatewayReady, paidOnline, refundOnline, GATEWAY_METHOD, GATEWAY_NAME } from './gateway.js';
import { sendEmail, cancellationEmail } from './email.js';
import { str, iso } from './guard.js';
export const SENT_METHODS = ['upi', 'cash', 'bank', 'card', 'other'];
export const KINDS = {
  booking: { table: 'bookings', select: '*,workshops(title)', ok: ['paid', 'transferred'], amount: (r) => r.amount_paise, gst: (r) => r.gst_paise || 0, title: (r) => r.workshops?.title || 'Your workshop' },
  enrolment: { table: 'class_enrolments', select: '*,class_levels(title,level)', ok: ['paid', 'transferred'], amount: (r) => r.amount_paise, gst: (r) => r.gst_paise || 0, title: (r) => `${r.class_levels?.title || 'Your class'}${r.class_levels?.level ? `, ${r.class_levels.level}` : ''}` },
  order: { table: 'orders', select: '*,order_items(gst_paise)', ok: ['paid', 'packed', 'shipped', 'delivered'], amount: (r) => r.total_paise, gst: (r) => (r.order_items || []).reduce((s, i) => s + (i.gst_paise || 0), 0), title: (r) => `Your order${r.invoice_no ? ` ${r.invoice_no}` : ''}` },
};
export async function refundItems(b) {
  const k = KINDS[b.kind]; const ids = b.ids; const how = b.how; const method = SENT_METHODS.includes(b.method) ? b.method : 'other';
  const reason = str(b.reason, 200); const notify = b.notify !== false; const cancelled = b.cancelled !== false; const results = [];
  for (const id of ids) {
    try {
      const [r] = await q(`${k.table}?id=eq.${id}&select=${encodeURIComponent(k.select)}`); if (!r) { results.push({ id, ok: false, error: 'Not found' }); continue; }
      if (!k.ok.includes(r.status)) { results.push({ id, ok: false, error: r.status === 'refunded' ? 'Already refunded' : `It is ${r.status === 'pending' ? 'not paid' : r.status}` }); continue; }
      const amount = k.amount(r);
      if (how === 'online' && !paidOnline(r)) { results.push({ id, ok: false, error: 'Not paid online. Use "I sent it back myself".' }); continue; }
      if (how === 'online' && !gatewayReady()) { results.push({ id, ok: false, error: `${GATEWAY_NAME} is not connected` }); continue; }
      // claim it first, so a double tap can never refund twice
      const upd = await q(`${k.table}?id=eq.${id}&status=eq.${r.status}`, { method: 'PATCH', prefer: 'return=representation', body: { status: 'refunded' } });
      if (!upd?.length) { results.push({ id, ok: false, error: 'Changed by someone else. Please reload.' }); continue; }
      if (how === 'online') {
        try { await refundOnline(r, amount, reason || 'Refund from the studio'); }
        catch (e) { await q(`${k.table}?id=eq.${id}`, { method: 'PATCH', body: { status: r.status } }).catch(() => {}); results.push({ id, ok: false, error: e.message || `${GATEWAY_NAME} could not refund it` }); continue; }
      }
      if (b.kind === 'order' && b.restock === true) { try { await rpc('order_stock_internal', { p_order: id, p_take: false }); } catch (e) { console.error('refund stock', e.message); } }
      try { await q('ledger_entries', { method: 'POST', prefer: 'return=minimal', body: { entry_date: iso(), kind: 'out', category: 'Refunds', description: `Refund: ${k.title(r)}`, amount_paise: amount, gst_paise: k.gst(r), method: how === 'online' ? GATEWAY_METHOD : method, party: r.name, source: 'refund', source_id: id } }); }
      catch (e) { if (e.detail?.code !== '23505') console.error('refund ledger', e.message); }
      if (notify && r.email) { try { await sendEmail(cancellationEmail({ to: r.email, name: r.name, what: k.title(r), refunded: how, reason, amount, cancelled })); } catch (e) { console.error('refund email', e.message); } }
      results.push({ id, ok: true, how });
    } catch (e) { console.error('refund', e.message, e.detail); results.push({ id, ok: false, error: e.message || 'Failed' }); }
  }
  return results;
}
