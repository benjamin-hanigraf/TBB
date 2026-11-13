'use client';
import { useEffect, useRef, useState } from 'react';
import { useLoad, sb, must, clearCache, Page, Fold, Spin, Err, Btn, F, useForm, useAction, useToast } from './kit';
import DataTools from './DataTools';
import { rupeesToPaise, todayISO } from '@/lib/accounting';
import { ADDRESS_TEXT } from '@/lib/address';
import { formatFor, formatNumber, validFormat } from '@/lib/numbering';
import { pinApi, setToken, applySession } from '@/lib/adminApi';
const GOOD_DEFAULT = 'Please arrive on time.\nBookings are confirmed on payment.\nTickets are non-refundable, but can be transferred to someone else with prior notice to the TBB team.';

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
  return (<Page title="Settings"><Main rows={data} /><Fold big tight={false} title="Data"><DataTools /></Fold><Fold big tight={false} title="Device PIN"><PinCard /></Fold></Page>);
}
async function save(key, value, pub) { must(await sb().from('settings').upsert({ key, value, is_public: pub })); }

function Preview({ format, n }) {
  const bad = validFormat(format); if (bad) return <p className="ad-err full" role="alert" style={{ margin: 0 }}>{bad}</p>;
  return <p className="ad-help full" style={{ margin: 0 }}>Looks like: <b style={{ color: '#1d1d1f' }}>{formatNumber(format, Math.max(1, Number(n) || 1), todayISO())}</b></p>;
}

