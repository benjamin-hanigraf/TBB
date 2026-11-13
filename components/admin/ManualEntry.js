'use client';
// Orders, workshop sign-ups and class enrolments that were agreed directly (not through the website).
import { useState } from 'react';
import { sb, must, every, Modal, Btn, F, useForm, useAction, useToast, useLoad, fmtD } from './kit';
import { CustomerSuggest, useCustomers, ensureCustomer } from './pickers';
import { syncPaymentsToLedger } from '@/lib/ledgerSync';
import { gstLine } from '@/lib/gst';
import { money, rupeesToPaise, todayISO, PAY_METHODS } from '@/lib/accounting';
import { RULES } from '@/lib/format';

export const PAY_OPTIONS = [['paid', 'Paid'], ['pending', 'Not paid yet']];
export const METHOD_OPTIONS = PAY_METHODS;
const nowISO = () => new Date().toISOString();

function Person({ f, customers, extra }) {
  const pick = (c) => f.setAll((v) => ({ ...v, name: c.name, email: c.email || '', phone: c.phone || '', ...(extra ? { line1: c.address_line1 || '', line2: c.address_line2 || '', city: c.city || '', state: c.state || '', pincode: c.pincode || '' } : {}) }));
  return (<>
    <CustomerSuggest value={f.v.name} onType={(v) => f.set('name', v)} onPick={pick} customers={customers} required label="Name" />
    <F form={f} k="phone" label="Phone" type="tel" rule="phone" /><F form={f} k="email" label="Email" type="email" rule="email" /></>);
}
export function PaymentFields({ f }) {
  return (<><F form={f} k="pay" label="Payment" type="select" required options={PAY_OPTIONS} />{f.v.pay === 'paid' && <F form={f} k="method" label="Paid by" type="select" required options={METHOD_OPTIONS} />}</>);
}

