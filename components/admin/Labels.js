'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Btn, F, useForm } from './kit';
import { RULES } from '@/lib/format';
const LAYOUTS = { a4_8: ['A4 sheet, 8 labels (99 × 68 mm)', 'lbl-a4', 'A4', 8], a4_21: ['A4 sheet, 21 labels (64 × 38 mm)', 'lbl-a4x', 'A4', 21], x4x6: ['Single label, 4 × 6 inch (courier / thermal)', 'lbl-4x6', '4in 6in', 1] };
const lines = (a) => [a.line1, a.line2, [a.city, a.pincode].filter(Boolean).join(' - '), a.state].filter(Boolean);
export default function Labels() {
  const sp = useSearchParams(); const [layout, setLayout] = useState('a4_8'); const [pick, setPick] = useState({}); const [manual, setManual] = useState([]); const [note, setNote] = useState('Handle with care'); const [from, setFrom] = useState(true); const [phone, setPhone] = useState(true);
  const { data, error } = useLoad(async () => {
    const c = sb(); const [o, s] = await Promise.all([c.from('orders').select('id,name,phone,shipping_address,status,created_at').in('status', ['paid', 'packed']).order('created_at', { ascending: false }).limit(200), c.from('settings').select('value').eq('key', 'business').maybeSingle()]);
    return { orders: must(o), biz: s.data?.value || {} };
  });
  useEffect(() => { const id = sp.get('order'); if (id) setPick((p) => ({ ...p, [id]: true })); }, [sp]);
  const m = useForm({ recipient: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });
  const [, cls, size, per] = LAYOUTS[layout];
  const labels = useMemo(() => {
    if (!data) return [];
    const fromOrders = data.orders.filter((o) => pick[o.id]).map((o) => ({ key: o.id, to: o.shipping_address?.recipient || o.name, phone: o.shipping_address?.phone || o.phone, lines: lines(o.shipping_address || {}) }));
    return [...fromOrders, ...manual];
  }, [data, pick, manual]);
  useEffect(() => { const s = document.createElement('style'); s.id = 'lbl-page'; s.textContent = `@media print{@page{size:${size};margin:0}}`; document.head.appendChild(s); return () => s.remove(); }, [size]);
  if (error) return <Page title="Address labels" back="/admin/tools"><Err e={error} /></Page>; if (!data) return <Page title="Address labels" back="/admin/tools"><Spin /></Page>;
  const biz = data.biz; const addManual = (e) => { e.preventDefault(); const v = m.v; setManual((a) => [...a, { key: crypto.randomUUID(), to: v.recipient, phone: v.phone, lines: lines(v) }]); m.reset(); };
  const pages = Math.max(1, Math.ceil(labels.length / per));
  return (<Page title="Address labels" back="/admin/tools" action={<Btn icon="print" disabled={!labels.length} onClick={() => window.print()}>Print {labels.length || ''}</Btn>}>
    <div className="ad-noprint">
      <Card title="1. Choose parcels"><p className="ad-help" style={{ marginTop: 0 }}>Orders that are paid and waiting to be sent.</p>
        {data.orders.length ? <div className="ad-list">{data.orders.map((o) => (<label key={o.id} className="ad-row" style={{ cursor: 'pointer' }}><span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><input type="checkbox" style={{ width: 22, height: 22, appearance: 'auto', WebkitAppearance: 'checkbox', padding: 0 }} checked={!!pick[o.id]} onChange={(e) => setPick((p) => ({ ...p, [o.id]: e.target.checked }))} /><span className="main"><b>{o.name}</b><small>{o.shipping_address?.city}, {o.shipping_address?.pincode}</small></span></span><Badge tone={o.status === 'packed' ? 'info' : 'warn'}>{o.status === 'paid' ? 'to pack' : o.status}</Badge></label>))}</div> : <Empty>No orders waiting to be sent.</Empty>}
        <div className="ad-actions"><Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setPick(Object.fromEntries(data.orders.map((o) => [o.id, true])))}>Select all</Btn><Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setPick({})}>Clear</Btn></div></Card>
      <Card title="Or add an address by hand"><form className="ad-form" onSubmit={addManual}>
        <F form={m} k="recipient" label="Recipient" rule="name" required /><F form={m} k="phone" label="Phone" type="tel" rule="phone" required /><div className="full"><F form={m} k="line1" label="Address line 1" rule="text" required /></div><F form={m} k="line2" label="Address line 2" rule="text" />
        <F form={m} k="city" label="City" rule="text" required /><F form={m} k="state" label="State" rule="text" required /><F form={m} k="pincode" label="Pincode" rule="pin" required inputMode="numeric" /><div className="ad-actions full"><Btn icon="plus">Add label</Btn></div></form>
        {manual.length > 0 && <p className="ad-help">{manual.length} label{manual.length > 1 ? 's' : ''} added by hand. <button className="link" onClick={() => setManual([])}>Clear</button></p>}</Card>
      <Card title="2. Choose the layout"><div className="ad-form"><label className="ad-field full"><span>Label size</span><select value={layout} onChange={(e) => setLayout(e.target.value)}>{Object.entries(LAYOUTS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></label>
        <label className="ad-field"><span>Message on label <em>(optional)</em></span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} /></label>
        <div><label className="ad-check"><input type="checkbox" checked={from} onChange={(e) => setFrom(e.target.checked)} /><span>Show our address as sender</span></label><label className="ad-check"><input type="checkbox" checked={phone} onChange={(e) => setPhone(e.target.checked)} /><span>Show customer phone</span></label></div></div>
        <p className="ad-help">Print at 100% size ("Actual size"), not "Fit to page". {labels.length ? `${labels.length} label${labels.length > 1 ? 's' : ''}, ${pages} page${pages > 1 ? 's' : ''}.` : ''}</p></Card>
    </div>
    <Card title="Preview"><div className="lbl-wrap"><div className={`lbl-sheet ${cls}`}>{labels.length ? labels.map((l) => (<div className="lbl" key={l.key}>
      {from && <div className="from"><b>From:</b> {biz.name || 'Thin Black Brush'}, {biz.address}{biz.phone ? ` · ${biz.phone}` : ''}</div>}
      <div className="to"><span>To:</span><b>{l.to}</b>{l.lines.map((x) => <div key={x}>{x}</div>)}{phone && l.phone && <div className="phone">Phone: {l.phone}</div>}</div>{note && <div className="note">{note}</div>}</div>)) : <p className="ad-empty ad-noprint">Choose parcels above to see your labels here.</p>}</div></div></Card>
  </Page>);
}
