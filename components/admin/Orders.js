'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icons';
import { nb, Segs, useLoad, sb, must, every, Page, Card, Fold, Badge, Empty, Spin, Err, Modal, Btn, Confirm, F, useForm, useAction, useToast, fmtDT, fmtD } from './kit';
import { money } from '@/lib/accounting';
import { orderNumber } from '@/lib/numbering';
import { syncPaymentsToLedger } from '@/lib/ledgerSync';
import { AddOrder, METHOD_OPTIONS } from './ManualEntry';
import { RefundDialog } from './Refund';
import { ReceiptModal } from './DocViewer';
import { adminClient as supabase } from '@/lib/supabase-admin';

// An order is either not paid yet, paid (to ship), shipped, or cancelled/refunded. Older "packed" counts as paid and "delivered" as shipped.
const isPaid = (o) => ['paid', 'packed', 'shipped', 'delivered'].includes(o.status);
const isShipped = (o) => ['shipped', 'delivered'].includes(o.status);
const toShip = (o) => ['paid', 'packed'].includes(o.status);
const isOff = (o) => ['cancelled', 'refunded'].includes(o.status);
const addr = (a) => (a ? [a.recipient, a.line1, a.line2, a.city, a.state, a.pincode ? `PIN\u00A0-\u00A0${a.pincode}` : ''].filter(Boolean).join(', ') : '');
const param = (k) => { try { return new URLSearchParams(window.location.search).get(k); } catch { return null; } };   // a link from elsewhere in the app (e.g. Accounts) can open one order

export default function Orders() {
  const [open, setOpen] = useState(null); const [q, setQ] = useState(''); const [adding, setAdding] = useState(false); const [shownShipped, setShownShipped] = useState(5);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [o, p, s] = await Promise.all([
      every(() => c.from('orders').select('*').or('status.neq.pending,channel.eq.manual,notes.ilike.*Marked as not paid*').order('created_at', { ascending: false }).order('id')),
      c.from('products').select('id,slug,title,price_paise,stock,gst_mode,active,allow_preorder').order('title'), c.from('settings').select('key,value')]);
    return { orders: must(o), products: must(p), st: Object.fromEntries(must(s).map((r) => [r.key, r.value])) };
  });
  const openOrder = async (o) => { const r = await sb().from('orders').select('*,order_items(*)').eq('id', o.id).maybeSingle(); setOpen(r.data || { ...o, order_items: [] }); };       // the list stays light: an order's items are fetched when it is opened
  useEffect(() => { const id = param('open'); if (!id || !data) return; sb().from('orders').select('*,order_items(*)').eq('id', id).maybeSingle().then((r) => r.data && setOpen(r.data)); }, [data]);
  if (error) return <Page title="Orders"><Err e={error} /></Page>; if (!data) return <Page title="Orders"><Spin /></Page>;
  const no = (o) => orderNumber(o, data.st);
  const has = (x) => !q || JSON.stringify([x.name, x.email, x.phone, no(x), x.invoice_no]).toLowerCase().includes(q.toLowerCase());
  const list = data.orders.filter(has);
  const ship = list.filter(toShip), wait = list.filter((o) => o.status === 'pending'), sent = list.filter(isShipped), off = list.filter(isOff);
  const row = (o) => (<button key={o.id} className="ad-row" onClick={() => openOrder(o)}><div className="main"><b>{nb(o.name)}</b>
    <Segs items={[no(o), fmtD(o.created_at)]} /></div>
    <div className="end"><b>{money(o.total_paise)}</b><span className="tags">{isPaid(o) && <Badge tone="ok">Paid</Badge>}{isShipped(o) && <Badge tone="ok">Shipped</Badge>}</span></div></button>);
  const Section = ({ title, rows, empty }) => (rows.length || empty ? <Card title={rows.length ? `${title} (${rows.length})` : title} tight>{rows.length ? <div className="ad-list">{rows.map(row)}</div> : <Empty>{empty}</Empty>}</Card> : null);
  return (<Page title="Orders" actionClass="split" action={<><Link className="ad-btn ghost" href="/manager/labels"><Icon n="print" size={16} /><span>Label printer</span></Link><Btn icon="plus" onClick={() => setAdding(true)}>Add order</Btn></>}>
    <input className="ad-search" type="search" placeholder="Search name, email, phone or order number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
    <Section title="To ship" rows={ship} empty="Nothing to ship right now." />
    <Section title="Awaiting payment" rows={wait} />
    {sent.length > 0 && <Fold title="Shipped"><div className="ad-list">{sent.slice(0, shownShipped).map(row)}</div>
      {sent.length > shownShipped && <div className="row-actions" style={{ justifyContent: 'center', padding: '8px 0 14px' }}><Btn variant="ghost" onClick={() => setShownShipped((n) => n + 10)}>Show more</Btn></div>}</Fold>}
    {off.length > 0 && <Fold title="Cancelled or refunded"><div className="ad-list">{off.map(row)}</div></Fold>}
    {open && <OrderModal o={open} st={data.st} products={data.products} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); reload(); }} />}
    {adding && <AddOrder products={data.products} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
  </Page>);
}

