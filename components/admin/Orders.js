'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLoad, sb, must, every, Page, Card, Badge, Empty, Spin, Err, Modal, Btn, F, useForm, useAction, useToast, fmtDT, fmtD, STATUS_TONE, download } from './kit';
import { money, toCSV } from '@/lib/accounting';
import { syncPaymentsToLedger } from '@/lib/ledgerSync';
import { RefundDialog } from './Refund';
import { AddOrder, METHOD_OPTIONS } from './ManualEntry';
import { adminClient as supabase } from '@/lib/supabase-admin';

const ORDER_STATUS = [['pending', 'Not paid yet'], ['paid', 'Paid, to pack'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']];
const HOLDS_STOCK = ['paid', 'packed', 'shipped', 'delivered'];        // a paid order has taken its items from stock
const param = (k) => { try { return new URLSearchParams(window.location.search).get(k); } catch { return null; } };   // a link from elsewhere in the app (e.g. Accounts) can open one item
const addr = (a) => a ? [a.recipient, a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ') : '';

export default function Orders() {
  const [open, setOpen] = useState(null); const [q, setQ] = useState(''); const [adding, setAdding] = useState(false); const [showOld, setShowOld] = useState(false);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [o, p] = await Promise.all([
      every(() => c.from('orders').select('*,order_items(*)').or('status.neq.pending,channel.eq.manual').order('created_at', { ascending: false }).order('id')),
      c.from('products').select('id,slug,title,price_paise,stock,gst_mode').order('title')]);
    return { orders: must(o), products: must(p) };
  });
  useEffect(() => { const id = param('open'); if (!id || !data) return; const o = data.orders.find((x) => x.id === id); if (o) setOpen(o); else sb().from('orders').select('*,order_items(*)').eq('id', id).maybeSingle().then((r) => r.data && setOpen(r.data)); }, [data]);
  if (error) return <Page title="Orders"><Err e={error} /></Page>; if (!data) return <Page title="Orders"><Spin /></Page>;
  const has = (x) => !q || JSON.stringify([x.name, x.email, x.phone, x.invoice_no, x.notes]).toLowerCase().includes(q.toLowerCase());
  const list = data.orders.filter(has);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString(); const oldDone = (o) => o.status === 'delivered' && (o.paid_at || o.created_at) < monthAgo;   // delivered over 30 days ago: tucked away
  const old = list.filter(oldDone);
  const sections = [['To pack', list.filter((o) => ['paid', 'packed'].includes(o.status)), 'Nothing to pack right now.'], ['Shipped', list.filter((o) => ['shipped', 'delivered'].includes(o.status) && (q || !oldDone(o))), 'Nothing shipped yet.'],
    ['Awaiting payment', list.filter((o) => o.status === 'pending'), null], ['Cancelled or refunded', list.filter((o) => ['cancelled', 'refunded'].includes(o.status)), null]];
  const exportCsv = () => download('orders.csv', toCSV(data.orders, [{ label: 'Order no', get: (o) => o.invoice_no }, { label: 'Date', get: (o) => o.created_at.slice(0, 10) }, { label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Items', get: (o) => (o.order_items || []).map((i) => `${i.title} x${i.qty}`).join('; ') }, { label: 'Total', get: (o) => o.total_paise / 100 }, { label: 'Status', key: 'status' }, { label: 'Address', get: (o) => addr(o.shipping_address) }, { label: 'Payment id', key: 'razorpay_payment_id' }]));
  return (<Page title="Orders" action={<><Btn variant="ghost" icon="fileout" onClick={exportCsv}>Export</Btn><Btn icon="plus" onClick={() => setAdding(true)}>Add order</Btn></>}>
    <input className="ad-search" type="search" placeholder="Search name, email, phone or number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
    {sections.map(([title, rows, empty]) => (rows.length || empty) ? (<Card key={title} title={`${title}${rows.length ? ` (${rows.length})` : ''}`} tight>{rows.length ? <div className="ad-list">{rows.map((o) => (
      <button key={o.id} className="ad-row" onClick={() => setOpen(o)}><div className="main"><b>{o.name}</b><small>{(o.order_items || []).map((i) => `${i.title} × ${i.qty}`).join(', ')} · {fmtD(o.created_at)}{o.channel === 'manual' ? ' · added by hand' : ''}</small></div><div className="end"><b>{money(o.total_paise)}</b><Badge tone={STATUS_TONE[o.status]}>{o.status === 'pending' ? 'not paid' : o.status}</Badge></div></button>))}</div> : <Empty>{empty}</Empty>}</Card>) : null)}
    {!q && old.length > 0 && <Card title={`Delivered over a month ago (${old.length})`} tight action={<button className="ad-btn ghost sm" onClick={() => setShowOld(!showOld)}>{showOld ? 'Hide' : 'Show'}</button>}>{showOld && <div className="ad-list">{old.map((o) => (
      <button key={o.id} className="ad-row" onClick={() => setOpen(o)}><div className="main"><b>{o.name}</b><small>{(o.order_items || []).map((i) => `${i.title} × ${i.qty}`).join(', ')} · {fmtD(o.created_at)}</small></div><div className="end"><b>{money(o.total_paise)}</b><Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge></div></button>))}</div>}</Card>}
    {open && <OrderModal o={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); reload(); }} />}
    {adding && <AddOrder products={data.products} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
  </Page>);
}

function OrderModal({ o, onClose, onSaved }) {
  const f = useForm({ status: o.status, carrier: o.tracking_carrier || '', number: o.tracking_number || '', method: o.payment_method || 'upi', notes: o.notes || '', restock: '' }); const [run, busy] = useAction(); const toast = useToast();
  const [refund, setRefund] = useState(false);
  const save = () => run(async () => {
    const from = o.status, to = f.v.status; const becamePaid = !HOLDS_STOCK.includes(from) && HOLDS_STOCK.includes(to); const cancelPaid = HOLDS_STOCK.includes(from) && to === 'cancelled';
    if (cancelPaid && !f.v.restock) throw new Error('Please choose whether the items go back in stock.');
    must(await sb().from('orders').update({ status: to, tracking_carrier: f.v.carrier || null, tracking_number: f.v.number || null, notes: f.v.notes.trim() || null, ...(becamePaid && !o.paid_at ? { paid_at: new Date().toISOString(), payment_method: f.v.method } : {}) }).eq('id', o.id));
    // stock follows the order: taken when it is paid; given back when a paid order is cancelled only if the owner says the items are fine to sell
    if (becamePaid || (cancelPaid && f.v.restock === 'yes')) { const r = await sb().rpc('admin_order_stock', { p_order: o.id, p_take: becamePaid }); if (r.error) toast('Saved, but stock was not updated: run the latest database update (supabase/v9.sql).', 'err'); }
    if (becamePaid) await syncPaymentsToLedger(sb()); onSaved(); }, 'Order updated');
  const email = () => run(async () => {
    const { data } = await supabase().auth.getSession(); const r = await fetch('/api/manager/email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ type: 'shipped', order_id: o.id }) });
    if (!r.ok) throw new Error('Could not send the email. Please check the email settings.');
  }, 'Shipping email sent');
  return (<Modal title={`Order ${o.name}`} onClose={onClose}>
    <p className="ad-help" style={{ marginTop: 0 }}>{fmtDT(o.created_at)} · {o.email} · {o.phone}</p>
    <div className="ad-list" style={{ margin: '10px 0' }}>{(o.order_items || []).map((i) => <div key={i.id} className="ad-row" style={{ cursor: 'default' }}><span>{i.title} × {i.qty}</span><b>{money(i.unit_paise * i.qty)}</b></div>)}
      {o.shipping_paise > 0 && <div className="ad-row" style={{ cursor: 'default' }}><span>Shipping</span><b>{money(o.shipping_paise)}</b></div>}<div className="ad-row" style={{ cursor: 'default' }}><b>Total</b><b>{money(o.total_paise)}</b></div></div>
    <p><b>Ship to</b><br />{addr(o.shipping_address)}<br />{o.shipping_address?.phone}</p>
    {o.gift_message && <p><b>Gift message</b><br />{o.gift_message}</p>}
    {o.razorpay_payment_id && <p className="ad-help">Paid online · payment ID {o.razorpay_payment_id}. To give money back, use Refund.</p>}
    <div className="ad-form" style={{ marginTop: 12 }}>
      <F form={f} k="status" label="Status" type="select" required options={o.status === 'refunded' ? [['refunded', 'Refunded']] : ORDER_STATUS} />
      {!HOLDS_STOCK.includes(o.status) && !o.paid_at && HOLDS_STOCK.includes(f.v.status) && <F form={f} k="method" label="Paid by" type="select" required options={METHOD_OPTIONS} />}
      {HOLDS_STOCK.includes(o.status) && f.v.status === 'cancelled' && <F form={f} k="restock" label="Put the items back in stock?" type="select" required options={[['yes', 'Yes, they are fine to sell'], ['no', 'No (damaged, faulty or not returned)']]} />}
      <F form={f} k="carrier" label="Courier" rule="text" placeholder="e.g. India Post" /><F form={f} k="number" label="Tracking number" rule="code" />
      <div className="full"><F form={f} k="notes" label="Private note" type="textarea" rule="sentence" rows={2} hint="Only you see this, never the customer" /></div>
    </div>
    <div className="ad-actions"><Btn busy={busy} onClick={save} icon="check">Save</Btn><Link className="ad-btn ghost" href={`/invoice/${o.id}`} target="_blank">Receipt</Link>
      <Link className="ad-btn ghost" href={`/manager/orders?tab=labels&order=${o.id}`}>Print label</Link>{o.tracking_number && <Btn variant="ghost" busy={busy} onClick={email} icon="mail">Tracking</Btn>}{HOLDS_STOCK.includes(o.status) && <Btn variant="ghost" onClick={() => setRefund(true)}>Refund</Btn>}</div>
    {refund && <RefundDialog kind="order" rows={[o]} title={`Refund · ${o.name}`} onClose={() => setRefund(false)} onDone={onSaved} />}
  </Modal>);
}
