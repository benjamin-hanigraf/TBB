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
  const { items, subtotal, itemsTotal, gstAdd, clear } = useCart(); const ship = useShipping()(subtotal); const router = useRouter();
  const [pre, setPre] = useState({}); const [addr, setAddr] = useState({}); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { const sb = supabase(); if (!sb) return; sb.auth.getSession().then(async ({ data }) => { const u = data.session?.user; if (!u) return;
    const [{ data: p }, { data: last }] = await Promise.all([sb.from('profiles').select('full_name,phone').eq('id', u.id).single(), sb.from('orders').select('shipping_address,name,phone').eq('user_id', u.id).order('created_at', { ascending: false }).limit(1)]);
    setPre({ name: p?.full_name || last?.[0]?.name || '', email: u.email || '', phone: p?.phone || last?.[0]?.phone || '' }); setAddr(last?.[0]?.shipping_address || {}); }); }, []);
  if (!items.length) return <div className="center"><p className="lead" style={{ marginTop: 0 }}>Your bag is empty.</p><div className="row c"><Btn href="/store" icon="bag">Visit Store</Btn></div></div>;
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
    <form autoComplete="off" onSubmit={submit} className="form" style={{ margin: 0, maxWidth: 'none' }}>
      <h3>Contact</h3>
      <label><span>Name <i>*</i></span><input name="name" required defaultValue={pre.name} key={'n' + pre.name} autoComplete="off" {...ruleProps('name')} /></label>
      <label><span>Email <i>*</i></span><input name="email" type="email" required defaultValue={pre.email} key={'e' + pre.email} autoComplete="off" {...ruleProps('email')} /></label>
      <label><span>Phone <i>*</i></span><input name="phone" type="tel" required defaultValue={pre.phone} key={'p' + pre.phone} pattern="[0-9+\s\-]{10,16}" autoComplete="off" {...ruleProps('phone')} /></label>
      <h3 style={{ marginTop: 12 }}>Delivery address</h3>
      {addr.line1 && <p className="small" style={{ margin: 0 }}>Filled in from your last order. Change anything you need.</p>}
      <label key={'r' + (addr.line1 || '')}><span>Recipient name <em>(optional)</em></span><input name="recipient" defaultValue={addr.recipient || ''} {...ruleProps('name')} /></label>
      <label key={'l1' + (addr.line1 || '')}><span>Address line 1 <i>*</i></span><input name="line1" required defaultValue={addr.line1 || ''} autoComplete="off" {...ruleProps('text')} /></label>
      <label key={'l2' + (addr.line1 || '')}><span>Address line 2 <em>(optional)</em></span><input name="line2" defaultValue={addr.line2 || ''} autoComplete="off" {...ruleProps('text')} /></label>
      <label key={'c' + (addr.line1 || '')}><span>City <i>*</i></span><input name="city" required defaultValue={addr.city || ''} autoComplete="off" {...ruleProps('text')} /></label>
      <label key={'s' + (addr.line1 || '')}><span>State <i>*</i></span><input name="state" required defaultValue={addr.state || ''} autoComplete="off" {...ruleProps('text')} /></label>
      <label key={'z' + (addr.line1 || '')}><span>Pincode <i>*</i></span><input name="pincode" required defaultValue={addr.pincode || ''} inputMode="numeric" pattern="[0-9]{6}" autoComplete="off" {...ruleProps('pin')} /></label>
      <label><span>Gift message <em>(optional)</em></span><textarea name="gift" maxLength={500} {...ruleProps('sentence')} /></label>
      <div className="sum" style={{ marginTop: 8 }}>{items.map((i) => <div key={i.slug}><span>{i.title} × {i.qty}</span><span>{rupees(i.price * i.qty)}</span></div>)}
        {gstAdd > 0 && <div><span>GST (18%)</span><span>{rupees(gstAdd)}</span></div>}<div><span>Shipping</span><span>{ship === null ? '…' : ship ? rupees(ship) : 'Free'}</span></div><div className="tot"><span>Total</span><span>{rupees(subtotal + (ship || 0))}</span></div></div>
      <button className="btn" disabled={busy || ship === null}><Icon n="check" size={17} /><span>{busy ? 'Please wait…' : `Pay ${rupees(subtotal + (ship || 0))}`}</span></button>
      {err && <p className="notice err" role="alert">{err}</p>}
      <p className="small center">Secure payment by Razorpay: UPI, cards and netbanking. We never see your card details.</p>
    </form>);
}
