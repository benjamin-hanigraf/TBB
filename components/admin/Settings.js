'use client';
import { useEffect } from 'react';
import { useLoad, sb, must, Page, Card, Spin, Err, Btn, F, useForm, useAction } from './kit';
import { rupeesToPaise } from '@/lib/accounting';
import { pinApi, setToken } from '@/lib/adminApi';
import { useState } from 'react';
const get = (rows, k, d) => ({ ...d, ...(rows.find((r) => r.key === k)?.value || {}) });
export default function Settings() {
  const { data, error } = useLoad(async () => must(await sb().from('settings').select('key,value')));
  if (error) return <Page title="Settings"><Err e={error} /></Page>; if (!data) return <Page title="Settings"><Spin /></Page>;
  return (<Page title="Settings">
    <Business rows={data} /><Gst rows={data} /><Shipping rows={data} />
    <PinCard /><InstallCard />
    <Card title="Sign out"><Btn variant="ghost" onClick={() => sb().auth.signOut()}>Sign out of this device</Btn></Card>
  </Page>);
}
async function save(key, value, pub) { must(await sb().from('settings').upsert({ key, value, is_public: pub })); }
function Business({ rows }) {
  const b = get(rows, 'business', {}); const [run, busy] = useAction();
  const f = useForm({ name: b.name || 'Thin Black Brush', phone: b.phone || '', phone2: b.phone2 || '', map: b.map || '', email: b.email || '', address: b.address || '', instagram: b.instagram || '', facebook: b.facebook || '', whatsapp: b.whatsapp || '', upi: b.upi || '' });
  return (<Card title="Business details"><p className="ad-help" style={{ marginTop: 0 }}>These appear on receipts and invoices.</p>
    <form className="ad-form" onSubmit={(e) => { e.preventDefault(); run(() => save('business', f.v, true), 'Saved'); }}>
      <F form={f} k="name" label="Business name" rule="name" required /><F form={f} k="email" label="Email" type="email" rule="email" required />
      <F form={f} k="phone" label="Phone" type="tel" rule="phone" required /><F form={f} k="phone2" label="Second phone" type="tel" rule="phone" />
      <div className="full"><F form={f} k="address" label="Address" type="textarea" rule="text" rows={3} required /></div>
      <div className="full"><F form={f} k="map" label="Google Maps link" type="url" hint="Customers tap the address in receipts to open this" /></div>
      <F form={f} k="instagram" label="Instagram link" type="url" /><F form={f} k="facebook" label="Facebook link" type="url" />
      <F form={f} k="whatsapp" label="WhatsApp number" rule="digits" hint="With country code, e.g. 919962050962" /><F form={f} k="upi" label="UPI ID" />
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn></div></form></Card>);
}
function Gst({ rows }) {
  const g = get(rows, 'gst', { enabled: false, gstin: '', rate_percent: 18 }); const inv = get(rows, 'invoice', { prefix: 'TBB/YYYY-YY', terms: '' }); const [run, busy] = useAction();
  const f = useForm({ enabled: !!g.enabled, gstin: g.gstin || '', rate: String(g.rate_percent || 18), prefix: inv.prefix || 'TBB/YYYY-YY', terms: inv.terms || '' });
  return (<Card title="GST and invoices"><p className="ad-help" style={{ marginTop: 0 }}>Turn GST on only once the business is registered. Shop and workshop prices are treated as GST-inclusive.</p>
    <form className="ad-form" onSubmit={(e) => { e.preventDefault(); if (f.v.enabled && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(f.v.gstin)) return run(async () => { throw new Error('Please enter a valid 15-character GSTIN.'); });
      run(async () => { await save('gst', { enabled: f.v.enabled, gstin: f.v.gstin, rate_percent: Number(f.v.rate) || 18 }, false); await save('invoice', { prefix: f.v.prefix || 'TBB/YYYY-YY', terms: f.v.terms }, false); }, 'Saved'); }}>
      <div className="full"><F form={f} k="enabled" label="My business is registered for GST" type="check" /></div>
      {f.v.enabled && <><F form={f} k="gstin" label="GSTIN" rule="code" required maxLength={15} /><F form={f} k="rate" label="GST rate (%)" rule="digits" required inputMode="numeric" /></>}
      <F form={f} k="prefix" label="Invoice number prefix" rule="code" hint="YYYY-YY becomes the financial year, e.g. TBB/2026-27/001" />
      <div className="full"><F form={f} k="terms" label="Note at the bottom of invoices" rule="sentence" /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn></div></form></Card>);
}
function Shipping({ rows }) {
  const s = get(rows, 'shipping', { flat_paise: 6000, free_above_paise: 200000 }); const [run, busy] = useAction();
  const f = useForm({ flat: String((s.flat_paise || 0) / 100), free: String((s.free_above_paise || 0) / 100) });
  return (<Card title="Shipping"><form className="ad-form" onSubmit={(e) => { e.preventDefault(); run(() => save('shipping', { flat_paise: rupeesToPaise(f.v.flat), free_above_paise: rupeesToPaise(f.v.free) }, true), 'Saved'); }}>
    <F form={f} k="flat" label="Shipping charge per order (₹)" type="money" rule="money" required /><F form={f} k="free" label="Free shipping above (₹)" type="money" rule="money" hint="Enter 0 for no free shipping" />
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn></div></form></Card>);
}

