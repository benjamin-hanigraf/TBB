'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Modal, Btn, F, useForm, useAction, useToast, fmtDT, fmtD, STATUS_TONE, download } from './kit';
import { money, toCSV } from '@/lib/accounting';
import { recordRefund } from '@/lib/ledgerSync';
import { adminClient as supabase } from '@/lib/supabase-admin';

const ORDER_STATUS = [['paid', 'Paid, to pack'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['refunded', 'Refunded']];
const addr = (a) => a ? [a.recipient, a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ') : '';

export default function Orders() {
  const [tab, setTab] = useState('pack'); const [open, setOpen] = useState(null); const [q, setQ] = useState('');
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [o, b, en] = await Promise.all([
      c.from('orders').select('*,order_items(*)').neq('status', 'pending').order('created_at', { ascending: false }).limit(300),
      c.from('bookings').select('*,workshops(title,starts_at)').neq('status', 'pending').order('created_at', { ascending: false }).limit(300),
      c.from('class_enrolments').select('*,class_levels(title,level)').neq('status', 'pending').order('created_at', { ascending: false }).limit(300)]);
    return { orders: must(o), bookings: must(b), enrol: must(en) };
  });
  if (error) return <Page title="Orders"><Err e={error} /></Page>; if (!data) return <Page title="Orders"><Spin /></Page>;
  const has = (x) => !q || JSON.stringify([x.name, x.email, x.phone, x.invoice_no]).toLowerCase().includes(q.toLowerCase());
  const orders = data.orders.filter(has).filter((o) => tab === 'pack' ? o.status === 'paid' || o.status === 'packed' : tab === 'shipped' ? ['shipped', 'delivered'].includes(o.status) : tab === 'all');
  const bookings = data.bookings.filter(has); const enrols = data.enrol.filter((x) => has({ name: x.name, email: x.email, phone: x.phone, invoice_no: x.invoice_no }) || (x.student_name || '').toLowerCase().includes(q.toLowerCase()));
  const toPack = data.orders.filter((o) => o.status === 'paid' || o.status === 'packed').length;
  const exportCsv = () => download('orders.csv', toCSV(data.orders, [{ label: 'Order no', get: (o) => o.invoice_no }, { label: 'Date', get: (o) => o.created_at.slice(0, 10) }, { label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Items', get: (o) => (o.order_items || []).map((i) => `${i.title} x${i.qty}`).join('; ') }, { label: 'Total', get: (o) => o.total_paise / 100 }, { label: 'Status', key: 'status' }, { label: 'Address', get: (o) => addr(o.shipping_address) }, { label: 'Payment id', key: 'razorpay_payment_id' }]));
  return (<Page title="Orders" action={<><Link className="ad-btn ghost" href="/manager/tools/labels">Print labels</Link><Btn variant="ghost" icon="fileout" onClick={exportCsv}>Export</Btn></>}>
    <div className="ad-tabsbar" role="tablist">{[['pack', `To pack (${toPack})`], ['shipped', 'Shipped'], ['all', 'All orders'], ['book', 'Workshop bookings'], ['enrol', 'Class enrolments']].map(([k, t]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>)}</div>
    <input className="ad-search" type="search" placeholder="Search name, email, phone or number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
    <Card tight>{tab === 'enrol' ? (enrols.length ? <div className="ad-list">{enrols.map((x) => (
      <button key={x.id} className="ad-row" onClick={() => setOpen({ t: 'e', x })}><div className="main"><b>{x.student_name}</b><small>{x.class_levels?.title}, {x.class_levels?.level} · {x.student_group === 'child' ? `child, age ${x.student_age}` : 'adult'} · paid by {x.name}</small></div><div className="end"><b>{money(x.amount_paise)}</b><Badge tone={STATUS_TONE[x.status]}>{x.status}</Badge></div></button>))}</div> : <Empty>No class enrolments yet.</Empty>)
      : tab === 'book' ? (bookings.length ? <div className="ad-list">{bookings.map((b) => (
      <button key={b.id} className="ad-row" onClick={() => setOpen({ t: 'b', x: b })}><div className="main"><b>{b.name}</b><small>{b.workshops?.title} · {b.seats} {b.seats > 1 ? 'seats' : 'seat'} · {fmtD(b.created_at)}</small></div><div className="end"><b>{money(b.amount_paise)}</b><Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge></div></button>))}</div> : <Empty>No bookings yet.</Empty>)
      : (orders.length ? <div className="ad-list">{orders.map((o) => (
      <button key={o.id} className="ad-row" onClick={() => setOpen({ t: 'o', x: o })}><div className="main"><b>{o.name}</b><small>{(o.order_items || []).map((i) => `${i.title} × ${i.qty}`).join(', ')} · {fmtD(o.created_at)}</small></div><div className="end"><b>{money(o.total_paise)}</b><Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge></div></button>))}</div> : <Empty>{tab === 'pack' ? 'Nothing to pack right now.' : 'No orders yet.'}</Empty>)}</Card>
    {open?.t === 'o' && <OrderModal o={open.x} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); reload(); }} />}
    {open?.t === 'e' && <EnrolModal e={open.x} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); reload(); }} />}
    {open?.t === 'b' && <BookingModal b={open.x} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); reload(); }} />}
  </Page>);
}

