'use client';
// Orders, workshop sign-ups and class enrolments that were agreed directly (not through the website).
import { useState } from 'react';
import { sb, must, Modal, Btn, F, useForm, useAction, useToast } from './kit';
import { CustomerSuggest, useCustomers, ensureCustomer } from './pickers';
import { syncPaymentsToLedger } from '@/lib/ledgerSync';
import { gstLine } from '@/lib/gst';
import { money, rupeesToPaise } from '@/lib/accounting';
import { RULES } from '@/lib/format';

export const PAY_OPTIONS = [['paid', 'Paid'], ['pending', 'Not paid yet']];
export const METHOD_OPTIONS = [['upi', 'UPI'], ['cash', 'Cash'], ['bank', 'Bank transfer'], ['card', 'Card'], ['other', 'Other']];
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

export function AddOrder({ products, onClose, onSaved }) {
  const { data: customers } = useCustomers(); const [run, busy] = useAction(); const toast = useToast();
  const f = useForm({ name: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', pincode: '', shipping: '', pay: 'paid', method: 'upi' });
  const [items, setItems] = useState([{ slug: '', qty: '1' }]);
  const set = (i, k, v) => setItems((a) => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const lines = items.map((x) => { const p = products.find((q) => q.slug === x.slug); const qty = Math.max(1, parseInt(x.qty || '1', 10)); return p ? { p, qty, g: gstLine(p.price_paise, qty, p.gst_mode) } : null; }).filter(Boolean);
  const subtotal = lines.reduce((s, l) => s + l.g.total, 0), ship = rupeesToPaise(f.v.shipping), total = subtotal + ship;
  const save = (e) => { e.preventDefault(); return run(async () => {
    if (!lines.length) throw new Error('Please choose at least one product.'); if (!f.v.name.trim()) throw new Error('Please add the customer name.');
    const paid = f.v.pay === 'paid';
    const addr = { recipient: f.v.name, phone: f.v.phone, line1: f.v.line1, line2: f.v.line2, city: f.v.city, state: f.v.state, pincode: f.v.pincode };
    const o = must(await sb().from('orders').insert({ name: f.v.name, email: f.v.email || '', phone: f.v.phone || '', shipping_address: addr, subtotal_paise: subtotal, shipping_paise: ship, total_paise: total, status: paid ? 'paid' : 'pending', channel: 'manual', payment_method: paid ? f.v.method : null, paid_at: paid ? nowISO() : null }).select().single());
    must(await sb().from('order_items').insert(lines.map((l) => ({ order_id: o.id, product_id: l.p.id, title: l.p.title, unit_paise: l.p.price_paise, qty: l.qty, gst_paise: l.p.gst_mode === 'none' ? 0 : l.g.gst }))));
    if (paid) for (const l of lines) await sb().from('products').update({ stock: Math.max(0, l.p.stock - l.qty) }).eq('id', l.p.id);
    await ensureCustomer({ name: f.v.name, email: f.v.email, phone: f.v.phone, address_line1: f.v.line1, address_line2: f.v.line2, city: f.v.city, state: f.v.state, pincode: f.v.pincode });
    if (paid) await syncPaymentsToLedger(sb()); onSaved(); }, 'Order added'); };
  return (<Modal title="Add order" onClose={onClose} wide><form className="ad-form" onSubmit={save}>
    <Person f={f} customers={customers} extra />
    <div className="full"><p className="ad-section-t">Products</p>
      {items.map((x, i) => (<div key={i} className="line-row"><select aria-label="Product" value={x.slug} onChange={(e) => set(i, 'slug', e.target.value)}><option value="">Choose a product</option>{products.map((p) => <option key={p.id} value={p.slug}>{p.title} · {money(p.price_paise)}</option>)}</select>
        <input aria-label="Quantity" inputMode="numeric" value={x.qty} onChange={(e) => set(i, 'qty', e.target.value.replace(/\D/g, '').slice(0, 3))} />
        <button type="button" className="ad-x" aria-label="Remove" onClick={() => setItems((a) => (a.length > 1 ? a.filter((_, j) => j !== i) : a))}>✕</button></div>))}
      <div className="ad-actions"><Btn type="button" variant="ghost" className="ad-btn ghost sm" icon="plus" onClick={() => setItems((a) => [...a, { slug: '', qty: '1' }])}>Add product</Btn></div></div>
    <F form={f} k="line1" label="Address line 1" rule="text" /><F form={f} k="line2" label="Address line 2" rule="text" /><F form={f} k="city" label="City" rule="text" /><F form={f} k="state" label="State" rule="text" /><F form={f} k="pincode" label="Pincode" rule="pin" inputMode="numeric" />
    <F form={f} k="shipping" label="Shipping charge (₹)" type="money" rule="money" />
    <PaymentFields f={f} />
    <p className="full ad-help" style={{ margin: 0 }}>Total: <b>{money(total)}</b>{lines.some((l) => l.p.gst_mode === 'add') ? ' (includes GST where it applies)' : ''}</p>
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn></div></form></Modal>);
}

export function AddSignup({ w, taken, onClose, onSaved }) {
  const { data: customers } = useCustomers(); const [run, busy] = useAction();
  const f = useForm({ name: '', phone: '', email: '', seats: '1', amount: String(w.price_paise / 100), pay: 'paid', method: 'upi' });
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
import { recordRefund } from '@/lib/ledgerSync';
const waLink = (p) => { const d = String(p || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? `https://wa.me/91${d}` : null; };
function useStatusSave({ table, row, f, label, desc, amount, party, onSaved }) {
  const [run, busy] = useAction();
  const save = () => run(async () => {
    const becamePaid = row.status === 'pending' && f.v.status !== 'pending';
    must(await sb().from(table).update({ status: f.v.status, ...(becamePaid ? { paid_at: nowISO(), payment_method: f.v.method } : {}) }).eq('id', row.id));
    if (f.v.status === 'refunded' && row.status !== 'refunded') await recordRefund(sb(), { source_id: row.id, amount_paise: amount, party, description: `Refund: ${desc}` });
    if (becamePaid) await syncPaymentsToLedger(sb()); onSaved(); }, label);
  return [save, busy];
}
export function BookingModal({ b, onClose, onSaved }) {
  const f = useForm({ status: b.status, method: b.payment_method || 'upi' });
  const [save, busy] = useStatusSave({ table: 'bookings', row: b, f, label: 'Sign-up updated', desc: b.workshops?.title || 'workshop', amount: b.amount_paise, party: b.name, onSaved }); const wa = waLink(b.phone);
  return (<Modal title={b.name} onClose={onClose}>
    <p style={{ marginTop: 0 }}><b>{b.workshops?.title}</b><br />{b.seats} {b.seats > 1 ? 'seats' : 'seat'} · {money(b.amount_paise)}<br /><span className="ad-help">{b.email} · {b.phone}</span></p>
    <p className="ad-help">Booked {fmtDT(b.created_at)}{b.channel === 'manual' ? ' · added by hand' : ''}{b.razorpay_payment_id ? ` · Payment ID ${b.razorpay_payment_id}` : ''}</p>
    <div className="ad-form"><F form={f} k="status" label="Status" type="select" required options={[['pending', 'Not paid yet'], ['paid', 'Confirmed'], ['transferred', 'Transferred to another date or person'], ['cancelled', 'Cancelled'], ['refunded', 'Refunded']]} />
      {b.status === 'pending' && f.v.status !== 'pending' && f.v.status !== 'cancelled' && <F form={f} k="method" label="Paid by" type="select" required options={METHOD_OPTIONS} />}</div>
    <p className="ad-help">Tickets are non-refundable but can be transferred. Online refunds are made in the Razorpay dashboard.</p>
    <div className="ad-actions full"><Btn busy={busy} onClick={save} icon="check">Save</Btn><Link className="ad-btn ghost" href={`/invoice/${b.id}`} target="_blank">Receipt</Link>{wa && <a className="ad-btn ghost" href={wa} target="_blank" rel="noopener">WhatsApp</a>}</div></Modal>);
}
export function EnrolModal({ e, onClose, onSaved }) {
  const f = useForm({ status: e.status, method: e.payment_method || 'upi' });
  const [save, busy] = useStatusSave({ table: 'class_enrolments', row: e, f, label: 'Enrolment updated', desc: `${e.class_levels?.title || 'class'}, ${e.class_levels?.level || ''}`, amount: e.amount_paise, party: e.name, onSaved }); const wa = waLink(e.phone);
  return (<Modal title={e.student_name} onClose={onClose}>
    <p style={{ marginTop: 0 }}><b>{e.class_levels?.title}, {e.class_levels?.level}</b><br />{e.student_group === 'child' ? `Child, age ${e.student_age}` : 'Adult'} · {money(e.amount_paise)}</p>
    <p className="ad-help">{e.student_group === 'child' ? `Parent or guardian: ${e.name} · ` : ''}{e.email} · {e.phone}<br />{fmtDT(e.created_at)}{e.channel === 'manual' ? ' · added by hand' : ''}{e.razorpay_payment_id ? ` · Payment ID ${e.razorpay_payment_id}` : ''}</p>
    <div className="ad-form"><F form={f} k="status" label="Status" type="select" required options={[['pending', 'Not paid yet'], ['paid', 'Confirmed'], ['transferred', 'Moved to another batch'], ['cancelled', 'Cancelled'], ['refunded', 'Refunded']]} />
      {e.status === 'pending' && f.v.status !== 'pending' && f.v.status !== 'cancelled' && <F form={f} k="method" label="Paid by" type="select" required options={METHOD_OPTIONS} />}</div>
    <div className="ad-actions full"><Btn busy={busy} onClick={save} icon="check">Save</Btn><Link className="ad-btn ghost" href={`/invoice/${e.id}`} target="_blank">Receipt</Link>{wa && <a className="ad-btn ghost" href={wa} target="_blank" rel="noopener">WhatsApp</a>}</div></Modal>);
}