/** Add an order made outside the website, or (with `order`) edit one that was added manually. Payment and shipping are changed from the order itself. */
export function AddOrder({ products, order, onClose, onSaved }) {
  const edit = !!order; const a0 = order?.shipping_address || {}; const { data: customers } = useCustomers(); const [run, busy] = useAction();
  const f = useForm({ name: order?.name || '', phone: order?.phone || '', email: order?.email || '', line1: a0.line1 || '', line2: a0.line2 || '', city: a0.city || '', state: a0.state || '', pincode: a0.pincode || '',
    shipping: order ? String((order.shipping_paise || 0) / 100) : '', pay: 'paid', method: 'upi' });
  // an edited order keeps each item's original price until you choose a different product
  const [items, setItems] = useState(order ? order.order_items.map((i) => ({ slug: products.find((p) => p.id === i.product_id)?.slug || '', qty: String(i.qty), unit: i.unit_paise })) : [{ slug: '', qty: '1' }]);
  const set = (i, k, v) => setItems((a) => a.map((x, j) => (j === i ? { ...x, [k]: v, ...(k === 'slug' ? { unit: undefined } : {}) } : x)));
  const lines = items.map((x) => { const p = products.find((q) => q.slug === x.slug); const qty = Math.max(1, parseInt(x.qty || '1', 10)); if (!p) return null; const unit = x.unit ?? p.price_paise; return { p, qty, unit, g: gstLine(unit, qty, p.gst_mode) }; }).filter(Boolean);
  const subtotal = lines.reduce((s, l) => s + l.g.total, 0), ship = rupeesToPaise(f.v.shipping), total = subtotal + ship;
  const save = (e) => { e.preventDefault(); return run(async () => {
    if (!lines.length) throw new Error('Please choose at least one product.'); if (!f.v.name.trim()) throw new Error('Please add the customer name.');
    const paid = f.v.pay === 'paid'; const addr = { recipient: f.v.name, phone: f.v.phone, line1: f.v.line1, line2: f.v.line2, city: f.v.city, state: f.v.state, pincode: f.v.pincode };
    if (!edit && paid) for (const l of lines) { const want = lines.filter((x) => x.p.id === l.p.id).reduce((t, x) => t + x.qty, 0);       // do not sell more than is on the shelf
      if (!l.p.allow_preorder && want > l.p.stock) throw new Error(`Only ${l.p.stock} of "${l.p.title}" in stock. Add stock first, or save the order as not paid yet.`); }
    const itemRows = lines.map((l) => ({ product_id: l.p.id, title: l.p.title, unit_paise: l.unit, qty: l.qty, gst_paise: l.p.gst_mode === 'none' ? 0 : l.g.gst }));
    const body = { name: f.v.name, email: f.v.email || '', phone: f.v.phone || '', address: addr, subtotal_paise: subtotal, shipping_paise: ship, total_paise: total, items: itemRows };
    // Saved in one step in the database: the order, its items, the stock and the accounts entry go in together, or nothing does.
    must(edit ? await sb().rpc('admin_update_order', { p: { ...body, id: order.id } }) : await sb().rpc('admin_add_order', { p: { ...body, pay: paid ? 'paid' : 'pending', method: f.v.method } }));
    await ensureCustomer({ name: f.v.name, email: f.v.email, phone: f.v.phone, address_line1: f.v.line1, address_line2: f.v.line2, city: f.v.city, state: f.v.state, pincode: f.v.pincode });
    onSaved(); }, edit ? 'Order updated' : 'Order added'); };
  return (<Modal title={edit ? 'Edit order' : 'Add order'} onClose={onClose} wide><form className="ad-form" onSubmit={save}>
    <Person f={f} customers={customers} extra />
    <div className="full"><p className="ad-section-t">Products</p>
      {items.map((x, i) => (<div key={i} className="line-row"><select aria-label="Product" value={x.slug} onChange={(e) => set(i, 'slug', e.target.value)}><option value="">Choose a product</option>{products.map((p) => <option key={p.id} value={p.slug}>{p.title} · {money(x.slug === p.slug && x.unit != null ? x.unit : p.price_paise)}</option>)}</select>
        <input aria-label="Quantity" inputMode="numeric" value={x.qty} onChange={(e) => set(i, 'qty', e.target.value.replace(/\D/g, '').slice(0, 3))} />
        <button type="button" className="ad-x" aria-label="Remove" onClick={() => setItems((a) => (a.length > 1 ? a.filter((_, j) => j !== i) : a))}>✕</button></div>))}
      <div className="ad-actions"><Btn type="button" variant="ghost" className="ad-btn ghost sm" icon="plus" onClick={() => setItems((a) => [...a, { slug: '', qty: '1' }])}>Add product</Btn></div></div>
    <F form={f} k="line1" label="Address line 1" rule="text" /><F form={f} k="line2" label="Address line 2" rule="text" /><F form={f} k="city" label="City" rule="text" /><F form={f} k="state" label="State" rule="text" /><F form={f} k="pincode" label="Pincode" rule="pin" inputMode="numeric" />
    <F form={f} k="shipping" label="Shipping charge (₹)" type="money" rule="money" />
    {edit ? <p className="ad-help" style={{ margin: 0 }}>Payment and shipping are changed from the order, not here.</p> : <PaymentFields f={f} />}
    <p className="full ad-help" style={{ margin: 0 }}>Total: <b>{money(total)}</b>{lines.some((l) => l.p.gst_mode === 'add') ? ' (includes GST where it applies)' : ''}</p>
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn></div></form></Modal>);
}

