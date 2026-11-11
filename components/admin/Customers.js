'use client';
import { useState } from 'react';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Modal, Btn, F, useForm, useAction, Confirm, fmtD, download, STATUS_TONE } from './kit';
import ImportCsv from './ImportCsv';
import { money, toCSV } from '@/lib/accounting';
const PAID = ['paid', 'packed', 'shipped', 'delivered'];
const SRC = { website: 'Website', wix: 'Wix', manual: 'Added by hand', import: 'Imported' };

export default function Customers() {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(null); const [imp, setImp] = useState(false);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [cu, o, b, en] = await Promise.all([
      c.from('customers').select('*').order('created_at', { ascending: false }).limit(5000),
      c.from('orders').select('id,email,total_paise,status,created_at').in('status', PAID).limit(5000),
      c.from('bookings').select('id,email,amount_paise,status,created_at,workshops(title)').eq('status', 'paid').limit(5000),
      c.from('class_enrolments').select('id,email,amount_paise,status,created_at,student_name,class_levels(title,level)').eq('status', 'paid').limit(5000)]);
    const by = new Map(); const slot = (email) => { const k = (email || '').toLowerCase(); if (!k) return null; if (!by.has(k)) by.set(k, { orders: [], bookings: [], classes: [], spent: 0, last: '' }); return by.get(k); };
    must(o).forEach((x) => { const s = slot(x.email); if (s) { s.orders.push(x); s.spent += x.total_paise; if (x.created_at > s.last) s.last = x.created_at; } });
    must(b).forEach((x) => { const s = slot(x.email); if (s) { s.bookings.push(x); s.spent += x.amount_paise; if (x.created_at > s.last) s.last = x.created_at; } });
    must(en).forEach((x) => { const s = slot(x.email); if (s) { s.classes.push(x); s.spent += x.amount_paise; if (x.created_at > s.last) s.last = x.created_at; } });
    return { rows: must(cu).map((r) => ({ ...r, ...(by.get((r.email || '').toLowerCase()) || { orders: [], bookings: [], classes: [], spent: 0, last: '' }) })) };
  });
  if (error) return <Page title="Customers"><Err e={error} /></Page>; if (!data) return <Page title="Customers"><Spin /></Page>;
  const rows = data.rows.filter((c) => !q || `${c.name} ${c.email || ''} ${c.phone || ''} ${c.city || ''}`.toLowerCase().includes(q.toLowerCase()));
  const exportAll = () => download('customers.csv', toCSV(data.rows, [{ label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Address line 1', key: 'address_line1' }, { label: 'Address line 2', key: 'address_line2' }, { label: 'City', key: 'city' }, { label: 'State', key: 'state' }, { label: 'Pincode', key: 'pincode' }, { label: 'Source', key: 'source' }, { label: 'Marketing OK', get: (c) => (c.marketing_opt_in ? 'yes' : 'no') }, { label: 'Orders', get: (c) => c.orders.length }, { label: 'Workshop bookings', get: (c) => c.bookings.length }, { label: 'Class enrolments', get: (c) => c.classes.length }, { label: 'Total spent', get: (c) => c.spent / 100 }, { label: 'Last purchase', get: (c) => (c.last || '').slice(0, 10) }]));
  return (<Page title="Customers" action={<><Btn variant="ghost" icon="filein" onClick={() => setImp(true)}>Import</Btn><Btn variant="ghost" icon="fileout" onClick={exportAll}>Export</Btn><Btn icon="plus" onClick={() => setOpen({ isNew: true })}>Add customer</Btn></>}>
    <input className="ad-search" type="search" placeholder="Search name, email, phone or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
    <Card tight>{rows.length ? <div className="ad-list">{rows.map((c) => (
      <button key={c.id} className="ad-row" onClick={() => setOpen(c)}><div className="main"><b>{c.name}</b><small>{c.email || 'No email'}{c.phone ? ` · ${c.phone}` : ''}</small></div>
        <div className="end"><b>{money(c.spent)}</b><small>{c.orders.length + c.bookings.length + c.classes.length} purchases</small></div></button>))}</div> : <Empty>No customers yet. They appear here after a sign-up or purchase, or you can add or import them.</Empty>}</Card>
    {open && <CustomerModal c={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); reload(); }} />}
    {imp && <ImportCsv kind="customers" onClose={() => setImp(false)} onDone={reload} />}
  </Page>);
}

function CustomerModal({ c, onClose, onSaved }) {
  const isNew = !!c.isNew; const [run, busy] = useAction();
  const f = useForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', address_line1: c.address_line1 || '', address_line2: c.address_line2 || '', city: c.city || '', state: c.state || '', pincode: c.pincode || '', notes: c.notes || '', marketing: !!c.marketing_opt_in });
  const save = (e) => { e.preventDefault(); return run(async () => {
    const v = f.v; if (!v.name.trim()) throw new Error('Please add a name.'); if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.email)) throw new Error('That email does not look right.');
    const row = { name: v.name, email: v.email || null, phone: v.phone || null, address_line1: v.address_line1 || null, address_line2: v.address_line2 || null, city: v.city || null, state: v.state || null, pincode: v.pincode || null, notes: v.notes || null, marketing_opt_in: v.marketing };
    must(isNew ? await sb().from('customers').insert({ ...row, source: 'manual' }) : await sb().from('customers').update(row).eq('id', c.id)); onSaved();
  }, 'Saved'); };
  const del = () => run(async () => { must(await sb().from('customers').delete().eq('id', c.id)); onSaved(); }, 'Deleted');
  const wa = String(c.phone || '').replace(/\D/g, '').slice(-10);
  return (<Modal title={isNew ? 'Add customer' : c.name} onClose={onClose} wide>
    {!isNew && <><p style={{ marginTop: 0 }}><Badge>{SRC[c.source] || c.source}</Badge> {c.user_id ? <Badge tone="ok">Has an account</Badge> : null} <span className="ad-help"> Added {fmtD(c.created_at)}</span></p>
      <div className="ad-actions" style={{ marginTop: 0, marginBottom: 14 }}>{c.phone && <a className="ad-btn ghost sm" href={`tel:${c.phone}`}>Call</a>}{wa.length === 10 && <a className="ad-btn ghost sm" target="_blank" rel="noopener" href={`https://wa.me/91${wa}`}>WhatsApp</a>}{c.email && <a className="ad-btn ghost sm" href={`mailto:${c.email}`}>Email</a>}</div></>}
    <form onSubmit={save} className="ad-form">
      <F form={f} k="name" label="Name" rule="name" required /><F form={f} k="email" label="Email" type="email" rule="email" />
      <F form={f} k="phone" label="Phone" type="tel" rule="phone" /><F form={f} k="pincode" label="Pincode" rule="pin" inputMode="numeric" />
      <F form={f} k="address_line1" label="Address line 1" rule="text" /><F form={f} k="address_line2" label="Address line 2" rule="text" />
      <F form={f} k="city" label="City" rule="text" /><F form={f} k="state" label="State" rule="text" />
      <div className="full"><F form={f} k="notes" label="Notes" type="textarea" rule="sentence" rows={3} /></div>
      <div className="full"><F form={f} k="marketing" label="Happy to receive news about workshops and products" type="check" /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Confirm onYes={del}>Delete</Confirm>}</div></form>
    {!isNew && (c.orders.length + c.bookings.length + c.classes.length > 0) && <>
      <p className="ad-section-t" style={{ marginTop: 22 }}>Total spent: {money(c.spent)}</p>
      {c.orders.length > 0 && <><p className="ad-section-t">Orders</p><div className="ad-list">{c.orders.map((o) => <div key={o.id} className="ad-row" style={{ cursor: 'default' }}><span>{fmtD(o.created_at)}</span><span>{money(o.total_paise)} <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge></span></div>)}</div></>}
      {c.bookings.length > 0 && <><p className="ad-section-t">Workshops</p><div className="ad-list">{c.bookings.map((o) => <div key={o.id} className="ad-row" style={{ cursor: 'default' }}><span>{o.workshops?.title}<br /><small>{fmtD(o.created_at)}</small></span><span>{money(o.amount_paise)}</span></div>)}</div></>}
      {c.classes.length > 0 && <><p className="ad-section-t">Writing classes</p><div className="ad-list">{c.classes.map((o) => <div key={o.id} className="ad-row" style={{ cursor: 'default' }}><span>{o.class_levels?.title}, {o.class_levels?.level}<br /><small>For {o.student_name} · {fmtD(o.created_at)}</small></span><span>{money(o.amount_paise)}</span></div>)}</div></>}</>}
  </Modal>);
}
