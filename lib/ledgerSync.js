'use client';
// Safety net for the accounts: every paid order, workshop booking and class enrolment must appear as money in,
// and a refund is recorded as money out. Safe to run any number of times: each payment is only ever added once.
import { gstInside } from './accounting.js';
// Reads every row, 1000 at a time (Supabase returns at most 1000 per request).
async function every(make) { const out = []; for (let from = 0; ; from += 1000) { const r = await make().range(from, from + 999); if (r.error) return { data: null, error: r.error }; out.push(...(r.data || [])); if ((r.data || []).length < 1000) return { data: out, error: null }; } }
const istDate = (iso) => new Date(new Date(iso || Date.now()).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
async function insertQuietly(c, rows) {
  if (!rows.length) return 0; const { error } = await c.from('ledger_entries').insert(rows); if (!error) return rows.length;
  if (error.code !== '23505') throw error; let n = 0;                                  // one of them already existed: add the rest one by one
  for (const r of rows) { const { error: e } = await c.from('ledger_entries').insert(r); if (!e) n++; else if (e.code !== '23505') throw e; } return n;
}
// By default only recent payments are checked (the last 60 days), so it stays quick. { full: true } checks everything ever paid.
export async function syncPaymentsToLedger(c, { full = false } = {}) {
  const since = full ? null : new Date(Date.now() - 60 * 864e5).toISOString(); const sinceDay = since && istDate(new Date(Date.now() - 100 * 864e5).toISOString());
  const win = (q, col) => (since ? q.gte(col, since) : q);
  const [led, ord, bk, en, st] = await Promise.all([
    every(() => { const q = c.from('ledger_entries').select('source,source_id').in('source', ['order', 'booking', 'enrolment']); return (sinceDay ? q.gte('entry_date', sinceDay) : q).order('id'); }),
    every(() => win(c.from('orders').select('id,name,total_paise,paid_at,created_at,invoice_no,payment_method,order_items(gst_paise)').in('status', ['paid', 'packed', 'shipped', 'delivered']), 'paid_at').order('id')),
    every(() => win(c.from('bookings').select('id,name,amount_paise,gst_paise,paid_at,created_at,payment_method,workshops(title)').in('status', ['paid', 'transferred']), 'paid_at').order('id')),
    every(() => win(c.from('class_enrolments').select('id,name,amount_paise,gst_paise,paid_at,created_at,payment_method,student_name,class_levels(title,level)').in('status', ['paid', 'transferred']), 'paid_at').order('id')),
    c.from('settings').select('value').eq('key', 'gst').maybeSingle()]);
  for (const r of [led, ord, bk, en]) if (r.error) throw r.error;
  const have = new Set((led.data || []).map((x) => `${x.source}:${x.source_id}`)); const gst = st.data?.value || {}; const g = (amt) => (gst.enabled ? gstInside(amt, gst.rate_percent || 18) : 0);
  const rows = [];
  for (const o of ord.data || []) if (!have.has(`order:${o.id}`)) rows.push({ entry_date: istDate(o.paid_at || o.created_at), kind: 'in', category: 'Store sales', description: `Online order ${o.invoice_no ?? ''}`.trim(), amount_paise: o.total_paise, gst_paise: (o.order_items || []).reduce((t, x) => t + (x.gst_paise || 0), 0), method: o.payment_method || 'razorpay', party: o.name, source: 'order', source_id: o.id });
  for (const b of bk.data || []) if (!have.has(`booking:${b.id}`)) rows.push({ entry_date: istDate(b.paid_at || b.created_at), kind: 'in', category: 'Workshops', description: b.workshops?.title || 'Workshop', amount_paise: b.amount_paise, gst_paise: b.gst_paise || 0, method: b.payment_method || 'razorpay', party: b.name, source: 'booking', source_id: b.id });
  for (const e of en.data || []) if (!have.has(`enrolment:${e.id}`)) rows.push({ entry_date: istDate(e.paid_at || e.created_at), kind: 'in', category: 'Classes', description: `${e.class_levels?.title || 'Writing class'}, ${e.class_levels?.level || ''} for ${e.student_name}`.replace(/\s+,/g, ','), amount_paise: e.amount_paise, gst_paise: e.gst_paise || 0, method: e.payment_method || 'razorpay', party: e.name, source: 'enrolment', source_id: e.id });
  return insertQuietly(c, rows.filter((r) => r.amount_paise > 0));   // a free item (₹0) is not money in: the database refuses a ₹0 entry
}