function Main({ rows }) {
  const b = get(rows, 'business', {}); const g = get(rows, 'gst', { enabled: false, gstin: '', rate_percent: 18 }); const inv = get(rows, 'invoice', {}); const ord = get(rows, 'order', {}); const s = get(rows, 'shipping', { flat_paise: 6000, free_above_paise: 200000 });
  const gw = get(rows, 'gateway', { fee_percent: 2 }); const st = get(rows, 'store', { shipping_note: '', return_note: '' }); const toast = useToast(); const all = rows.reduce((o, r) => ({ ...o, [r.key]: r.value }), {});
  const f = useForm({ name: b.name || 'Thin Black Brush', phone: b.phone || '', phone2: b.phone2 || '', map: b.map || '', email: b.email || '', address: b.address || ADDRESS_TEXT, instagram: b.instagram || '', facebook: b.facebook || '', whatsapp: b.whatsapp || '', upi: b.upi || '',
    enabled: !!g.enabled, gstin: g.gstin || '', terms: inv.terms || '',
    invFormat: formatFor('invoice', all), invStart: String(inv.start || 1), quoFormat: formatFor('quotation', all), quoStart: String(inv.quotation_start || 1), ordFormat: formatFor('order', all), ordStart: String(ord.start || 1),
    fee: String(gw.fee_percent ?? 2), flat: String((s.flat_paise || 0) / 100), free: String((s.free_above_paise || 0) / 100), shipNote: st.shipping_note || '', returnNote: st.return_note || '', goodNote: st.good_to_know ?? GOOD_DEFAULT });
  // Every setting saves by itself as soon as you leave a box (or change a choice). Only the settings that changed are written.
  const latest = useRef(f.v); latest.current = f.v; const run = useRef({ saving: false, again: false }); const lastJson = useRef(null); const starts = useRef({ inv: Number(inv.start || 1), ord: Number(ord.start || 1) });
  const make = (v) => {
    if (!v.name.trim() || !v.email.trim() || !v.phone.trim() || !v.address.trim()) throw new Error('Please fill in the business name, email, phone and address.');
    const map = webAddress(v.map), ig = webAddress(v.instagram), fb = webAddress(v.facebook);
    if (map === null) throw new Error('The Google Maps link does not look right. Paste the link you get from Google Maps, Share.'); if (ig === null) throw new Error('The Instagram link does not look right.'); if (fb === null) throw new Error('The Facebook link does not look right.');
    if (v.enabled && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.gstin)) throw new Error('Please enter a valid 15-character GSTIN, or turn GST off.');
    for (const [k, label] of [['invFormat', 'invoice'], ['quoFormat', 'quotation'], ['ordFormat', 'order']]) { const bad = validFormat(v[k]); if (bad) throw new Error(`The ${label} number format: ${bad}`); }
    const fee = Number(v.fee); if (!(fee >= 0 && fee <= 10)) throw new Error('Please enter the online payment fee as a percentage between 0 and 10.');
    const invStart = Math.max(1, parseInt(v.invStart || '1', 10) || 1), quoStart = Math.max(1, parseInt(v.quoStart || '1', 10) || 1), ordStart = Math.max(1, parseInt(v.ordStart || '1', 10) || 1);
    // Settings this page does not show (for example the contact page address) are kept: each one is saved on top of what is already stored.
    return { map, ig, fb, invStart, ordStart, list: [
      { key: 'business', pub: true, value: { ...b, name: v.name.trim(), phone: v.phone, phone2: v.phone2, map, email: v.email, address: v.address, instagram: ig, facebook: fb, whatsapp: v.whatsapp, upi: v.upi } },
      { key: 'gst', pub: false, value: { ...g, enabled: v.enabled, gstin: v.gstin, rate_percent: g.rate_percent || 18 } },
      { key: 'invoice', pub: false, value: { ...inv, format: v.invFormat.trim(), quotation_format: v.quoFormat.trim(), start: invStart, quotation_start: quoStart, terms: v.terms } },
      { key: 'order', pub: false, value: { ...ord, format: v.ordFormat.trim(), start: ordStart } },
      { key: 'gateway', pub: false, value: { ...gw, fee_percent: fee } },
      { key: 'shipping', pub: true, value: { ...s, flat_paise: rupeesToPaise(v.flat), free_above_paise: rupeesToPaise(v.free) } },
      { key: 'store', pub: true, value: { ...st, shipping_note: v.shipNote, return_note: v.returnNote, good_to_know: v.goodNote } }] };
  };
  if (lastJson.current === null) { try { lastJson.current = Object.fromEntries(make(f.v).list.map((x) => [x.key, JSON.stringify(x.value)])); } catch { lastJson.current = {}; } }
  const persist = async () => {
    const r = run.current; if (r.saving) { r.again = true; return; } r.saving = true;
    try {
      const m = make(latest.current); const changed = m.list.filter((x) => lastJson.current[x.key] !== JSON.stringify(x.value)); if (!changed.length) return;
      for (const x of changed) { await save(x.key, x.value, x.pub); lastJson.current[x.key] = JSON.stringify(x.value); }
      if (m.invStart !== starts.current.inv) { must(await sb().rpc('set_invoice_start', { n: m.invStart })); starts.current.inv = m.invStart; }       // website receipts and invoices share one number series
      if (m.ordStart !== starts.current.ord) { must(await sb().rpc('set_order_start', { n: m.ordStart })); starts.current.ord = m.ordStart; }
      f.setAll((x) => ({ ...x, map: m.map || '', instagram: m.ig || '', facebook: m.fb || '' })); clearCache();         // the next visit loads the saved values
      toast('Saved');
    } catch (e) { toast(e?.message || 'Could not save. Please try again.', 'err'); }
    finally { r.saving = false; if (r.again) { r.again = false; persist(); } }
  };
  const later = (ms) => setTimeout(persist, ms);
  return (<form noValidate onSubmit={(e) => { e.preventDefault(); persist(); }} onBlur={() => later(120)} onChange={(e) => { const t = e.target; if (t.type === 'checkbox' || t.tagName === 'SELECT') later(120); }}>
    <Fold big tight={false} title="Business details"><div className="ad-form">
      <F form={f} k="name" label="Business name" rule="name" required /><F form={f} k="email" label="Email" type="email" rule="email" required />
      <F form={f} k="phone" label="Phone" type="tel" rule="phone" required /><F form={f} k="phone2" label="Second phone" type="tel" rule="phone" />
      <div className="full"><F form={f} k="address" label="Address" type="textarea" rule="text" rows={2} grow required /></div>
      <div className="full"><F form={f} k="map" label="Google Maps link" inputMode="url" autoCapitalize="none" spellCheck={false} hint="In Google Maps choose Share, then Copy link, and paste it here" /></div>
      <F form={f} k="instagram" label="Instagram link" inputMode="url" autoCapitalize="none" spellCheck={false} /><F form={f} k="facebook" label="Facebook link" inputMode="url" autoCapitalize="none" spellCheck={false} />
      <F form={f} k="whatsapp" label="WhatsApp number" rule="digits" hint="With country code, e.g. 919962050962" /><F form={f} k="upi" label="UPI ID" />
      <p className="ad-section-t full">GST</p>
      <div className="full"><F form={f} k="enabled" label="My business is registered for GST" type="check" /></div>
      {f.v.enabled && <F form={f} k="gstin" label="GSTIN" rule="code" maxLength={15} />}</div></Fold>
    <Fold big tight={false} title="Documents"><div className="ad-form">
      <p className="ad-help full" style={{ margin: 0 }}>Each number is made from a format. <b>#</b> is one digit of the number, so #### gives leading zeros (0042). <b>YYYY-YY</b> becomes the financial year (2026-27), April to March.</p>
      <p className="ad-section-t full">Invoices (website receipts share this series)</p>
      <F form={f} k="invFormat" label="Format" required autoCapitalize="characters" spellCheck={false} /><F form={f} k="invStart" label="Start from" rule="digits" inputMode="numeric" hint="The next one gets this number if it is higher than the last one used" /><Preview format={f.v.invFormat} n={f.v.invStart} />
      <p className="ad-section-t full">Quotations</p>
      <F form={f} k="quoFormat" label="Format" required autoCapitalize="characters" spellCheck={false} /><F form={f} k="quoStart" label="Start from" rule="digits" inputMode="numeric" /><Preview format={f.v.quoFormat} n={f.v.quoStart} />
      <p className="ad-section-t full">Orders</p>
      <F form={f} k="ordFormat" label="Format" required autoCapitalize="characters" spellCheck={false} /><F form={f} k="ordStart" label="Start from" rule="digits" inputMode="numeric" /><Preview format={f.v.ordFormat} n={f.v.ordStart} />
      <div className="full"><F form={f} k="terms" label="Note at the bottom of invoices" rule="sentence" /></div></div></Fold>
    <Fold big tight={false} title="Payments and shipping"><div className="ad-form">
      <F form={f} k="fee" label="Online payment fee (%)" type="money" rule="money" hint="Only used as an estimate when the payment provider does not report the exact fee. 18% GST is added on top." /><div />
      <F form={f} k="flat" label="Shipping charge per order (₹)" type="money" rule="money" /><F form={f} k="free" label="Free shipping above (₹)" type="money" rule="money" hint="Enter 0 for no free shipping" /></div></Fold>
    <Fold big tight={false} title="Product notes"><div className="ad-form">
      <p className="ad-help full" style={{ margin: 0 }}>The shipping and return notes appear on every product page and are filled in automatically when you add or edit a product. You can still change them for one product. "Good to know" appears on every workshop page, one point per line.</p>
      <div className="full"><F form={f} k="shipNote" label="Shipping note" type="textarea" rule="sentence" rows={2} grow /></div>
      <div className="full"><F form={f} k="returnNote" label="Return note" type="textarea" rule="sentence" rows={2} grow /></div>
      <div className="full"><F form={f} k="goodNote" label="Good to know (workshops)" type="textarea" rule="sentence" rows={3} grow hint="One point per line" /></div></div></Fold>
  </form>);
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
