'use client';
import { useState } from 'react';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Modal, Btn, fmtD, fmtDT, download, STATUS_TONE } from './kit';
import { money, toCSV } from '@/lib/accounting';
const PAID = ['paid', 'packed', 'shipped', 'delivered'];
export default function Customers() {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(null);
  const { data, error } = useLoad(async () => {
    const c = sb(); const [p, o, b, en] = await Promise.all([c.from('profiles').select('id,full_name,email,phone,created_at').neq('role', 'admin').limit(2000), c.from('orders').select('id,user_id,name,email,phone,total_paise,status,created_at').in('status', PAID).limit(5000), c.from('bookings').select('id,user_id,name,email,phone,amount_paise,status,created_at,workshops(title)').eq('status', 'paid').limit(5000), c.from('class_enrolments').select('id,user_id,name,email,phone,amount_paise,status,created_at,class_levels(title,level)').eq('status', 'paid').limit(5000)]);
    const m = new Map(); const get = (email, seed) => { const k = (email || '').toLowerCase(); if (!k) return null; if (!m.has(k)) m.set(k, { email: k, name: '', phone: '', member: null, orders: [], bookings: [], spent: 0, last: '', joined: '', ...seed }); return m.get(k); };
    must(p).forEach((x) => { const r = get(x.email, {}); if (r) { r.member = x.id; r.name ||= x.full_name || ''; r.phone ||= x.phone || ''; r.joined = x.created_at; } });
    must(o).forEach((x) => { const r = get(x.email, {}); if (!r) return; r.name ||= x.name; r.phone ||= x.phone; r.orders.push(x); r.spent += x.total_paise; if (x.created_at > r.last) r.last = x.created_at; });
    must(b).forEach((x) => { const r = get(x.email, {}); if (!r) return; r.name ||= x.name; r.phone ||= x.phone; r.bookings.push(x); r.spent += x.amount_paise; if (x.created_at > r.last) r.last = x.created_at; });
    must(en).forEach((x) => { const r = get(x.email, {}); if (!r) return; r.name ||= x.name; r.phone ||= x.phone; r.bookings.push({ ...x, workshops: { title: `${x.class_levels?.title}, ${x.class_levels?.level}` } }); r.spent += x.amount_paise; if (x.created_at > r.last) r.last = x.created_at; });
    return [...m.values()].sort((a, b) => (b.last || b.joined || '').localeCompare(a.last || a.joined || ''));
  });
  if (error) return <Page title="Customers"><Err e={error} /></Page>; if (!data) return <Page title="Customers"><Spin /></Page>;
  const rows = data.filter((c) => !q || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  return (<Page title="Customers" action={<Btn variant="ghost" icon="download" onClick={() => download('customers.csv', toCSV(data, [{ label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Member', get: (c) => (c.member ? 'Yes' : 'No') }, { label: 'Orders', get: (c) => c.orders.length }, { label: 'Workshop bookings', get: (c) => c.bookings.length }, { label: 'Total spent', get: (c) => c.spent / 100 }, { label: 'Last purchase', get: (c) => (c.last || '').slice(0, 10) }]))}>Export</Btn>}>
    <input className="ad-search" type="search" placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
    <Card tight>{rows.length ? <div className="ad-list">{rows.map((c) => (
      <button key={c.email} className="ad-row" onClick={() => setOpen(c)}><div className="main"><b>{c.name || c.email}</b><small>{c.email}{c.phone ? ` · ${c.phone}` : ''}</small></div>
        <div className="end"><b>{money(c.spent)}</b><small>{c.orders.length} orders · {c.bookings.length} bookings</small></div></button>))}</div> : <Empty>No customers yet. They appear here after their first purchase or sign-up.</Empty>}</Card>
    {open && <Detail c={open} onClose={() => setOpen(null)} />}
  </Page>);
}
function Detail({ c, onClose }) {
  const { data: addrs } = useLoad(async () => (c.member ? must(await sb().from('addresses').select('*').eq('user_id', c.member)) : []), [c.member]);
  const wa = String(c.phone || '').replace(/\D/g, '').slice(-10);
  return (<Modal title={c.name || c.email} onClose={onClose} wide>
    <p style={{ marginTop: 0 }}>{c.email}{c.phone ? ` · ${c.phone}` : ''} {c.member ? <Badge tone="ok">Member</Badge> : <Badge>Guest</Badge>}</p>
    <div className="ad-actions" style={{ marginTop: 0 }}>{c.phone && <a className="ad-btn ghost sm" href={`tel:${c.phone}`}>Call</a>}{wa.length === 10 && <a className="ad-btn ghost sm" target="_blank" rel="noopener" href={`https://wa.me/91${wa}`}>WhatsApp</a>}<a className="ad-btn ghost sm" href={`mailto:${c.email}`}>Email</a></div>
    <p className="ad-section-t" style={{ marginTop: 18 }}>Total spent: {money(c.spent)}</p>
    {c.orders.length > 0 && <><p className="ad-section-t">Orders</p><div className="ad-list">{c.orders.map((o) => <div key={o.id} className="ad-row" style={{ cursor: 'default' }}><span>{fmtD(o.created_at)}</span><span>{money(o.total_paise)} <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge></span></div>)}</div></>}
    {c.bookings.length > 0 && <><p className="ad-section-t">Workshops</p><div className="ad-list">{c.bookings.map((o) => <div key={o.id} className="ad-row" style={{ cursor: 'default' }}><span>{o.workshops?.title}<br /><small>{fmtD(o.created_at)}</small></span><span>{money(o.amount_paise)}</span></div>)}</div></>}
    {addrs?.length > 0 && <><p className="ad-section-t">Saved addresses</p>{addrs.map((a) => <p key={a.id} style={{ margin: '4px 0' }}><b>{a.label}</b>: {[a.recipient, a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ')}</p>)}</>}
  </Modal>);
}
