'use client';
import { useState } from 'react';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Modal, Btn, F, useForm, useAction, Confirm, fmtD, download, STATUS_TONE } from './kit';
import ImportCsv from './ImportCsv';
import { digits10, findDuplicates, mergeCustomers, MergeModal } from './pickers';
import { money, toCSV } from '@/lib/accounting';
const PAID = ['paid', 'packed', 'shipped', 'delivered'];
const SRC = { website: 'Website', wix: 'Wix', manual: 'Added by hand', import: 'Imported' };

export default function Customers() {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(null); const [imp, setImp] = useState(false); const [merge, setMerge] = useState(false);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [cu, sum] = await Promise.all([c.from('customers').select('*').order('created_at', { ascending: false }).limit(5000), c.rpc('customer_summary')]);
    const customers = must(cu);
    if (!sum.error) {        // totals counted in the database, matched by email or phone
      const by = new Map((sum.data || []).map((x) => [x.customer_id, x]));
      return { rows: customers.map((r) => { const x = by.get(r.id) || {}; return { ...r, n: { orders: x.orders || 0, bookings: x.bookings || 0, classes: x.classes || 0 }, spent: Number(x.spent_paise || 0), last: x.last_at || '' }; }) };
    }
    // database update not run yet: count here, matched by email only (the older way)
    const [o, b, en] = await Promise.all([c.from('orders').select('email,total_paise,created_at').in('status', PAID).limit(5000), c.from('bookings').select('email,amount_paise,created_at').eq('status', 'paid').limit(5000), c.from('class_enrolments').select('email,amount_paise,created_at').eq('status', 'paid').limit(5000)]);
    const by = new Map(); const add = (x, k, amt) => { const e = (x.email || '').toLowerCase(); if (!e) return; const s = by.get(e) || { n: { orders: 0, bookings: 0, classes: 0 }, spent: 0, last: '' }; s.n[k]++; s.spent += amt; if (x.created_at > s.last) s.last = x.created_at; by.set(e, s); };
    must(o).forEach((x) => add(x, 'orders', x.total_paise)); must(b).forEach((x) => add(x, 'bookings', x.amount_paise)); must(en).forEach((x) => add(x, 'classes', x.amount_paise));
    return { rows: customers.map((r) => ({ ...r, ...(by.get((r.email || '').toLowerCase()) || { n: { orders: 0, bookings: 0, classes: 0 }, spent: 0, last: '' }) })) };
  });
  if (error) return <Page title="Customers"><Err e={error} /></Page>; if (!data) return <Page title="Customers"><Spin /></Page>;
  const dups = findDuplicates(data.rows);
  const rows = data.rows.filter((c) => !q || `${c.name} ${c.email || ''} ${c.phone || ''} ${c.city || ''}`.toLowerCase().includes(q.toLowerCase()));
  const exportAll = () => download('customers.csv', toCSV(data.rows, [{ label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Address line 1', key: 'address_line1' }, { label: 'Address line 2', key: 'address_line2' }, { label: 'City', key: 'city' }, { label: 'State', key: 'state' }, { label: 'Pincode', key: 'pincode' }, { label: 'Source', key: 'source' }, { label: 'Marketing OK', get: (c) => (c.marketing_opt_in ? 'yes' : 'no') }, { label: 'Orders', get: (c) => c.n.orders }, { label: 'Workshop bookings', get: (c) => c.n.bookings }, { label: 'Class enrolments', get: (c) => c.n.classes }, { label: 'Total spent', get: (c) => c.spent / 100 }, { label: 'Last purchase', get: (c) => (c.last || '').slice(0, 10) }]));
  return (<Page title="Customers" action={<>{dups.length > 0 && <Btn variant="ghost" onClick={() => setMerge(true)}>Merge ({dups.length})</Btn>}<Btn variant="ghost" icon="filein" onClick={() => setImp(true)}>Import</Btn><Btn variant="ghost" icon="fileout" onClick={exportAll}>Export</Btn><Btn icon="plus" onClick={() => setOpen({ isNew: true })}>Add customer</Btn></>}>
    <input className="ad-search" type="search" placeholder="Search name, email, phone or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
    <Card tight>{rows.length ? <div className="ad-list">{rows.map((c) => (
      <button key={c.id} className="ad-row" onClick={() => setOpen(c)}><div className="main"><b>{c.name}</b><small>{c.email || 'No email'}{c.phone ? ` · ${c.phone}` : ''}</small></div>
        <div className="end"><b>{money(c.spent)}</b><small>{c.n.orders + c.n.bookings + c.n.classes} purchases</small></div></button>))}</div> : <Empty>No customers yet. They appear here after a sign-up or purchase, or you can add or import them.</Empty>}</Card>
    {merge && <MergeModal groups={dups} onClose={() => setMerge(false)} onDone={() => { setMerge(false); reload(); }} />}
    {open && <CustomerModal all={data.rows} c={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); reload(); }} />}
    {imp && <ImportCsv kind="customers" onClose={() => setImp(false)} onDone={reload} />}
  </Page>);
}

function CustomerModal({ c, all, onClose, onSaved }) {
  const isNew = !!c.isNew; const [run, busy] = useAction(); const [dup, setDup] = useState(null);
  const f = useForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', address_line1: c.address_line1 || '', address_line2: c.address_line2 || '', city: c.city || '', state: c.state || '', pincode: c.pincode || '', notes: c.notes || '', marketing: !!c.marketing_opt_in });
  const buildRow = () => { const v = f.v; return { name: v.name, email: v.email || null, phone: v.phone || null, address_line1: v.address_line1 || null, address_line2: v.address_line2 || null, city: v.city || null, state: v.state || null, pincode: v.pincode || null, notes: v.notes || null, marketing_opt_in: v.marketing }; };
  const write = async () => { const row = buildRow(); const r = isNew ? must(await sb().from('customers').insert({ ...row, source: 'manual' }).select().single()) : (must(await sb().from('customers').update(row).eq('id', c.id)), { ...c, ...row }); return r; };
  const save = (e) => { e.preventDefault(); return run(async () => {
    const v = f.v; if (!v.name.trim()) throw new Error('Please add a name.'); if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.email)) throw new Error('That email does not look right.');
    const same = digits10(v.phone).length === 10 ? all.find((x) => x.id !== c.id && digits10(x.phone) === digits10(v.phone)) : null;
    if (same) { setDup(same); return; }
    await write(); onSaved();
  }, 'Saved'); };
  const mergeNow = () => run(async () => { const mine = await write(); const fresh = must(await sb().from('customers').select('*').in('id', [mine.id, dup.id])); await mergeCustomers(fresh); setDup(null); onSaved(); }, 'Merged');
  const keepBoth = () => run(async () => { await write(); setDup(null); onSaved(); }, 'Saved');
  const del = () => run(async () => { must(await sb().from('customers').delete().eq('id', c.id)); onSaved(); }, 'Deleted');
  const wa = String(c.phone || '').replace(/\D/g, '').slice(-10);
  const { data: hist } = useLoad(async () => {
    if (isNew) return null; const email = (c.email || '').toLowerCase(); const ph = digits10(c.phone);
    const parts = [/^[^,()"]+$/.test(email) && email ? `email.ilike.${email}` : null, ph.length === 10 ? `phone.ilike.*${ph}` : null].filter(Boolean); if (!parts.length) return { orders: [], bookings: [], classes: [] };
    const who = parts.join(','); const cl = sb(); const [o, b, en] = await Promise.all([
      cl.from('orders').select('id,total_paise,status,created_at').in('status', PAID).or(who).order('created_at', { ascending: false }).limit(200),
      cl.from('bookings').select('id,amount_paise,status,created_at,workshops(title)').eq('status', 'paid').or(who).order('created_at', { ascending: false }).limit(200),
      cl.from('class_enrolments').select('id,amount_paise,status,created_at,student_name,class_levels(title,level)').eq('status', 'paid').or(who).order('created_at', { ascending: false }).limit(200)]);
    return { orders: must(o), bookings: must(b), classes: must(en) };
  }, [c.id]);
  const h = hist || { orders: [], bookings: [], classes: [] };
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
    {!isNew && (h.orders.length + h.bookings.length + h.classes.length > 0) && <>
      <p className="ad-section-t" style={{ marginTop: 22 }}>Total spent: {money(c.spent)}</p>
      {h.orders.length > 0 && <><p className="ad-section-t">Orders</p><div className="ad-list">{h.orders.map((o) => <div key={o.id} className="ad-row" style={{ cursor: 'default' }}><span>{fmtD(o.created_at)}</span><span>{money(o.total_paise)} <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge></span></div>)}</div></>}
      {h.bookings.length > 0 && <><p className="ad-section-t">Workshops</p><div className="ad-list">{h.bookings.map((o) => <div key={o.id} className="ad-row" style={{ cursor: 'default' }}><span>{o.workshops?.title}<br /><small>{fmtD(o.created_at)}</small></span><span>{money(o.amount_paise)}</span></div>)}</div></>}
      {h.classes.length > 0 && <><p className="ad-section-t">Writing classes</p><div className="ad-list">{h.classes.map((o) => <div key={o.id} className="ad-row" style={{ cursor: 'default' }}><span>{o.class_levels?.title}, {o.class_levels?.level}<br /><small>For {o.student_name} · {fmtD(o.created_at)}</small></span><span>{money(o.amount_paise)}</span></div>)}</div></>}</>}
  {dup && <Modal title="Same phone number" onClose={() => setDup(null)}><p style={{ marginTop: 0 }}><b>{dup.name}</b> already uses this phone number{dup.email ? ` (${dup.email})` : ''}. Merge them into one customer?</p><p className="ad-help">Merging keeps all details and cannot be undone.</p><div className="ad-actions full"><Btn busy={busy} onClick={mergeNow}>Merge</Btn><Btn variant="ghost" busy={busy} onClick={keepBoth}>Keep separate</Btn></div></Modal>}
  </Modal>);
}