/** Add a sign-up by hand. */
export function AddSignup({ w, taken, onClose, onSaved }) {
  const { data: customers } = useCustomers(); const [run, busy] = useAction();
  const unit = w.early_price_paise != null && w.early_until && w.early_until >= todayISO() ? w.early_price_paise : w.price_paise;      // today's price (early-bird while it lasts)
  const seats0 = '1';
  const f = useForm({ name: '', phone: '', email: '', seats: seats0, amount: String((unit * Number(seats0)) / 100), pay: 'paid', method: 'upi' });
  const save = (e) => { e.preventDefault(); return run(async () => {
    const seats = Math.max(1, parseInt(f.v.seats || '1', 10)); if (taken + seats > w.capacity) throw new Error(`Only ${Math.max(0, w.capacity - taken)} seat(s) are left.`); if (!f.v.name.trim()) throw new Error('Please add the name.');
    const paid = f.v.pay === 'paid';
    must(await sb().from('bookings').insert({ workshop_id: w.id, name: f.v.name, email: f.v.email || '', phone: f.v.phone || '', seats, amount_paise: rupeesToPaise(f.v.amount), status: paid ? 'paid' : 'pending', channel: 'manual', payment_method: paid ? f.v.method : null, paid_at: paid ? nowISO() : null }));
    await ensureCustomer({ name: f.v.name, email: f.v.email, phone: f.v.phone }); if (paid) await syncPaymentsToLedger(sb()); onSaved(); }, 'Sign-up added'); };
  return (<Modal title={`Add sign-up · ${w.title}`} onClose={onClose}><form className="ad-form" onSubmit={save}>
    <Person f={f} customers={customers} /><F form={f} k="seats" label="Seats" rule="digits" required inputMode="numeric" /><F form={f} k="amount" label="Total amount (₹)" type="money" rule="money" required hint="Change it if you gave a discount" />
    <PaymentFields f={f} />
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn></div></form></Modal>);
}

export function AddEnrol({ level, onClose, onSaved }) {
  const { data: customers } = useCustomers(); const [run, busy] = useAction();
  const f = useForm({ group: 'child', student: '', age: '', name: '', phone: '', email: '', amount: String(level.price_paise / 100), pay: 'paid', method: 'upi' });
  const save = (e) => { e.preventDefault(); return run(async () => {
    const child = f.v.group === 'child'; const age = child ? parseInt(f.v.age, 10) : null; if (child && !(age >= 5 && age <= 15)) throw new Error('A child must be between 5 and 15 years old.');
    if (!f.v.name.trim() || (child && !f.v.student.trim())) throw new Error('Please add the names.'); const paid = f.v.pay === 'paid';
    must(await sb().from('class_enrolments').insert({ class_id: level.id, student_name: child ? RULES.name.done(f.v.student) : f.v.name, student_group: f.v.group, student_age: age, name: f.v.name, email: f.v.email || '', phone: f.v.phone || '', amount_paise: rupeesToPaise(f.v.amount), status: paid ? 'paid' : 'pending', channel: 'manual', payment_method: paid ? f.v.method : null, paid_at: paid ? nowISO() : null }));
    await ensureCustomer({ name: f.v.name, email: f.v.email, phone: f.v.phone }); if (paid) await syncPaymentsToLedger(sb()); onSaved(); }, 'Enrolment added'); };
  return (<Modal title={`Add enrolment · ${level.title}, ${level.level}`} onClose={onClose}><form className="ad-form" onSubmit={save}>
    <F form={f} k="group" label="Who is attending?" type="select" required options={[['child', 'A child (5 to 15)'], ['adult', 'An adult']]} />
    {f.v.group === 'child' && <><F form={f} k="student" label="Participant's name" rule="name" required /><F form={f} k="age" label="Participant's age" rule="digits" required inputMode="numeric" /></>}
    <CustomerSuggest value={f.v.name} onType={(v) => f.set('name', v)} onPick={(c) => f.setAll((v) => ({ ...v, name: c.name, email: c.email || '', phone: c.phone || '' }))} customers={customers} required label={f.v.group === 'child' ? "Parent or guardian's name" : 'Name'} />
    <F form={f} k="phone" label="Phone" type="tel" rule="phone" /><F form={f} k="email" label="Email" type="email" rule="email" />
    <F form={f} k="amount" label="Amount (₹)" type="money" rule="money" required /><PaymentFields f={f} />
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn></div></form></Modal>);
}

