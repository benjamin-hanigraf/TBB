'use client';
import { useState } from 'react';
import { sb, must, useLoad, Modal, Btn, F, useForm, useAction, useToast, Empty, Err, Spin, Badge, fmtD } from './kit';
import { adminPost } from '@/lib/adminApi';
import { RefundDialog } from './Refund';
import { money } from '@/lib/accounting';
const wa = (phone, text) => { const d = String(phone || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? `https://wa.me/91${d}?text=${encodeURIComponent(text)}` : null; };

/** Email everyone in a workshop, a class batch or a waitlist. If email is not set up yet, WhatsApp links for each person are shown instead. */
export function MessageModal({ audience, id, title, people, onClose }) {
  const [run, busy] = useAction(); const toast = useToast(); const f = useForm({ subject: '', message: '' }); const [res, setRes] = useState(null);
  const send = (e) => { e.preventDefault(); return run(async () => {
    if (f.v.subject.trim().length < 3) throw new Error('Please add a subject.'); if (f.v.message.trim().length < 5) throw new Error('Please write a message.');
    const r = await adminPost('/api/manager/message', { audience, id, subject: f.v.subject, message: f.v.message });
    if (r.error === 'email_not_set_up') { setRes({ noEmail: true }); return; } if (!r.ok) throw new Error('Could not send. Please try again.'); setRes(r); toast(`Sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}`); }); };
  return (<Modal title={`Message · ${title}`} onClose={onClose}>
    {res?.ok ? <><p style={{ marginTop: 0 }}>Sent to <b>{res.sent}</b> {res.sent === 1 ? 'person' : 'people'}{res.failed ? `, ${res.failed} failed` : ''}{res.skipped ? `, ${res.skipped} had no valid email` : ''}.</p><div className="ad-actions full"><Btn onClick={onClose}>Done</Btn></div></>
    : <form className="ad-form" onSubmit={send}>
      <p className="full ad-help" style={{ margin: 0 }}>This goes to {people.length} {people.length === 1 ? 'person' : 'people'} by email. Each person gets their own copy.</p>
      <div className="full"><F form={f} k="subject" label="Subject" rule="sentence" required /></div>
      <div className="full"><F form={f} k="message" label="Message" type="textarea" rule="sentence" required rows={6} /></div>
      {res?.noEmail && <div className="full ad-err">Email sending is not set up yet. You can message each person on WhatsApp instead:
        <div className="ad-list" style={{ marginTop: 8 }}>{people.map((p, i) => { const l = wa(p.phone, `${f.v.subject}\n\n${f.v.message}`); return <div key={i} className="ad-row" style={{ cursor: 'default' }}><span>{p.name}</span>{l ? <a className="ad-btn ghost sm" href={l} target="_blank" rel="noopener">WhatsApp</a> : <small className="ad-help">No phone</small>}</div>; })}</div></div>}
      <div className="ad-actions full"><Btn busy={busy} icon="mail">Send</Btn><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn></div></form>}
  </Modal>);
}

/** Cancel a workshop and refund the people who paid: choose who, then refund online or record refunds you sent yourself. */
export function RefundModal({ workshop, bookings, onClose, onDone }) {
  const paid = bookings.filter((b) => b.status === 'paid'); const [pick, setPick] = useState(() => Object.fromEntries(paid.map((b) => [b.id, true]))); const [cancel, setCancel] = useState(true);
  const [run, busy] = useAction(); const [step, setStep] = useState('pick');
  const chosen = paid.filter((b) => pick[b.id]); const total = chosen.reduce((s, b) => s + b.amount_paise, 0);
  const next = () => run(async () => {
    if (cancel && workshop.status !== 'cancelled') must(await sb().from('workshops').update({ status: 'cancelled' }).eq('id', workshop.id));
    if (!chosen.length) { onDone(); onClose(); return; } setStep('refund'); }, cancel && !chosen.length ? 'Workshop cancelled' : undefined);
  if (step === 'refund') return <RefundDialog kind="booking" rows={chosen} title={`Refund · ${workshop.title}`} reasonDefault={cancel ? 'The workshop has been cancelled.' : ''} cancelled={cancel} onClose={() => { onDone(); onClose(); }} onDone={() => { onDone(); onClose(); }} />;
  return (<Modal title={`Cancel and refund · ${workshop.title}`} onClose={onClose} wide>
    <p className="ad-help" style={{ marginTop: 0 }}>Everyone below paid for this workshop. Choose who to refund. Next, you choose to refund online or to record refunds you sent yourself.</p>
    {paid.length ? <div className="ad-list">{paid.map((b) => <label key={b.id} className="ad-row" style={{ cursor: 'pointer' }}><span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><input type="checkbox" checked={!!pick[b.id]} onChange={(e) => setPick((p) => ({ ...p, [b.id]: e.target.checked }))} /><span className="main"><b>{b.name}</b><small>{b.seats} {b.seats > 1 ? 'seats' : 'seat'} · {b.razorpay_payment_id ? 'paid online' : `paid by ${b.payment_method || 'hand'}`}</small></span></span><b>{money(b.amount_paise)}</b></label>)}</div> : <Empty>Nobody has paid yet.</Empty>}
    <div className="ad-form" style={{ marginTop: 14 }}><div className="full"><F form={{ v: { c: cancel }, set: (k, v) => setCancel(v) }} k="c" label="Also mark this workshop as cancelled" type="check" /></div></div>
    <p style={{ margin: '14px 0 0' }}>Refunding <b>{chosen.length}</b> {chosen.length === 1 ? 'person' : 'people'}: <b>{money(total)}</b>.</p>
    <div className="ad-actions full"><Btn busy={busy} disabled={!chosen.length && !cancel} onClick={next}>{chosen.length ? 'Next' : 'Cancel workshop'}</Btn><Btn variant="ghost" onClick={onClose}>Back</Btn></div>
  </Modal>);
}

/** People waiting for a seat in a sold-out workshop. */
export function Waitlist({ workshop, onMessage }) {
  const { data, error, reload } = useLoad(async () => must(await sb().from('workshop_waitlist').select('*').eq('workshop_id', workshop.id).order('created_at')), [workshop.id]);
  const [run] = useAction();
  if (error) return <Err e={error} />; if (!data) return <Spin />; if (!data.length) return null;
  return (<><p className="ad-section-t" style={{ marginTop: 22 }}>Waitlist ({data.length})</p>
    <div className="ad-list">{data.map((p) => <div key={p.id} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{p.name}</b><small>{[p.phone, p.email].filter(Boolean).join(' · ')} · {p.seats} {p.seats > 1 ? 'seats' : 'seat'} · since {fmtD(p.created_at)}{p.notified_at ? ` · contacted ${fmtD(p.notified_at)}` : ''}</small></div>
      <div className="end">{wa(p.phone, `Hi ${p.name.split(' ')[0]}, a seat has opened up for ${workshop.title}. Would you like it?`) && <a className="ad-btn ghost sm" target="_blank" rel="noopener" onClick={() => { sb().from('workshop_waitlist').update({ notified_at: new Date().toISOString() }).eq('id', p.id).then(() => reload()); }} href={wa(p.phone, `Hi ${p.name.split(' ')[0]}, a seat has opened up for ${workshop.title}. Would you like it?`)}>WhatsApp</a>}
        <button className="ad-btn ghost sm" onClick={() => run(async () => { must(await sb().from('workshop_waitlist').delete().eq('id', p.id)); reload(); })}>Remove</button></div></div>)}</div>
    <div className="ad-actions"><Btn variant="ghost" icon="mail" onClick={() => onMessage(data)}>Email the waitlist</Btn></div></>);
}