function OrderModal({ o, st, products, onClose, onSaved }) {
  const [step, setStep] = useState(null); const [edit, setEdit] = useState(false); const [receipt, setReceipt] = useState(false); const [refund, setRefund] = useState(false); const [run, busy] = useAction(); const toast = useToast();
  const f = useForm({ method: 'upi', carrier: o.tracking_carrier || '', number: o.tracking_number || '' });
  const no = orderNumber(o, st); const paid = isPaid(o), shipped = isShipped(o), manual = o.channel === 'manual';
  const markPaid = () => run(async () => {
    must(await sb().from('orders').update({ status: 'paid', paid_at: new Date().toISOString(), payment_method: f.v.method }).eq('id', o.id));
    const r = await sb().rpc('admin_order_stock', { p_order: o.id, p_take: true }); if (r.error) toast('Saved, but stock was not updated: run supabase/database.sql again.', 'err');      // a paid order takes its items from stock
    await syncPaymentsToLedger(sb()); onSaved(); }, 'Marked as paid');
  const markShipped = () => run(async () => { must(await sb().from('orders').update({ status: 'shipped', tracking_carrier: f.v.carrier.trim() || null, tracking_number: f.v.number.trim() || null }).eq('id', o.id)); onSaved(); }, 'Marked as shipped');
  const saveTracking = () => run(async () => { must(await sb().from('orders').update({ tracking_carrier: f.v.carrier.trim() || null, tracking_number: f.v.number.trim() || null }).eq('id', o.id)); onSaved(); }, 'Saved');
  const unship = () => run(async () => { must(await sb().from('orders').update({ status: 'paid' }).eq('id', o.id)); onSaved(); }, 'Moved back to To ship');      // a slip of the finger can be undone
  const unpay = () => run(async () => {            // paid by mistake (UPI or cash not received): back to "not paid", stock returned, the income entry removed
    if (o.razorpay_payment_id) throw new Error('This was paid online. Use Refund to give the money back.');
    const note = `Marked as not paid on ${fmtD(new Date().toISOString())}`;
    must(await sb().from('orders').update({ status: 'pending', paid_at: null, payment_method: null, notes: [o.notes, note].filter(Boolean).join('\n') }).eq('id', o.id));
    const r = await sb().rpc('admin_order_stock', { p_order: o.id, p_take: false }); if (r.error) toast('Saved, but stock was not updated: run supabase/database.sql again.', 'err');
    await sb().from('ledger_entries').delete().eq('source', 'order').eq('source_id', o.id); onSaved(); }, 'Marked as not paid');
  const cancel = () => run(async () => { must(await sb().from('orders').update({ status: 'cancelled' }).eq('id', o.id)); onSaved(); }, 'Order cancelled');      // only an unpaid order is cancelled this way; a paid one is refunded
  const email = () => run(async () => {
    const { data } = await supabase().auth.getSession(); const r = await fetch('/api/manager/email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ type: 'shipped', order_id: o.id }) });
    if (!r.ok) throw new Error('Could not send the email. Please check the email settings.'); }, 'Shipping email sent');
  return (<Modal title={`${no ? `${no} · ` : ''}${o.name}`} onClose={onClose}>
    <p className="ad-help meta-lines" style={{ marginTop: 0 }}><span>{fmtDT(o.created_at)}</span>{o.channel === 'manual' && <span>Added manually</span>}{o.email && <span>{o.email}</span>}{o.phone && <span>{o.phone}</span>}</p>
    <p style={{ margin: '0 0 10px' }}>{paid && <Badge tone="ok">Paid</Badge>} {shipped && <Badge tone="ok">Shipped</Badge>}{isOff(o) && <span className="ad-help">{o.status === 'refunded' ? 'Refunded' : 'Cancelled'}</span>}</p>
    <div className="ad-list" style={{ margin: '10px 0' }}>{(o.order_items || []).map((i) => <div key={i.id} className="ad-row" style={{ cursor: 'default' }}><span>{i.title} × {i.qty}</span><b>{money(i.unit_paise * i.qty)}</b></div>)}
      {o.shipping_paise > 0 && <div className="ad-row" style={{ cursor: 'default' }}><span>Shipping</span><b>{money(o.shipping_paise)}</b></div>}<div className="ad-row" style={{ cursor: 'default' }}><b>Total</b><b>{money(o.total_paise)}</b></div></div>
    <p><b>Ship to</b><br />{addr(o.shipping_address)}<br />{o.shipping_address?.phone}</p>
    {o.gift_message && <p><b>Gift message</b><br />{o.gift_message}</p>}
    {o.notes && <p className={o.notes.includes('ATTENTION') ? 'ad-err' : 'ad-help'} style={{ whiteSpace: 'pre-wrap' }}>{o.notes}</p>}
    {o.razorpay_payment_id && <p className="ad-help">Paid online · payment ID {o.razorpay_payment_id}</p>}

    {step === 'pay' && <div className="ad-form" style={{ marginTop: 12 }}><F form={f} k="method" label="Paid by" type="select" required options={METHOD_OPTIONS} />
      <div className="ad-actions full"><Btn busy={busy} icon="check" onClick={markPaid}>Confirm paid</Btn><Btn variant="ghost" onClick={() => setStep(null)}>Back</Btn></div></div>}
    {(step === 'ship' || shipped) && <div className="ad-form" style={{ marginTop: 12 }}><F form={f} k="carrier" label="Courier" rule="text" placeholder="e.g. India Post" /><F form={f} k="number" label="Tracking number" rule="code" />
      <div className="ad-actions full">{step === 'ship' ? <><Btn busy={busy} icon="check" onClick={markShipped}>Confirm shipped</Btn><Btn variant="ghost" onClick={() => setStep(null)}>Back</Btn></> : <Btn busy={busy} icon="check" onClick={saveTracking}>Save</Btn>}</div></div>}

    {!step && <div className="ad-actions full" style={{ marginTop: 16 }}>
      {!paid && !isOff(o) && <Btn icon="check" onClick={() => setStep('pay')}>Mark as paid</Btn>}
      {toShip(o) && <Btn icon="box" onClick={() => setStep('ship')}>Shipped</Btn>}
      {toShip(o) && <Confirm icon="circle" onYes={unpay}>Not paid</Confirm>}
      {shipped && o.tracking_number && <Btn variant="ghost" busy={busy} onClick={email} icon="mail">Email tracking</Btn>}
      {o.status === 'shipped' && <Confirm icon="undo" onYes={unship}>Undo shipped</Confirm>}
      {paid && <Link className="ad-btn ghost" href={`/manager/labels?order=${o.id}`}><Icon n="print" size={16} /><span>Print label</span></Link>}
      {paid && <Btn variant="ghost" icon="file" onClick={() => setReceipt(true)}>Receipt</Btn>}
      {manual && !isOff(o) && <Btn variant="ghost" icon="edit" onClick={() => setEdit(true)}>Edit</Btn>}
      {paid && <Btn variant="ghost" icon="wallet" onClick={() => setRefund(true)}>Refund</Btn>}
      {o.status === 'pending' && <Confirm icon="close" onYes={cancel}>Cancel order</Confirm>}</div>}
    {receipt && <ReceiptModal id={o.id} onClose={() => setReceipt(false)} />}
    {edit && <AddOrder order={o} products={products} onClose={() => setEdit(false)} onSaved={onSaved} />}
    {refund && <RefundDialog kind="order" rows={[o]} title={`Refund · ${o.name}`} onClose={() => setRefund(false)} onDone={onSaved} />}
  </Modal>);
}