// ---- view / change one sign-up or enrolment (status, mark paid, refund) ----
import Link from 'next/link';
import { fmtDT } from './kit';
import { RefundDialog } from './Refund';
import { ReceiptModal } from './DocViewer';
import Icon from '@/components/Icons';
import { Badge } from './kit';
const STATUS = { pending: ['Not paid yet', 'warn'], paid: ['Confirmed', 'ok'], transferred: ['Transferred', 'ok'], cancelled: ['Cancelled', 'bad'], refunded: ['Refunded', ''] };
const waLink = (p) => { const d = String(p || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? `https://wa.me/91${d}` : null; };
// Status changes here never refund: refunds go through the Refund button, so the money and the accounts always match.
function useStatusSave({ table, row, f, label, extra = {}, onSaved }) {
  const [run, busy] = useAction();
  const save = () => run(async () => {
    const becamePaid = row.status === 'pending' && ['paid', 'transferred'].includes(f.v.status);
    if (table === 'bookings' && becamePaid) {   // confirming must not overfill the workshop
      const w = must(await sb().from('workshops').select('capacity').eq('id', row.workshop_id).single()); const taken = must(await sb().from('bookings').select('seats').eq('workshop_id', row.workshop_id).eq('status', 'paid')).reduce((t, x) => t + x.seats, 0);
      if (taken + row.seats > w.capacity) throw new Error(`Only ${Math.max(0, w.capacity - taken)} seat(s) are left, so this cannot be confirmed.`); }
    must(await sb().from(table).update({ status: f.v.status, ...extra, ...(becamePaid ? { paid_at: nowISO(), payment_method: f.v.method } : {}), ...(['paid', 'transferred'].includes(row.status) && f.v.status === 'pending' ? { paid_at: null, payment_method: null } : {}) }).eq('id', row.id));      // "Not paid yet" clears the payment; the money entry goes with it
    if (becamePaid) await syncPaymentsToLedger(sb()); onSaved(); }, label);
  return [save, busy];
}
// A paid sign-up can only be refunded (never just switched to "Cancelled"), otherwise the money in the accounts would stay with nothing against it.
const statusOptions = (cur, transferredLabel, paidOnline) => (cur === 'refunded' ? [['refunded', 'Refunded']]
  : ['paid', 'transferred'].includes(cur) ? [['paid', 'Confirmed'], ...(transferredLabel || cur === 'transferred' ? [['transferred', transferredLabel || 'Transferred']] : []), ...(paidOnline ? [] : [['pending', 'Not paid yet']])]       // paid by hand can be undone (the money entry goes); paid online can only be refunded
  : cur === 'cancelled' ? [['cancelled', 'Cancelled'], ['pending', 'Not paid yet']]
  : [['pending', 'Not paid yet'], ['paid', 'Confirmed'], ...(transferredLabel ? [['transferred', transferredLabel]] : []), ['cancelled', 'Cancelled']]);
const refundable = (r) => ['paid', 'transferred'].includes(r.status);
export function BookingModal({ b, onClose, onSaved }) {
  const f = useForm({ status: b.status, method: b.payment_method || 'upi' }); const [refund, setRefund] = useState(false); const [transfer, setTransfer] = useState(false); const [editing, setEditing] = useState(false); const [receipt, setReceipt] = useState(false);
  const [save, busy] = useStatusSave({ table: 'bookings', row: b, f, label: 'Sign-up updated', onSaved }); const wa = waLink(b.phone);
  return (<Modal title={b.name} onClose={onClose}>
    <p style={{ marginTop: 0 }}><b>{b.workshops?.title}</b><br />{b.seats} {b.seats > 1 ? 'seats' : 'seat'} · {money(b.amount_paise)}<br /><span className="ad-help">{b.email} · {b.phone}</span></p>
    {b.notes && <p className={b.notes.includes('ATTENTION') ? 'ad-err' : 'ad-help'} style={{ whiteSpace: 'pre-wrap' }}>{b.notes}</p>}
    <p className="ad-help">Booked {fmtDT(b.created_at)}{b.channel === 'manual' ? ' · added manually' : ''}{b.razorpay_payment_id ? ` · Payment ID ${b.razorpay_payment_id}` : ''}</p>
    {editing ? <div className="ad-form"><F form={f} k="status" label="Status" type="select" required options={statusOptions(b.status, undefined, !!b.razorpay_payment_id)} />
      {b.status === 'pending' && ['paid', 'transferred'].includes(f.v.status) && <F form={f} k="method" label="Paid by" type="select" required options={METHOD_OPTIONS} />}</div>
      : <p style={{ margin: '0 0 8px' }}><Badge tone={STATUS[b.status]?.[1]}>{STATUS[b.status]?.[0] || b.status}</Badge></p>}
    <p className="ad-help">Tickets are non-refundable but can be moved to another date with Transfer. To give money back, use Refund.</p>
    <div className="ad-actions full">{editing ? <><Btn busy={busy} onClick={save} icon="check">Save</Btn><Btn variant="ghost" onClick={() => { setEditing(false); f.set('status', b.status); }}>Cancel</Btn></>
      : <>{statusOptions(b.status, undefined, !!b.razorpay_payment_id).length > 1 && <Btn variant="ghost" icon="edit" onClick={() => setEditing(true)}>Edit</Btn>}{refundable(b) && <Btn variant="ghost" icon="file" onClick={() => setReceipt(true)}>Receipt</Btn>}{wa && <a className="ad-btn ghost" href={wa} target="_blank" rel="noopener"><Icon n="whatsapp" size={16} /><span>WhatsApp</span></a>}{b.status === 'paid' && <Btn variant="ghost" icon="send" onClick={() => setTransfer(true)}>Transfer</Btn>}{refundable(b) && <Btn variant="ghost" icon="wallet" onClick={() => setRefund(true)}>Refund</Btn>}</>}</div>
    {receipt && <ReceiptModal id={b.id} onClose={() => setReceipt(false)} />}
    {refund && <RefundDialog kind="booking" rows={[b]} title={`Refund · ${b.name}`} onClose={() => setRefund(false)} onDone={onSaved} />}
    {transfer && <TransferDialog b={b} onClose={() => setTransfer(false)} onDone={onSaved} />}</Modal>);
}
/** Move a paid booking to another workshop (another date). The same booking is moved, so the seat is freed here, taken there, and the payment record stays as it is. */
function TransferDialog({ b, onClose, onDone }) {
  const [run, busy] = useAction(); const [to, setTo] = useState('');
  const { data, error } = useLoad(async () => {
    const c = sb(); const ws = must(await every(() => c.from('workshops').select('id,title,starts_at,capacity').eq('status', 'published').gte('starts_at', new Date().toISOString()).neq('id', b.workshop_id).order('starts_at').order('id')));
    const bk = ws.length ? must(await every(() => c.from('bookings').select('workshop_id,seats').eq('status', 'paid').in('workshop_id', ws.map((w) => w.id)).order('id'))) : []; const taken = {};
    bk.forEach((x) => { taken[x.workshop_id] = (taken[x.workshop_id] || 0) + x.seats; }); return ws.map((w) => ({ ...w, left: w.capacity - (taken[w.id] || 0) }));
  }, [b.id]);
  const go = () => run(async () => {
    const w = (data || []).find((x) => x.id === to); if (!w) throw new Error('Please choose the new workshop.'); if (w.left < b.seats) throw new Error(`Only ${Math.max(0, w.left)} seat(s) are free there.`);
    const note = `Transferred from ${b.workshops?.title || 'another workshop'} on ${fmtD(new Date().toISOString())}`;
    must(await sb().from('bookings').update({ workshop_id: w.id, notes: [b.notes, note].filter(Boolean).join('\n') }).eq('id', b.id)); onDone(); }, 'Transferred');
  return (<Modal title={`Transfer · ${b.name}`} onClose={onClose}>
    <p className="ad-help" style={{ marginTop: 0 }}>Moves {b.seats} {b.seats > 1 ? 'seats' : 'seat'} from <b>{b.workshops?.title}</b> to another date. The seat becomes free here and no payment is changed.</p>
    {error && <p className="ad-err">{error.message}</p>}
    {data && (data.length ? <div className="ad-form"><div className="full"><label className="ad-field"><span>Move to <i> *</i></span><select value={to} onChange={(e) => setTo(e.target.value)}><option value="">Choose a workshop</option>{data.map((w) => <option key={w.id} value={w.id} disabled={w.left < b.seats}>{w.title} · {fmtD(w.starts_at)} · {w.left > 0 ? `${w.left} free` : 'full'}</option>)}</select></label></div></div> : <p className="ad-empty">There is no other upcoming workshop to move to.</p>)}
    <div className="ad-actions full"><Btn busy={busy} disabled={!to} icon="check" onClick={go}>Transfer</Btn><Btn variant="ghost" onClick={onClose}>Cancel</Btn></div></Modal>);
}
export function EnrolModal({ e, onClose, onSaved }) {
  const f = useForm({ status: e.status, method: e.payment_method || 'upi' }); const [refund, setRefund] = useState(false); const [editing, setEditing] = useState(false); const [receipt, setReceipt] = useState(false);
  const [save, busy] = useStatusSave({ table: 'class_enrolments', row: e, f, label: 'Enrolment updated', onSaved }); const wa = waLink(e.phone);
  return (<Modal title={e.student_name} onClose={onClose}>
    <p style={{ marginTop: 0 }}><b>{e.class_levels?.title}, {e.class_levels?.level}</b><br />{e.student_group === 'child' ? `Child, age ${e.student_age}` : 'Adult'} · {money(e.amount_paise)}</p>
    {e.notes && <p className={e.notes.includes('ATTENTION') ? 'ad-err' : 'ad-help'} style={{ whiteSpace: 'pre-wrap' }}>{e.notes}</p>}
    <p className="ad-help">{e.student_group === 'child' ? `Parent or guardian: ${e.name} · ` : ''}{e.email} · {e.phone}<br />{fmtDT(e.created_at)}{e.channel === 'manual' ? ' · added manually' : ''}{e.razorpay_payment_id ? ` · Payment ID ${e.razorpay_payment_id}` : ''}</p>
    {editing ? <div className="ad-form"><F form={f} k="status" label="Status" type="select" required options={statusOptions(e.status, 'Transferred', !!e.razorpay_payment_id)} />
      {e.status === 'pending' && ['paid', 'transferred'].includes(f.v.status) && <F form={f} k="method" label="Paid by" type="select" required options={METHOD_OPTIONS} />}
    </div> : <p style={{ margin: '0 0 8px' }}><Badge tone={STATUS[e.status]?.[1]}>{STATUS[e.status]?.[0] || e.status}</Badge></p>}
    <div className="ad-actions full">{editing ? <><Btn busy={busy} onClick={save} icon="check">Save</Btn><Btn variant="ghost" onClick={() => { setEditing(false); f.set('status', e.status); }}>Cancel</Btn></>
      : <>{statusOptions(e.status, 'Transferred', !!e.razorpay_payment_id).length > 1 && <Btn variant="ghost" icon="edit" onClick={() => setEditing(true)}>Edit</Btn>}{refundable(e) && <Btn variant="ghost" icon="file" onClick={() => setReceipt(true)}>Receipt</Btn>}{wa && <a className="ad-btn ghost" href={wa} target="_blank" rel="noopener"><Icon n="whatsapp" size={16} /><span>WhatsApp</span></a>}{refundable(e) && <Btn variant="ghost" icon="wallet" onClick={() => setRefund(true)}>Refund</Btn>}</>}</div>
    {receipt && <ReceiptModal id={e.id} onClose={() => setReceipt(false)} />}
    {refund && <RefundDialog kind="enrolment" rows={[e]} title={`Refund · ${e.student_name}`} onClose={() => setRefund(false)} onDone={onSaved} />}</Modal>);
}
