'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Btn, F, useForm, useAction } from './kit';
import { CustomerSuggest, useCustomers, ensureCustomer } from './pickers';
import { FitA4 } from './InvoiceSheet';
import { ADDRESS_TEXT } from '@/lib/address';

// A4 portrait. Every label is one strip, as wide as the printable area and 3.5 cm tall: sender on the left half (stacked logo, name, studio address, phone), recipient on the right half.
const ROWS_PER_PAGE = 7;
const lines = (a) => [a.line1, a.line2, [a.city, a.pincode].filter(Boolean).join(' - '), a.state].filter(Boolean);
const custAddr = (c) => ({ line1: c.address_line1, line2: c.address_line2, city: c.city, state: c.state, pincode: c.pincode });

export default function Labels() {
  const sp = useSearchParams(); const [pick, setPick] = useState({}); const [extra, setExtra] = useState([]); const [who, setWho] = useState(''); const [run, busy] = useAction();
  const { data, error } = useLoad(async () => {
    const c = sb(); const [o, s] = await Promise.all([c.from('orders').select('id,name,phone,shipping_address,status,created_at').in('status', ['paid', 'packed']).order('created_at', { ascending: false }).limit(200), c.from('settings').select('value').eq('key', 'business').maybeSingle()]);
    return { orders: must(o), biz: s.data?.value || {} };
  });
  const { data: customers, reload: reloadCustomers } = useCustomers();
  useEffect(() => { const id = sp.get('order'); if (id) setPick((p) => ({ ...p, [id]: true })); }, [sp]);
  const m = useForm({ recipient: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });
  const labels = useMemo(() => {
    if (!data) return [];
    const fromOrders = data.orders.filter((o) => pick[o.id]).map((o) => ({ key: o.id, to: o.shipping_address?.recipient || o.name, phone: o.shipping_address?.phone || o.phone, lines: lines(o.shipping_address || {}) }));
    return [...fromOrders, ...extra];
  }, [data, pick, extra]);
  if (error) return <Page title="Label printer"><Err e={error} /></Page>; if (!data) return <Page title="Label printer"><Spin /></Page>;
  const biz = data.biz; const pages = []; for (let i = 0; i < labels.length; i += ROWS_PER_PAGE) pages.push(labels.slice(i, i + ROWS_PER_PAGE)); if (!pages.length) pages.push([]);
  const withAddress = (customers || []).filter((c) => c.address_line1);
  const addCustomer = (c) => { setExtra((a) => [...a, { key: `c${c.id}-${a.length}`, to: c.name, phone: c.phone || '', lines: lines(custAddr(c)), from: 'customer' }]); setWho(''); };
  const addManual = (e) => { e.preventDefault(); const v = m.v; setExtra((a) => [...a, { key: crypto.randomUUID(), to: v.recipient, phone: v.phone, lines: lines(v), from: 'manual' }]); };
  const saveCustomer = () => run(async () => { const v = m.v; if (!v.recipient.trim()) throw new Error('Please enter the recipient name first.'); await ensureCustomer({ name: v.recipient, phone: v.phone, address_line1: v.line1, address_line2: v.line2, city: v.city, state: v.state, pincode: v.pincode }); reloadCustomers(); }, 'Added to customers');
  return (<Page title="Label printer" action={<Btn icon="print" disabled={!labels.length} onClick={() => window.print()}>Print {labels.length || ''}</Btn>}>
    <div className="ad-noprint">
      <Card title="Orders waiting to be sent">
        {data.orders.length ? <div className="ad-list">{data.orders.map((o) => (<label key={o.id} className="ad-row" style={{ cursor: 'pointer' }}><span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><input type="checkbox" checked={!!pick[o.id]} onChange={(e) => setPick((p) => ({ ...p, [o.id]: e.target.checked }))} /><span className="main"><b>{o.name}</b><small>{o.shipping_address?.city}, {o.shipping_address?.pincode}</small></span></span><Badge tone={o.status === 'packed' ? 'info' : 'warn'}>{o.status === 'paid' ? 'to pack' : o.status}</Badge></label>))}</div> : <Empty>No orders waiting to be sent.</Empty>}
        <div className="ad-actions"><Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setPick(Object.fromEntries(data.orders.map((o) => [o.id, true])))}>Select all</Btn><Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setPick({})}>Clear</Btn></div></Card>
      <Card title="Choose a customer"><p className="ad-help" style={{ marginTop: 0 }}>Pick someone whose address is already saved.</p>
        <CustomerSuggest label="Customer" value={who} onType={setWho} onPick={(c) => (c.address_line1 ? addCustomer(c) : null)} customers={withAddress} />
        {who && !withAddress.some((c) => c.name.toLowerCase().includes(who.toLowerCase())) && <p className="ad-help">No saved address for that name. Add it below.</p>}</Card>
      <Card title="Add address manually"><form className="ad-form" onSubmit={addManual}>
        <F form={m} k="recipient" label="Recipient" rule="name" required /><F form={m} k="phone" label="Phone" type="tel" rule="phone" required /><div className="full"><F form={m} k="line1" label="Address line 1" rule="text" required /></div><F form={m} k="line2" label="Address line 2" rule="text" />
        <F form={m} k="city" label="City" rule="text" required /><F form={m} k="state" label="State" rule="text" required /><F form={m} k="pincode" label="Pincode" rule="pin" required inputMode="numeric" />
        <div className="ad-actions full"><Btn icon="plus">Add label</Btn><Btn type="button" variant="ghost" busy={busy} icon="user" onClick={saveCustomer}>Add to customers</Btn></div></form></Card>
      {extra.length > 0 && <Card title={`Added labels (${extra.length})`}><div className="ad-list">{extra.map((l) => <div key={l.key} className="ad-row" style={{ cursor: 'default' }}><span className="main"><b>{l.to}</b><small>{l.lines.join(', ')}</small></span><button className="ad-x" aria-label="Remove" onClick={() => setExtra((a) => a.filter((x) => x.key !== l.key))}>✕</button></div>)}</div></Card>}
      <p className="ad-help">Print on A4, portrait, at 100% (Actual size), in black and white. {labels.length ? `${labels.length} label${labels.length > 1 ? 's' : ''} on ${pages.length} page${pages.length > 1 ? 's' : ''}.` : ''}</p>
    </div>
    {labels.length ? <FitA4 pages={pages.length}><div className="lbl-pages">{pages.map((rows, pi) => (<div className="lbl-page" key={pi}>{rows.map((l) => (
      <div className="lbl2" key={l.key}>
        <div className="from"><img src="/brand/logo-stacked-light.svg" alt="" className="lg" /><div className="tx"><b>{biz.name || 'Thin Black Brush'}</b><span style={{ whiteSpace: 'pre-line' }}>{biz.address || ADDRESS_TEXT}</span>{biz.phone && <span>Ph: {biz.phone}</span>}</div></div>
        <div className="to"><b>{l.to}</b>{l.lines.map((x) => <span key={x}>{x}</span>)}{l.phone && <span>Ph: {l.phone}</span>}</div></div>))}</div>))}</div></FitA4>
      : <p className="ad-empty ad-noprint">Choose parcels or add an address to see your labels here.</p>}
  </Page>);
}
