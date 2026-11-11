'use client';
import { useEffect } from 'react';
import { useLoad, sb, must, Page, Card, Spin, Err, Btn, F, useForm, useAction } from './kit';
import { rupeesToPaise } from '@/lib/accounting';
const get = (rows, k, d) => ({ ...d, ...(rows.find((r) => r.key === k)?.value || {}) });
export default function Settings() {
  const { data, error } = useLoad(async () => must(await sb().from('settings').select('key,value')));
  if (error) return <Page title="Settings"><Err e={error} /></Page>; if (!data) return <Page title="Settings"><Spin /></Page>;
  return (<Page title="Settings">
    <Business rows={data} /><Gst rows={data} /><Shipping rows={data} />
    <Card title="Install this app"><p className="ad-help" style={{ margin: 0 }}>On iPhone: open this page in Safari, tap Share, then "Add to Home Screen". On Android: open the browser menu and tap "Install app". It then opens like any other app.</p></Card>
    <Card title="Sign out"><Btn variant="ghost" onClick={() => sb().auth.signOut()}>Sign out of this device</Btn></Card>
  </Page>);
}
async function save(key, value, pub) { must(await sb().from('settings').upsert({ key, value, is_public: pub })); }
function Business({ rows }) {
  const b = get(rows, 'business', {}); const [run, busy] = useAction();
  const f = useForm({ name: b.name || 'Thin Black Brush', phone: b.phone || '', phone2: b.phone2 || '', email: b.email || '', address: b.address || '', instagram: b.instagram || '', facebook: b.facebook || '', whatsapp: b.whatsapp || '', upi: b.upi || '' });
  return (<Card title="Business details"><p className="ad-help" style={{ marginTop: 0 }}>These appear on receipts and invoices.</p>
    <form className="ad-form" onSubmit={(e) => { e.preventDefault(); run(() => save('business', f.v, true), 'Saved'); }}>
      <F form={f} k="name" label="Business name" rule="name" required /><F form={f} k="email" label="Email" type="email" rule="email" required />
      <F form={f} k="phone" label="Phone" type="tel" rule="phone" required /><F form={f} k="phone2" label="Second phone" type="tel" rule="phone" />
      <div className="full"><F form={f} k="address" label="Address" type="textarea" rule="text" rows={3} required /></div>
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
