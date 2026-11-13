'use client';
// One way to refund, used for orders, workshop bookings and class enrolments (one or many at once).
// "Refund online" asks the payment provider to send the money back (only for payments made online).
// "I sent it back myself" just records a refund already made by UPI, cash, bank transfer and so on.
import { useState } from 'react';
import { Modal, Btn, F, useForm, useAction, Badge, Empty } from './kit';
import { adminPost } from '@/lib/adminApi';
import { money, PAY_METHODS } from '@/lib/accounting';

export const SENT_OPTIONS = PAY_METHODS;
const online = (r) => !!r.razorpay_payment_id;          // the provider's payment id (column name kept from the first provider)
const amountOf = (kind, r) => (kind === 'order' ? r.total_paise : r.amount_paise);

/** kind: 'order' | 'booking' | 'enrolment'. rows: the paid items to refund. */
export function RefundDialog({ kind, rows, title, cancelled = kind !== 'order', reasonDefault = '', onClose, onDone }) {
  const anyOnline = rows.some(online); const [run, busy] = useAction(); const [res, setRes] = useState(null);
  const first = rows[0] || {}; const startMethod = first.payment_method === 'card' ? 'bank' : SENT_OPTIONS.some(([k]) => k === first.payment_method) ? first.payment_method : 'upi';
  const f = useForm({ how: anyOnline ? 'online' : 'sent', method: startMethod, reason: reasonDefault, notify: true, restock: '' });
  const total = rows.reduce((s, r) => s + amountOf(kind, r), 0);
  const go = () => run(async () => {
    if (kind === 'order' && !f.v.restock) throw new Error('Please choose whether the items go back in stock.');
    const onl = f.v.how === 'online' ? rows.filter(online) : []; const rest = rows.filter((r) => !onl.includes(r)); const out = [];
    const send = async (list, how) => { if (!list.length) return; const r = await adminPost('/api/manager/refund', { kind, ids: list.map((x) => x.id), how, method: f.v.method, reason: f.v.reason, notify: f.v.notify, cancelled, restock: f.v.restock === 'yes' });
      if (!r.ok) throw new Error(r.status === 403 ? 'Please sign in again.' : 'Could not refund. Nothing was changed.'); out.push(...r.results); };
    await send(onl, 'online'); await send(rest, 'sent'); setRes(out); });
  const finish = () => (res?.some((x) => x.ok) && onDone ? onDone() : onClose());   // the parent reloads once the results have been read
  const name = (id) => { const r = rows.find((x) => x.id === id); return r?.student_name || r?.name || ''; };
  const someSent = f.v.how === 'sent' || rows.some((r) => !online(r));
  return (<Modal title={title || 'Refund'} onClose={finish}>
    {res ? <><p style={{ marginTop: 0 }}><b>{res.filter((x) => x.ok).length}</b> of {res.length} refunded.</p>
      <div className="ad-list">{res.map((x) => <div key={x.id} className="ad-row" style={{ cursor: 'default' }}><span>{name(x.id)}</span>{x.ok ? <Badge tone="ok">{x.how === 'online' ? 'Refunded online' : 'Recorded as refunded'}</Badge> : <Badge tone="bad">{x.error}</Badge>}</div>)}</div>
      <div className="ad-actions full"><Btn onClick={finish}>Done</Btn></div></>
    : !rows.length ? <><Empty>Nothing paid to refund.</Empty><div className="ad-actions full"><Btn onClick={onClose}>Close</Btn></div></>
    : <div className="ad-form">
      <p className="full" style={{ margin: 0 }}>Refund <b>{money(total)}</b>{rows.length > 1 ? ` to ${rows.length} people` : ` to ${name(first.id)}`}.</p>
      <F form={f} k="how" label="How" type="select" required options={[...(anyOnline ? [['online', 'Refund online (back to how they paid)']] : []), ['sent', 'I sent it back myself']]} />
      {someSent && <F form={f} k="method" label={f.v.how === 'online' ? 'Others: sent back by' : 'Sent back by'} type="select" required options={SENT_OPTIONS} />}
      {f.v.how === 'online' && rows.some((r) => !online(r)) && <p className="full ad-help" style={{ margin: 0 }}>{rows.filter((r) => !online(r)).length} did not pay online, so they are only recorded as refunded. Send their money back yourself.</p>}
      {f.v.how === 'sent' && <p className="full ad-help" style={{ margin: 0 }}>Nothing is sent automatically. This only records the refund you already made.</p>}
      {kind === 'order' && <div className="full"><F form={f} k="restock" label="Put the items back in stock?" type="select" required options={[['yes', 'Yes, they are back and fine to sell'], ['no', 'No (damaged, faulty or not returned)']]} /></div>}
      <div className="full"><F form={f} k="reason" label="Reason" rule="sentence" hint="Included in the email to the customer" /></div>
      <div className="full"><F form={f} k="notify" label="Email the customer" type="check" /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="wallet" onClick={go}>Refund {money(total)}</Btn><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn></div></div>}
  </Modal>);
}
