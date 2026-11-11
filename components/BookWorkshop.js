'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icons';
import { ruleProps } from '@/lib/rules';
import { RULES } from '@/lib/format';
import { payWithRazorpay, postJson, payError } from '@/lib/pay';
import { supabase } from '@/lib/supabase-browser';
import { rupees } from '@/lib/data';
export default function BookWorkshop({ slug, title, price, friendPrice, seatsLeft }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [seats, setSeats] = useState(1); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [pre, setPre] = useState({}); const max = Math.max(1, Math.min(6, seatsLeft ?? 6));
  useEffect(() => { const sb = supabase(); if (!sb || !open) return; sb.auth.getSession().then(async ({ data }) => { const u = data.session?.user; if (!u) return; const { data: p } = await sb.from('profiles').select('full_name,phone').eq('id', u.id).single(); setPre({ name: p?.full_name || '', email: u.email || '', phone: p?.phone || '' }); }); }, [open]);
  const per = seats >= 2 && friendPrice ? friendPrice : price;
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const f = Object.fromEntries(new FormData(e.target));
    const body = { slug, seats, name: RULES.name.done(f.name), email: RULES.email.done(f.email), phone: RULES.phone.done(f.phone) };
    try {
      const sb = supabase(); const token = sb ? (await sb.auth.getSession()).data.session?.access_token : null;
      const o = await postJson('/api/checkout/booking', body, token); if (!o.ok) { setErr(payError(o.error)); setBusy(false); return; }
      const r = await payWithRazorpay(o, `${title} (${seats} ${seats > 1 ? 'seats' : 'seat'})`);
      const v = await postJson('/api/payments/verify', r); if (!v.ok) { setErr('Your payment went through, but we could not confirm it just yet. Please do not pay again. We will email your receipt shortly, or contact us.'); setBusy(false); return; }
      router.push(`/invoice/${o.booking_id}?thanks=1`);
    } catch (x) { setErr(x.message === 'dismissed' ? 'Payment cancelled. Your seat is held for a few minutes.' : 'The payment did not complete. You have not been charged.'); setBusy(false); }
  }
  if (!open) return <button className="btn" onClick={() => setOpen(true)}><Icon n="calendar" size={17} /><span>Reserve</span></button>;
  return (
    <form autoComplete="off" onSubmit={submit} className="form bookform" style={{ margin: '8px 0 0', maxWidth: 420 }}>
      <label><span>Seats <i>*</i></span><select value={seats} onChange={(e) => setSeats(Number(e.target.value))}>{Array.from({ length: max }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
      <label><span>Name <i>*</i></span><input name="name" required defaultValue={pre.name} key={pre.name} autoComplete="off" {...ruleProps('name')} /></label>
      <label><span>Email <i>*</i></span><input name="email" type="email" required defaultValue={pre.email} key={pre.email} autoComplete="off" {...ruleProps('email')} /></label>
      <label><span>Phone <i>*</i></span><input name="phone" type="tel" required defaultValue={pre.phone} key={pre.phone} pattern="[0-9+\s\-]{10,16}" autoComplete="off" {...ruleProps('phone')} /></label>
      <p className="small center">{seats} × {rupees(per)} = <b>{rupees(per * seats)}</b>{seats >= 2 && friendPrice ? ' (friend price applied)' : ''}</p>
      <button className="btn" disabled={busy}><Icon n="wallet" size={17} /><span>{busy ? 'Please wait…' : `Pay ${rupees(per * seats)}`}</span></button>
      <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
      {err && <p className="notice err" role="alert">{err}</p>}
      <p className="small center">Secure payment by Razorpay. Bookings are confirmed on payment.</p>
    </form>);
}
