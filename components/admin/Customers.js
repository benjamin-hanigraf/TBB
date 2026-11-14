'use client';
import { useState } from 'react';
import Icon from '@/components/Icons';
import { nb, Segs, useLoad, sb, must, every, Page, Card, Badge, Empty, Spin, Err, Modal, Btn, F, useForm, useAction, Confirm, fmtD } from './kit';
import { orderNumber } from '@/lib/numbering';
import { digits10, findDuplicates, mergeCustomers, MergeModal } from './pickers';
import { money, toCSV } from '@/lib/accounting';
const PAID = ['paid', 'packed', 'shipped', 'delivered'];
const SRC = { website: 'Website', wix: 'Wix', manual: 'Added manually', import: 'Imported' };

export default function Customers() {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(null); const [merge, setMerge] = useState(false);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [cu, sum] = await Promise.all([every(() => c.from('customers').select('*').order('created_at', { ascending: false }).order('id')), every(() => c.rpc('customer_summary').order('customer_id'))]);
    const customers = must(cu);
    if (!sum.error) {        // totals counted in the database, matched by email or phone
      const by = new Map((sum.data || []).map((x) => [x.customer_id, x]));
      return { rows: customers.map((r) => { const x = by.get(r.id) || {}; return { ...r, n: { orders: x.orders || 0, bookings: x.bookings || 0, classes: x.classes || 0, invoices: x.invoices || 0 }, spent: Number(x.spent_paise || 0), last: x.last_at || '' }; }) };
    }
    // database update not run yet: count here, matched by email only (the older way)
    const [o, b, en] = await Promise.all([every(() => c.from('orders').select('email,total_paise,created_at').in('status', PAID).order('id')), every(() => c.from('bookings').select('email,amount_paise,created_at').eq('status', 'paid').order('id')), every(() => c.from('class_enrolments').select('email,amount_paise,created_at').eq('status', 'paid').order('id'))]);
    const by = new Map(); const add = (x, k, amt) => { const e = (x.email || '').toLowerCase(); if (!e) return; const s = by.get(e) || { n: { orders: 0, bookings: 0, classes: 0 }, spent: 0, last: '' }; s.n[k]++; s.spent += amt; if (x.created_at > s.last) s.last = x.created_at; by.set(e, s); };
    must(o).forEach((x) => add(x, 'orders', x.total_paise)); must(b).forEach((x) => add(x, 'bookings', x.amount_paise)); must(en).forEach((x) => add(x, 'classes', x.amount_paise));
    return { rows: customers.map((r) => ({ ...r, ...(by.get((r.email || '').toLowerCase()) || { n: { orders: 0, bookings: 0, classes: 0 }, spent: 0, last: '' }) })) };
  });
  if (error) return <Page title="Customers"><Err e={error} /></Page>; if (!data) return <Page title="Customers"><Spin /></Page>;
  const dups = findDuplicates(data.rows);
  const rows = data.rows.filter((c) => !q || `${c.name} ${c.email || ''} ${c.phone || ''} ${c.city || ''}`.toLowerCase().includes(q.toLowerCase()));
  return (<Page title="Customers" action={<>{dups.length > 0 && <Btn variant="ghost" icon="user" onClick={() => setMerge(true)}>Merge ({dups.length})</Btn>}<Btn icon="plus" onClick={() => setOpen({ isNew: true })}>Add customer</Btn></>}>
    <input className="ad-search" type="search" placeholder="Search name, email, phone or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
    <Card tight>{rows.length ? <div className="ad-list">{rows.map((c) => (
      <button key={c.id} className="ad-row" onClick={() => setOpen(c)}><div className="main"><b>{nb(c.name)}</b><small className="meta-lines">{c.email && <span>{c.email}</span>}{c.phone && <span>{c.phone}</span>}</small></div>
        <div className="end"><b>{money(c.spent)}</b><small>{c.n.orders + c.n.bookings + c.n.classes + (c.n.invoices || 0)} purchases</small></div></button>))}</div> : <Empty>No customers yet. They appear here after a sign-up or purchase, or you can add or import them.</Empty>}</Card>
    {merge && <MergeModal groups={dups} onClose={() => setMerge(false)} onDone={() => { setMerge(false); reload(); }} />}
    {open && <CustomerModal all={data.rows} c={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); reload(); }} />}
  </Page>);
}

