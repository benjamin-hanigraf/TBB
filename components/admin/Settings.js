'use client';
import { useEffect, useState } from 'react';
import { useLoad, sb, must, clearCache, Page, Fold, Spin, Err, Btn, F, useForm, useAction } from './kit';
import DataTools from './DataTools';
import { rupeesToPaise, todayISO } from '@/lib/accounting';
import { ADDRESS_TEXT } from '@/lib/address';
import { formatFor, formatNumber, validFormat } from '@/lib/numbering';
import { pinApi, setToken, applySession } from '@/lib/adminApi';

const get = (rows, k, d) => ({ ...d, ...(rows.find((r) => r.key === k)?.value || {}) });
/** "maps.app.goo.gl/abc" -> "https://maps.app.goo.gl/abc". Empty stays empty. Returns null when it cannot be a web address. */
export function webAddress(v) {
  const t = String(v || '').trim(); if (!t) return ''; const u = /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, '')}`;
  try { const h = new URL(u).hostname; return h.includes('.') && !/\s/.test(t) ? u : null; } catch { return null; }
}
export default function Settings() {
  const { data, error, fresh } = useLoad(async () => must(await sb().from('settings').select('key,value')));
  if (error) return <Page title="Settings"><Err e={error} /></Page>;
  if (!data || !fresh) return <Page title="Settings"><Spin /></Page>;       // the form starts from the freshly loaded settings, never from an old remembered copy
  return (<Page title="Settings"><Main rows={data} /><Fold big tight={false} title="Data"><DataTools /></Fold><Fold big tight={false} title="Device PIN"><PinCard /></Fold><InstallRow /></Page>);
}
async function save(key, value, pub) { must(await sb().from('settings').upsert({ key, value, is_public: pub })); }

function Preview({ format, n }) {
  const bad = validFormat(format); if (bad) return <p className="ad-err full" role="alert" style={{ margin: 0 }}>{bad}</p>;
  return <p className="ad-help full" style={{ margin: 0 }}>Looks like: <b style={{ color: '#1d1d1f' }}>{formatNumber(format, Math.max(1, Number(n) || 1), todayISO())}</b></p>;
}

function Main({ rows }) {
  const b = get(rows, 'business', {}); const g = get(rows, 'gst', { enabled: false, gstin: '', rate_percent: 18 }); const inv = get(rows, 'invoice', {}); const ord = get(rows, 'order', {}); const s = get(rows, 'shipping', { flat_paise: 6000, free_above_paise: 200000 });
  const gw = get(rows, 'gateway', { fee_percent: 2 }); const st = get(rows, 'store', { shipping_note: '', return_note: '' }); const [run, busy] = useAction(); const all = rows.reduce((o, r) => ({ ...o, [r.key]: r.value }), {});
  const f = useForm({ name: b.name || 'Thin Black Brush', phone: b.phone || '', phone2: b.phone2 || '', map: b.map || '', email: b.email || '', address: b.address || ADDRESS_TEXT, instagram: b.instagram || '', facebook: b.facebook || '', whatsapp: b.whatsapp || '', upi: b.upi || '',
    enabled: !!g.enabled, gstin: g.gstin || '', terms: inv.terms || '',
    invFormat: formatFor('invoice', all), invStart: String(inv.start || 1), quoFormat: formatFor('quotation', all), quoStart: String(inv.quotation_start || 1), ordFormat: formatFor('order', all), ordStart: String(ord.start || 1),
    fee: String(gw.fee_percent ?? 2), flat: String((s.flat_paise || 0) / 100), free: String((s.free_above_paise || 0) / 100), shipNote: st.shipping_note || '', returnNote: st.return_note || '' });
  const submit = (e) => { e.preventDefault(); run(async () => {
    const v = f.v;
    if (!v.name.trim() || !v.email.trim() || !v.phone.trim() || !v.address.trim()) throw new Error('Please fill in the business name, email, phone and address.');
    const map = webAddress(v.map), ig = webAddress(v.instagram), fb = webAddress(v.facebook);
    if (map === null) throw new Error('The Google Maps link does not look right. Paste the link you get from Google Maps, Share.'); if (ig === null) throw new Error('The Instagram link does not look right.'); if (fb === null) throw new Error('The Facebook link does not look right.');
    if (v.enabled && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.gstin)) throw new Error('Please enter a valid 15-character GSTIN, or turn GST off.');
    for (const [k, label] of [['invFormat', 'invoice'], ['quoFormat', 'quotation'], ['ordFormat', 'order']]) { const bad = validFormat(v[k]); if (bad) throw new Error(`The ${label} number format: ${bad}`); }
    const fee = Number(v.fee); if (!(fee >= 0 && fee <= 10)) throw new Error('Please enter the online payment fee as a percentage between 0 and 10.');
    const invStart = Math.max(1, parseInt(v.invStart || '1', 10) || 1), quoStart = Math.max(1, parseInt(v.quoStart || '1', 10) || 1), ordStart = Math.max(1, parseInt(v.ordStart || '1', 10) || 1);
    // Settings this page does not show (for example the contact page address) are kept: each one is saved on top of what is already stored.
    await save('business', { ...b, name: v.name.trim(), phone: v.phone, phone2: v.phone2, map, email: v.email, address: v.address, instagram: ig, facebook: fb, whatsapp: v.whatsapp, upi: v.upi }, true);
    await save('gst', { ...g, enabled: v.enabled, gstin: v.gstin, rate_percent: g.rate_percent || 18 }, false);
    await save('invoice', { ...inv, format: v.invFormat.trim(), quotation_format: v.quoFormat.trim(), start: invStart, quotation_start: quoStart, terms: v.terms }, false);
    await save('order', { ...ord, format: v.ordFormat.trim(), start: ordStart }, false);
    await save('gateway', { ...gw, fee_percent: fee }, false);
    await save('shipping', { ...s, flat_paise: rupeesToPaise(v.flat), free_above_paise: rupeesToPaise(v.free) }, true);
    await save('store', { shipping_note: v.shipNote, return_note: v.returnNote }, false);
    if (invStart !== Number(inv.start || 1)) must(await sb().rpc('set_invoice_start', { n: invStart }));       // website receipts and invoices share one number series
    if (ordStart !== Number(ord.start || 1)) must(await sb().rpc('set_order_start', { n: ordStart }));
    f.setAll((x) => ({ ...x, map: map || '', instagram: ig || '', facebook: fb || '' })); clearCache();         // the next visit loads the saved values
  }, 'Settings saved'); };
  return (<form onSubmit={submit} noValidate>
    <Fold big tight={false} open title="Business details"><div className="ad-form">
      <F form={f} k="name" label="Business name" rule="name" required /><F form={f} k="email" label="Email" type="email" rule="email" required />
      <F form={f} k="phone" label="Phone" type="tel" rule="phone" required /><F form={f} k="phone2" label="Second phone" type="tel" rule="phone" />
      <div className="full"><F form={f} k="address" label="Address" type="textarea" rule="text" rows={3} required /></div>
      <div className="full"><F form={f} k="map" label="Google Maps link" inputMode="url" autoCapitalize="none" spellCheck={false} hint="In Google Maps choose Share, then Copy link, and paste it here" /></div>
      <F form={f} k="instagram" label="Instagram link" inputMode="url" autoCapitalize="none" spellCheck={false} /><F form={f} k="facebook" label="Facebook link" inputMode="url" autoCapitalize="none" spellCheck={false} />
      <F form={f} k="whatsapp" label="WhatsApp number" rule="digits" hint="With country code, e.g. 919962050962" /><F form={f} k="upi" label="UPI ID" /></div></Fold>
    <Fold big tight={false} title="Numbers and GST"><div className="ad-form">
      <p className="ad-help full" style={{ margin: 0 }}>Each number is made from a format. <b>#</b> is one digit of the number, so #### gives leading zeros (0042). <b>YYYY-YY</b> becomes the financial year (2026-27), April to March.</p>
      <p className="ad-section-t full">Invoices (website receipts share this series)</p>
      <F form={f} k="invFormat" label="Format" required autoCapitalize="characters" spellCheck={false} /><F form={f} k="invStart" label="Start from" rule="digits" inputMode="numeric" hint="The next one gets this number if it is higher than the last one used" /><Preview format={f.v.invFormat} n={f.v.invStart} />
      <p className="ad-section-t full">Quotations</p>
      <F form={f} k="quoFormat" label="Format" required autoCapitalize="characters" spellCheck={false} /><F form={f} k="quoStart" label="Start from" rule="digits" inputMode="numeric" /><Preview format={f.v.quoFormat} n={f.v.quoStart} />
      <p className="ad-section-t full">Orders</p>
      <F form={f} k="ordFormat" label="Format" required autoCapitalize="characters" spellCheck={false} /><F form={f} k="ordStart" label="Start from" rule="digits" inputMode="numeric" /><Preview format={f.v.ordFormat} n={f.v.ordStart} />
      <p className="ad-section-t full">GST</p>
      <div className="full"><F form={f} k="enabled" label="My business is registered for GST" type="check" /></div>
      {f.v.enabled && <F form={f} k="gstin" label="GSTIN" rule="code" maxLength={15} />}
      <div className="full"><F form={f} k="terms" label="Note at the bottom of invoices" rule="sentence" /></div></div></Fold>
    <Fold big tight={false} title="Online payments and shipping"><div className="ad-form">
      <F form={f} k="fee" label="Online payment fee (%)" type="money" rule="money" hint="Only used as an estimate when the payment provider does not report the exact fee. 18% GST is added on top." /><div />
      <F form={f} k="flat" label="Shipping charge per order (₹)" type="money" rule="money" /><F form={f} k="free" label="Free shipping above (₹)" type="money" rule="money" hint="Enter 0 for no free shipping" /></div></Fold>
    <Fold big tight={false} title="Product notes"><div className="ad-form">
      <p className="ad-help full" style={{ margin: 0 }}>These are filled in automatically when you add or edit a product. You can still change them for one product.</p>
      <div className="full"><F form={f} k="shipNote" label="Shipping note" type="textarea" rule="sentence" rows={3} /></div>
      <div className="full"><F form={f} k="returnNote" label="Return note" type="textarea" rule="sentence" rows={3} /></div></div></Fold>
    <div className="ad-actions settings-save"><Btn busy={busy} icon="check">Save settings</Btn></div></form>);
}

function PinCard() {
  const [run, busy] = useAction(); const [def, setDef] = useState(false); const f = useForm({ current: '', next: '', again: '' });
  useEffect(() => { try { setDef(!!sessionStorage.getItem('tbb-defpin')); } catch {} }, []);
  const submit = (e) => { e.preventDefault(); run(async () => {
    if (!/^\d{4}$/.test(f.v.next)) throw new Error('The new PIN must be exactly 4 digits.'); if (f.v.next !== f.v.again) throw new Error('The two new PINs do not match.');
    const r = await pinApi({ action: 'change', current: f.v.current, next: f.v.next });
    if (!r.ok) throw new Error(r.status === 401 ? 'The current PIN is not right.' : r.status === 429 ? 'Too many wrong tries. Please wait 15 minutes.' : 'Could not change the PIN. Please try again.');
    setToken(r.token); if (r.session) await applySession(r.session);       // this device gets a fresh sign-in; all others were signed out
    try { sessionStorage.setItem('tbb-defpin', ''); } catch {} setDef(false); f.reset({ current: '', next: '', again: '' });
  }, 'PIN changed. Every other device is signed out and will ask for the new PIN.'); };
  const dg = { type: 'password', rule: 'digits', required: true, inputMode: 'numeric', maxLength: 4, autoComplete: 'off' };
  return (<><p className="ad-help" style={{ marginTop: 0 }}>{def ? 'You are still using the starting PIN (0000). Please change it.' : 'A new device asks for this PIN the first time it signs in.'}</p>
    <form className="ad-form" onSubmit={submit}><F form={f} k="current" label="Current PIN" {...dg} /><div /><F form={f} k="next" label="New PIN" {...dg} /><F form={f} k="again" label="New PIN again" {...dg} />
      <div className="ad-actions full"><Btn busy={busy} icon="check">Change PIN</Btn></div></form></>);
}
function InstallRow() {
  const [can, setCan] = useState(false); useEffect(() => { setCan(!!window.__bip); }, []);
  const install = async () => { const e = window.__bip; if (!e) return; e.prompt(); await e.userChoice; window.__bip = null; setCan(false); };
  return (<p className="ad-help install-row">Add this app to your phone: on iPhone use Safari, Share, then "Add to Home Screen"; on Android use the menu, then "Install app".{can && <button type="button" className="ad-linkbtn" onClick={install}>Install now</button>}</p>);
}
