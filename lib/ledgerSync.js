'use client';
// Safety net for the accounts: every paid order, workshop booking and class enrolment must appear as money in,
// and a refund is recorded as money out. Safe to run any number of times: each payment is only ever added once.
import { gstInside } from './accounting.js';
const istDate = (iso) => new Date(new Date(iso || Date.now()).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
async function insertQuietly(c, rows) {
  if (!rows.length) return 0; const { error } = await c.from('ledger_entries').insert(rows); if (!error) return rows.length;
  if (error.code !== '23505') throw error; let n = 0;                                  // one of them already existed: add the rest one by one
  for (const r of rows) { const { error: e } = await c.from('ledger_entries').insert(r); if (!e) n++; else if (e.code !== '23505') throw e; } return n;
}
export async function syncPaymentsToLedger(c) {
  const [led, ord, bk, en, st] = await Promise.all([
    c.from('ledger_entries').select('source,source_id').in('source', ['order', 'booking', 'enrolment']).limit(20000),
    c.from('orders').select('id,name,total_paise,paid_at,created_at,invoice_no,payment_method,order_items(gst_paise)').in('status', ['paid', 'packed', 'shipped', 'delivered']).limit(20000),
    c.from('bookings').select('id,name,amount_paise,gst_paise,paid_at,created_at,payment_method,workshops(title)').in('status', ['paid', 'transferred']).limit(20000),
    c.from('class_enrolments').select('id,name,amount_paise,gst_paise,paid_at,created_at,payment_method,student_name,class_levels(title,level)').in('status', ['paid', 'transferred']).limit(20000),
    c.from('settings').select('value').eq('key', 'gst').maybeSingle()]);
  for (const r of [led, ord, bk, en]) if (r.error) throw r.error;
  const have = new Set((led.data || []).map((x) => `${x.source}:${x.source_id}`)); const gst = st.data?.value || {}; const g = (amt) => (gst.enabled ? gstInside(amt, gst.rate_percent || 18) : 0);
  const rows = [];
  for (const o of ord.data || []) if (!have.has(`order:${o.id}`)) rows.push({ entry_date: istDate(o.paid_at || o.created_at), kind: 'in', category: 'Store sales', description: `Online order ${o.invoice_no ?? ''}`.trim(), amount_paise: o.total_paise, gst_paise: (o.order_items || []).reduce((t, x) => t + (x.gst_paise || 0), 0), method: o.payment_method || 'razorpay', party: o.name, source: 'order', source_id: o.id });
  for (const b of bk.data || []) if (!have.has(`booking:${b.id}`)) rows.push({ entry_date: istDate(b.paid_at || b.created_at), kind: 'in', category: 'Workshops', description: b.workshops?.title || 'Workshop', amount_paise: b.amount_paise, gst_paise: b.gst_paise || 0, method: b.payment_method || 'razorpay', party: b.name, source: 'booking', source_id: b.id });
  for (const e of en.data || []) if (!have.has(`enrolment:${e.id}`)) rows.push({ entry_date: istDate(e.paid_at || e.created_at), kind: 'in', category: 'Classes', description: `${e.class_levels?.title || 'Writing class'}, ${e.class_levels?.level || ''} for ${e.student_name}`.replace(/\s+,/g, ','), amount_paise: e.amount_paise, gst_paise: e.gst_paise || 0, method: e.payment_method || 'razorpay', party: e.name, source: 'enrolment', source_id: e.id });
  return insertQuietly(c, rows);
}
/** Marking something as refunded also records the money going back out. */
export async function recordRefund(c, { source_id, amount_paise, gst_paise = 0, party, description }) {
  const { error } = await c.from('ledger_entries').insert({ entry_date: istDate(), kind: 'out', category: 'Refunds', description, amount_paise, gst_paise, method: 'razorpay', party, source: 'refund', source_id });
  if (error && error.code !== '23505') throw error;
}