function CustomerModal({ c, all, onClose, onSaved }) {
  const isNew = !!c.isNew; const [run, busy] = useAction(); const [dup, setDup] = useState(null); const [editing, setEditing] = useState(isNew);
  const f = useForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', address_line1: c.address_line1 || '', address_line2: c.address_line2 || '', city: c.city || '', state: c.state || '', pincode: c.pincode || '', notes: c.notes || '', marketing: !!c.marketing_opt_in, hasGst: !!c.gstin, gstin: c.gstin || '' });
  const buildRow = () => { const v = f.v; return { name: v.name, email: v.email || null, phone: v.phone || null, address_line1: v.address_line1 || null, address_line2: v.address_line2 || null, city: v.city || null, state: v.state || null, pincode: v.pincode || null, notes: v.notes || null, marketing_opt_in: v.marketing, gstin: v.hasGst ? (v.gstin || '').trim() || null : null }; };
  const write = async () => { const row = buildRow(); const r = isNew ? must(await sb().from('customers').insert({ ...row, source: 'manual' }).select().single()) : (must(await sb().from('customers').update(row).eq('id', c.id)), { ...c, ...row }); return r; };
  const save = (e) => { e.preventDefault(); return run(async () => {
    const v = f.v; if (!v.name.trim()) throw new Error('Please add a name.'); if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.email)) throw new Error('That email does not look right.');
    if (v.hasGst && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test((v.gstin || '').trim())) throw new Error('Please enter the 15-character GSTIN, for example 33ABCDE1234F1Z5.');
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
    const parts = [/^[^,()"]+$/.test(email) && email ? `email.ilike.${email}` : null, ph.length === 10 ? `phone.ilike.*${ph}` : null].filter(Boolean); if (!parts.length && !(c.name || '').trim()) return { orders: [], bookings: [], classes: [], invoices: [] };
    const who = parts.join(','); const cl = sb();
    // issued invoices: matched by email or phone; an invoice with no email or phone is matched by the customer's name
    const iv = 'id,invoice_no,issue_date,total_paise,status,invoice_payments(amount_paise)'; const nm = (c.name || '').replace(/[,()*%"]/g, ' ').trim();
    const inv = async () => { const a = parts.length ? await cl.from('invoices').select(iv).eq('doc_type', 'invoice').in('status', ['sent', 'paid']).or(parts.map((x) => x.replace('email.', 'customer_email.').replace('phone.', 'customer_phone.')).join(',')).limit(200) : { data: [] };
      const b2 = nm ? await cl.from('invoices').select(iv).eq('doc_type', 'invoice').in('status', ['sent', 'paid']).is('customer_email', null).is('customer_phone', null).ilike('customer_name', nm).limit(200) : { data: [] }; const seen = new Set(); return [...(a.data || []), ...(b2.data || [])].filter((x) => !seen.has(x.id) && seen.add(x.id)).sort((x, y) => String(y.issue_date).localeCompare(String(x.issue_date))); };
    const [o, b, en, invs] = await Promise.all([
      cl.from('orders').select('id,order_no,total_paise,created_at').in('status', PAID).or(who).order('created_at', { ascending: false }).limit(200),
      cl.from('bookings').select('id,amount_paise,status,created_at,workshops(title)').eq('status', 'paid').or(who).order('created_at', { ascending: false }).limit(200),
      cl.from('class_enrolments').select('id,amount_paise,status,created_at,student_name,class_levels(title,level)').eq('status', 'paid').or(who).order('created_at', { ascending: false }).limit(200), inv()]);
    const st = Object.fromEntries(must(await cl.from('settings').select('key,value')).map((r) => [r.key, r.value]));      // for the order number format
    return { orders: must(o).map((x) => ({ ...x, no: orderNumber(x, st) })), bookings: must(b), classes: must(en), invoices: invs };
  }, [c.id]);
  const h = hist || { orders: [], bookings: [], classes: [], invoices: [] };
  const tools = !isNew && <>{c.phone && <a className="ad-x tool" href={`tel:${c.phone}`} aria-label="Call" title="Call"><Icon n="phone" size={17} /></a>}{wa.length === 10 && <a className="ad-x tool" target="_blank" rel="noopener" href={`https://wa.me/91${wa}`} aria-label="WhatsApp" title="WhatsApp"><Icon n="whatsapp" size={17} /></a>}{c.email && <a className="ad-x tool" href={`mailto:${c.email}`} aria-label="Email" title="Email"><Icon n="mail" size={17} /></a>}</>;
  return (<Modal title={isNew ? 'Add customer' : c.name} onClose={onClose} wide tools={tools || undefined}>
    {!isNew && <><p style={{ marginTop: 0, marginBottom: 16 }}><Badge>{SRC[c.source] || c.source}</Badge> {c.user_id ? <Badge tone="ok">Has an account</Badge> : null} <span className="ad-help"> Added {fmtD(c.created_at)}</span></p></>}
    {!editing && <><dl className="ad-view">{[['Email', c.email], ['Phone', c.phone], ['Address', [c.address_line1, c.address_line2, [c.city, c.state].filter(Boolean).join(', '), c.pincode ? `PIN\u00A0-\u00A0${c.pincode}` : ''].filter(Boolean).join('\n')], ['GSTIN', c.gstin], ['Notes', c.notes], ['News about workshops and products', c.marketing_opt_in ? 'Yes' : '']].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <div className="ad-actions full"><Btn icon="edit" onClick={() => setEditing(true)}>Edit</Btn></div></>}
    {editing && <form onSubmit={save} className="ad-form">
      <F form={f} k="name" label="Name" rule="name" required /><F form={f} k="email" label="Email" type="email" rule="email" />
      <F form={f} k="phone" label="Phone" type="tel" rule="phone" />
      <F form={f} k="address_line1" label="Address line 1" rule="text" /><F form={f} k="address_line2" label="Address line 2" rule="text" />
      <F form={f} k="city" label="City" rule="text" /><F form={f} k="state" label="State" rule="text" /><F form={f} k="pincode" label="Pincode" rule="pin" inputMode="numeric" />
      <div className="full"><F form={f} k="hasGst" label="Has a GST number" type="check" /></div>{f.v.hasGst && <div className="full"><F form={f} k="gstin" label="GSTIN" rule="code" required maxLength={15} placeholder="33ABCDE1234F1Z5" /></div>}
      <div className="full"><F form={f} k="notes" label="Notes" type="textarea" rule="sentence" rows={3} /></div>
      <div className="full"><F form={f} k="marketing" label="Happy to receive news about workshops and products" type="check" /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Btn type="button" variant="ghost" onClick={() => { f.reset(); setEditing(false); }}>Cancel</Btn>}{!isNew && <Confirm onYes={del}>Delete</Confirm>}</div></form>}
    {!isNew && (h.orders.length + h.bookings.length + h.classes.length + (h.invoices?.length || 0) > 0) && <>
      <p className="ad-section-t" style={{ marginTop: 22 }}>Total spent: {money(c.spent)}</p>
      {h.orders.length > 0 && <><p className="ad-section-t">Orders</p><div className="ad-list">{h.orders.map((o) => <div key={o.id} className="ad-row" style={{ cursor: 'default' }}><span>{o.no || fmtD(o.created_at)}</span><span>{money(o.total_paise)}</span></div>)}</div></>}
      {h.bookings.length > 0 && <><p className="ad-section-t">Workshops</p><div className="ad-list">{h.bookings.map((o) => <div key={o.id} className="ad-row" style={{ cursor: 'default' }}><span>{o.workshops?.title}<br /><small>{fmtD(o.created_at)}</small></span><span>{money(o.amount_paise)}</span></div>)}</div></>}
      {h.invoices?.length > 0 && <><p className="ad-section-t">Invoices</p><div className="ad-list">{h.invoices.map((o) => { const paid = (o.invoice_payments || []).reduce((t, x) => t + x.amount_paise, 0); const bal = Math.max(0, o.total_paise - paid); return <div key={o.id} className="ad-row" style={{ cursor: 'default' }}><span>{o.invoice_no}<br /><small>{fmtD(o.issue_date)}{bal > 0 ? ` · Balance ${money(bal)}` : ''}</small></span><span>{money(o.total_paise)}</span></div>; })}</div></>}
      {h.classes.length > 0 && <><p className="ad-section-t">Writing classes</p><div className="ad-list">{h.classes.map((o) => <div key={o.id} className="ad-row" style={{ cursor: 'default' }}><span>{o.class_levels?.title}<br /><Segs items={[`For ${o.student_name}`, fmtD(o.created_at)]} /></span><span>{money(o.amount_paise)}</span></div>)}</div></>}</>}
  {dup && <Modal title="Same phone number" onClose={() => setDup(null)}><p style={{ marginTop: 0 }}><b>{dup.name}</b> already uses this phone number{dup.email ? ` (${dup.email})` : ''}. Merge them into one customer?</p><p className="ad-help">Merging keeps all details and cannot be undone.</p><div className="ad-actions full"><Btn busy={busy} onClick={mergeNow}>Merge</Btn><Btn variant="ghost" busy={busy} onClick={keepBoth}>Keep separate</Btn></div></Modal>}
  </Modal>);
}
