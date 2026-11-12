'use client';
import { useEffect } from 'react';
import { useLoad, sb, must, Page, Card, Spin, Err, Btn, F, useForm, useAction } from './kit';
import { rupeesToPaise } from '@/lib/accounting';
import { ADDRESS_TEXT } from '@/lib/address';
import { pinApi, setToken } from '@/lib/adminApi';
import { useState } from 'react';
const get = (rows, k, d) => ({ ...d, ...(rows.find((r) => r.key === k)?.value || {}) });
export default function Settings() {
  const { data, error } = useLoad(async () => must(await sb().from('settings').select('key,value')));
  if (error) return <Page title="Settings"><Err e={error} /></Page>; if (!data) return <Page title="Settings"><Spin /></Page>;
  return (<Page title="Settings"><Main rows={data} /><PinCard /><InstallRow /></Page>);
}
async function save(key, value, pub) { must(await sb().from('settings').upsert({ key, value, is_public: pub })); }
function Main({ rows }) {
  const b = get(rows, 'business', {}); const g = get(rows, 'gst', { enabled: false, gstin: '', rate_percent: 18 }); const inv = get(rows, 'invoice', { prefix: 'TBB/YYYY-YY', start: 1, terms: '' }); const s = get(rows, 'shipping', { flat_paise: 6000, free_above_paise: 200000 }); const [run, busy] = useAction();
  const f = useForm({ name: b.name || 'Thin Black Brush', phone: b.phone || '', phone2: b.phone2 || '', map: b.map || '', email: b.email || '', address: b.address || ADDRESS_TEXT, instagram: b.instagram || '', facebook: b.facebook || '', whatsapp: b.whatsapp || '', upi: b.upi || '',
    enabled: !!g.enabled, gstin: g.gstin || '', prefix: inv.prefix || 'TBB/YYYY-YY', start: String(inv.start || 1), terms: inv.terms || '', flat: String((s.flat_paise || 0) / 100), free: String((s.free_above_paise || 0) / 100) });
  const submit = (e) => { e.preventDefault(); run(async () => {
    const v = f.v; if (v.enabled && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.gstin)) throw new Error('Please enter a valid 15-character GSTIN, or turn GST off.');
    const start = Math.max(1, parseInt(v.start || '1', 10) || 1);
    await save('business', { name: v.name, phone: v.phone, phone2: v.phone2, map: v.map, email: v.email, address: v.address, instagram: v.instagram, facebook: v.facebook, whatsapp: v.whatsapp, upi: v.upi }, true);
    await save('gst', { enabled: v.enabled, gstin: v.gstin, rate_percent: g.rate_percent || 18 }, false);
    await save('invoice', { prefix: v.prefix || 'TBB/YYYY-YY', start, terms: v.terms }, false);
    await save('shipping', { flat_paise: rupeesToPaise(v.flat), free_above_paise: rupeesToPaise(v.free) }, true);
  }, 'Settings saved'); };
  return (<form onSubmit={submit}>
    <Card title="Business details"><div className="ad-form">
      <F form={f} k="name" label="Business name" rule="name" required /><F form={f} k="email" label="Email" type="email" rule="email" required />
      <F form={f} k="phone" label="Phone" type="tel" rule="phone" required /><F form={f} k="phone2" label="Second phone" type="tel" rule="phone" />
      <div className="full"><F form={f} k="address" label="Address" type="textarea" rule="text" rows={3} required /></div>
      <div className="full"><F form={f} k="map" label="Google Maps link" type="url" /></div>
      <F form={f} k="instagram" label="Instagram link" type="url" /><F form={f} k="facebook" label="Facebook link" type="url" />
      <F form={f} k="whatsapp" label="WhatsApp number" rule="digits" hint="With country code, e.g. 919962050962" /><F form={f} k="upi" label="UPI ID" /></div></Card>
    <Card title="Invoices and GST"><div className="ad-form">
      <F form={f} k="prefix" label="Default invoice number prefix" rule="code" hint="YYYY-YY becomes the financial year, e.g. TBB/2026-27/001" />
      <F form={f} k="start" label="Start numbering from" rule="digits" inputMode="numeric" hint="The next invoice gets this number if it is higher than the last one used" />
      <div className="full"><F form={f} k="terms" label="Note at the bottom of invoices" rule="sentence" /></div>
      <div className="full"><F form={f} k="enabled" label="My business is registered for GST" type="check" /></div>
      {f.v.enabled && <F form={f} k="gstin" label="GSTIN" rule="code" required maxLength={15} />}</div></Card>
    <Card title="Shipping"><div className="ad-form"><F form={f} k="flat" label="Shipping charge per order (₹)" type="money" rule="money" required /><F form={f} k="free" label="Free shipping above (₹)" type="money" rule="money" hint="Enter 0 for no free shipping" /></div></Card>
    <div className="ad-actions"><Btn busy={busy} icon="check">Save settings</Btn></div></form>);
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
      <div className="ad-actions full"><Btn busy={busy} icon="check">Change PIN</Btn></div></form></Card>);
}
function InstallRow() {
  const [can, setCan] = useState(false); useEffect(() => { setCan(!!window.__bip); }, []);
  const install = async () => { const e = window.__bip; if (!e) return; e.prompt(); await e.userChoice; window.__bip = null; setCan(false); };
  return (<p className="ad-help install-row">Add this app to your phone: on iPhone use Safari, Share, then "Add to Home Screen"; on Android use the menu, then "Install app".{can && <button type="button" className="ad-linkbtn" onClick={install}>Install now</button>}</p>);
}