function OrderModal({ o, onClose, onSaved }) {
  const f = useForm({ status: o.status, carrier: o.tracking_carrier || '', number: o.tracking_number || '' }); const [run, busy] = useAction(); const toast = useToast();
  const save = () => run(async () => { must(await sb().from('orders').update({ status: f.v.status, tracking_carrier: f.v.carrier || null, tracking_number: f.v.number || null }).eq('id', o.id)); if (f.v.status === 'refunded' && o.status !== 'refunded') await recordRefund(sb(), { source_id: o.id, amount_paise: o.total_paise, party: o.name, description: `Refund for order ${o.invoice_no ?? ''}`.trim() }); onSaved(); }, 'Order updated');
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
    {o.razorpay_payment_id && <p className="ad-help">Payment ID {o.razorpay_payment_id}. To refund, use the Razorpay dashboard, then set the status to Refunded here.</p>}
    <div className="ad-form" style={{ marginTop: 12 }}>
      <F form={f} k="status" label="Status" type="select" required options={ORDER_STATUS} />
      <F form={f} k="carrier" label="Courier" rule="text" placeholder="e.g. India Post" /><F form={f} k="number" label="Tracking number" rule="code" />
    </div>
    <div className="ad-actions"><Btn busy={busy} onClick={save} icon="check">Save</Btn><Link className="ad-btn ghost" href={`/invoice/${o.id}`} target="_blank">Receipt</Link>
      <Link className="ad-btn ghost" href={`/manager/tools/labels?order=${o.id}`}>Print label</Link>{o.tracking_number && <Btn variant="ghost" busy={busy} onClick={email} icon="mail">Email tracking</Btn>}</div>
  </Modal>);
}
function BookingModal({ b, onClose, onSaved }) {
  const f = useForm({ status: b.status }); const [run, busy] = useAction();
  const save = () => run(async () => { must(await sb().from('bookings').update({ status: f.v.status }).eq('id', b.id)); if (f.v.status === 'refunded' && b.status !== 'refunded') await recordRefund(sb(), { source_id: b.id, amount_paise: b.amount_paise, party: b.name, description: `Refund: ${b.workshops?.title || 'workshop'}` }); onSaved(); }, 'Booking updated');
  return (<Modal title={b.name} onClose={onClose}>
    <p style={{ marginTop: 0 }}><b>{b.workshops?.title}</b><br />{b.seats} {b.seats > 1 ? 'seats' : 'seat'} · {money(b.amount_paise)}<br /><span className="ad-help">{b.email} · {b.phone}</span></p>
    <p className="ad-help">Booked {fmtDT(b.created_at)}{b.razorpay_payment_id ? ` · Payment ID ${b.razorpay_payment_id}` : ''}</p>
    <div className="ad-form"><F form={f} k="status" label="Status" type="select" required options={[['paid', 'Confirmed'], ['transferred', 'Transferred to another date or person'], ['cancelled', 'Cancelled'], ['refunded', 'Refunded']]} /></div>
    <p className="ad-help">Tickets are non-refundable but can be transferred. Refunds are made in the Razorpay dashboard.</p>
    <div className="ad-actions"><Btn busy={busy} onClick={save} icon="check">Save</Btn><Link className="ad-btn ghost" href={`/invoice/${b.id}`} target="_blank">Receipt</Link>
      <a className="ad-btn ghost" href={`https://wa.me/91${String(b.phone).replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noopener">WhatsApp</a></div>
  </Modal>);
}

function EnrolModal({ e, onClose, onSaved }) {
  const f = useForm({ status: e.status }); const [run, busy] = useAction();
  const save = () => run(async () => { must(await sb().from('class_enrolments').update({ status: f.v.status }).eq('id', e.id)); if (f.v.status === 'refunded' && e.status !== 'refunded') await recordRefund(sb(), { source_id: e.id, amount_paise: e.amount_paise, party: e.name, description: `Refund: ${e.class_levels?.title || 'class'}, ${e.class_levels?.level || ''}` }); onSaved(); }, 'Enrolment updated');
  const wa = String(e.phone).replace(/\D/g, '').slice(-10);
  return (<Modal title={e.student_name} onClose={onClose}>
    <p style={{ marginTop: 0 }}><b>{e.class_levels?.title}, {e.class_levels?.level}</b><br />{e.student_group === 'child' ? `Child, age ${e.student_age}` : 'Adult'} · {money(e.amount_paise)}</p>
    <p className="ad-help">Paid by {e.name} · {e.email} · {e.phone}<br />{fmtDT(e.created_at)}{e.razorpay_payment_id ? ` · Payment ID ${e.razorpay_payment_id}` : ''}</p>
    <div className="ad-form"><F form={f} k="status" label="Status" type="select" required options={[['paid', 'Confirmed'], ['transferred', 'Moved to another batch'], ['cancelled', 'Cancelled'], ['refunded', 'Refunded']]} /></div>
    <p className="ad-help">Refunds are made in the Razorpay dashboard.</p>
    <div className="ad-actions"><Btn busy={busy} onClick={save} icon="check">Save</Btn><Link className="ad-btn ghost" href={`/invoice/${e.id}`} target="_blank">Receipt</Link>{wa.length === 10 && <a className="ad-btn ghost" target="_blank" rel="noopener" href={`https://wa.me/91${wa}`}>WhatsApp</a>}</div>
  </Modal>);
}