function PinCard() {
  const [run, busy] = useAction(); const [def, setDef] = useState(false); const f = useForm({ current: '', next: '', again: '' });
  useEffect(() => { try { setDef(!!sessionStorage.getItem('tbb-defpin')); } catch {} }, []);
  const submit = (e) => { e.preventDefault(); run(async () => {
    if (!/^\d{4}$/.test(f.v.next)) throw new Error('The new PIN must be exactly 4 digits.'); if (f.v.next !== f.v.again) throw new Error('The two new PINs do not match.');
    const r = await pinApi({ action: 'change', current: f.v.current, next: f.v.next });
    if (!r.ok) throw new Error(r.status === 401 ? 'The current PIN is not right.' : r.status === 429 ? 'Too many wrong tries. Please wait 15 minutes.' : 'Could not change the PIN. Please try again.');
    setToken(r.token); try { sessionStorage.setItem('tbb-defpin', ''); } catch {} setDef(false); f.reset({ current: '', next: '', again: '' });
  }, 'PIN changed. Other devices will ask for the new PIN.'); };
  const dg = { type: 'password', rule: 'digits', required: true, inputMode: 'numeric', maxLength: 4, autoComplete: 'off' };
  return (<Card title="Device PIN"><p className="ad-help" style={{ marginTop: 0 }}>{def ? 'You are still using the starting PIN (0000). Please change it.' : 'A new device asks for this PIN the first time it signs in.'}</p>
    <form className="ad-form" onSubmit={submit}><F form={f} k="current" label="Current PIN" {...dg} /><div /><F form={f} k="next" label="New PIN" {...dg} /><F form={f} k="again" label="New PIN again" {...dg} />
      <div className="ad-actions full"><Btn busy={busy} icon="check">Change PIN</Btn><Btn type="button" variant="ghost" onClick={() => { setToken(''); location.reload(); }}>Lock this device now</Btn></div></form></Card>);
}
function InstallCard() {
  const [can, setCan] = useState(false); useEffect(() => { setCan(!!window.__bip); }, []);
  const install = async () => { const e = window.__bip; if (!e) return; e.prompt(); await e.userChoice; window.__bip = null; setCan(false); };
  return (<Card title="Install this app"><p className="ad-help" style={{ marginTop: 0 }}>The app always opens at <b>/admin</b> on your website. Install it to get an app icon on your phone.</p>
    {can && <Btn icon="download" onClick={install}>Install</Btn>}<p className="ad-help">iPhone: open this page in Safari, tap Share, then "Add to Home Screen". Android: tap the menu, then "Install app".</p></Card>);
}
