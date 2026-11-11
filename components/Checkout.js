'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Btn from './Btn';
import Icon from './Icons';
import { useCart } from './Cart';
import { useShipping } from './CartView';
import { ruleProps } from '@/lib/rules';
import { RULES } from '@/lib/format';
import { payWithRazorpay, postJson, payError } from '@/lib/pay';
import { supabase } from '@/lib/supabase-browser';
import { rupees } from '@/lib/data';
export default function Checkout() {
  const { items, subtotal, clear } = useCart(); const ship = useShipping()(subtotal); const router = useRouter();
  const [pre, setPre] = useState({}); const [saved, setSaved] = useState([]); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [pick, setPick] = useState('');
  useEffect(() => { const sb = supabase(); if (!sb) return; sb.auth.getSession().then(async ({ data }) => { const u = data.session?.user; if (!u) return;
    const [{ data: p }, { data: a }] = await Promise.all([sb.from('profiles').select('full_name,phone').eq('id', u.id).single(), sb.from('addresses').select('*').eq('user_id', u.id)]);
    setPre({ name: p?.full_name || '', email: u.email || '', phone: p?.phone || '' }); setSaved(a || []); }); }, []);
  const addr = saved.find((a) => a.id === pick) || {};
  if (!items.length) return <div className="center"><p className="lead" style={{ marginTop: 0 }}>Your basket is empty.</p><div className="row c"><Btn href="/store" icon="basket">Shop</Btn></div></div>;
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const f = Object.fromEntries(new FormData(e.target)); const R = RULES;
    const body = { items: items.map((i) => ({ slug: i.slug, qty: i.qty })), gift_message: R.sentence.done(f.gift || ''),
      customer: { name: R.name.done(f.name), email: R.email.done(f.email), phone: R.phone.done(f.phone) },
      address: { recipient: R.name.done(f.recipient || f.name), phone: R.phone.done(f.aphone || f.phone), line1: R.text.done(f.line1), line2: R.text.done(f.line2 || ''), city: R.text.done(f.city), state: R.text.done(f.state), pincode: R.pin.done(f.pincode) } };
    try {
      const sb = supabase(); const token = sb ? (await sb.auth.getSession()).data.session?.access_token : null;
      const o = await postJson('/api/checkout/order', body, token); if (!o.ok) { setErr(payError(o.error)); setBusy(false); return; }
      const r = await payWithRazorpay(o, 'Thin Black Brush order');
      const v = await postJson('/api/payments/verify', r);
      if (!v.ok) { setErr('Your payment went through, but we could not confirm it just yet. Please do not pay again. We will email your receipt shortly, or contact us.'); setBusy(false); return; }
      clear(); router.push(`/invoice/${o.order_id}?thanks=1`);
    } catch (x) { setErr(x.message === 'dismissed' ? 'Payment cancelled. You have not been charged.' : 'The payment did not complete. You have not been charged.'); setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="form" style={{ margin: 0, maxWidth: 'none' }}>
      <h3>Contact</h3>
      <label><span>Name <i>*</i></span><input name="name" required defaultValue={pre.name} key={'n' + pre.name} autoComplete="name" {...ruleProps('name')} /></label>
      <label><span>Email <i>*</i></span><input name="email" type="email" required defaultValue={pre.email} key={'e' + pre.email} autoComplete="email" {...ruleProps('email')} /></label>
      <label><span>Phone <i>*</i></span><input name="phone" type="tel" required defaultValue={pre.phone} key={'p' + pre.phone} pattern="[0-9+\s\-]{10,16}" autoComplete="tel" {...ruleProps('phone')} /></label>
      <h3 style={{ marginTop: 12 }}>Delivery address</h3>
      {saved.length > 0 && <label><span>Saved addresses</span><select value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Enter a new address</option>{saved.map((a) => <option key={a.id} value={a.id}>{a.label} · {a.line1}</option>)}</select></label>}
      <label key={'r' + pick}><span>Recipient name <em>(optional)</em></span><input name="recipient" defaultValue={addr.recipient || ''} {...ruleProps('name')} /></label>
      <label key={'l1' + pick}><span>Address line 1 <i>*</i></span><input name="line1" required defaultValue={addr.line1 || ''} autoComplete="address-line1" {...ruleProps('text')} /></label>
      <label key={'l2' + pick}><span>Address line 2 <em>(optional)</em></span><input name="line2" defaultValue={addr.line2 || ''} autoComplete="address-line2" {...ruleProps('text')} /></label>
      <label key={'c' + pick}><span>City <i>*</i></span><input name="city" required defaultValue={addr.city || ''} autoComplete="address-level2" {...ruleProps('text')} /></label>
      <label key={'s' + pick}><span>State <i>*</i></span><input name="state" required defaultValue={addr.state || ''} autoComplete="address-level1" {...ruleProps('text')} /></label>
      <label key={'z' + pick}><span>Pincode <i>*</i></span><input name="pincode" required defaultValue={addr.pincode || ''} inputMode="numeric" pattern="[0-9]{6}" autoComplete="postal-code" {...ruleProps('pin')} /></label>
      <label><span>Gift message <em>(optional)</em></span><textarea name="gift" maxLength={500} {...ruleProps('sentence')} /></label>
      <div className="sum" style={{ marginTop: 8 }}>{items.map((i) => <div key={i.slug}><span>{i.title} × {i.qty}</span><span>{rupees(i.price * i.qty)}</span></div>)}
        <div><span>Shipping</span><span>{ship === null ? '…' : ship ? rupees(ship) : 'Free'}</span></div><div className="tot"><span>Total</span><span>{rupees(subtotal + (ship || 0))}</span></div></div>
      <button className="btn" disabled={busy || ship === null}><Icon n="check" size={17} /><span>{busy ? 'Please wait…' : `Pay ${rupees(subtotal + (ship || 0))}`}</span></button>
      {err && <p className="notice err" role="alert">{err}</p>}
      <p className="small center">Secure payment by Razorpay: UPI, cards and netbanking. We never see your card details.</p>
    </form>);
}
