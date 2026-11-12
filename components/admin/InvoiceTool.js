'use client';
import { useEffect, useMemo, useState } from 'react';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Btn, F, useForm, useAction, Confirm, dmyToISO, isoToDMY, fmtD, download } from './kit';
import ImportCsv from './ImportCsv';
import { CustomerSuggest, useCustomers, ensureCustomer } from './pickers';
import { InvoiceSheet, FitA4 } from './InvoiceSheet';
import { METHOD_OPTIONS } from './ManualEntry';
import { nextInvoiceNo, todayISO, money, rupeesToPaise, toCSV, IN_CATEGORIES } from '@/lib/accounting';
import { calcInvoice } from '@/lib/invoiceCalc';
import { RULES } from '@/lib/format';
import { ADDRESS_TEXT } from '@/lib/address';
import { adminClient as supabase } from '@/lib/supabase-admin';

const SORTS = [['new', 'Newest first'], ['old', 'Oldest first'], ['high', 'Highest amount'], ['low', 'Lowest amount'], ['name', 'Customer A to Z']];
const RATES = ['0', '5', '12', '18', '28'];
const unpaid = (i) => i.status !== 'paid';

export default function InvoiceTool() {
  const [edit, setEdit] = useState(null); const [imp, setImp] = useState(false); const [q, setQ] = useState(''); const [show, setShow] = useState('all'); const [sort, setSort] = useState('new');
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [i, s] = await Promise.all([c.from('invoices').select('*').order('created_at', { ascending: false }).limit(2000), c.from('settings').select('key,value')]);
    return { list: must(i), st: Object.fromEntries(must(s).map((r) => [r.key, r.value])) };
  });
  const rows = useMemo(() => {
    if (!data) return []; const t = q.trim().toLowerCase();
    const r = data.list.filter((i) => (show === 'all' || (show === 'paid' ? i.status === 'paid' : unpaid(i))) && (!t || `${i.customer_name} ${i.invoice_no} ${i.customer_email || ''}`.toLowerCase().includes(t)));
    const by = { new: (a, b) => b.issue_date.localeCompare(a.issue_date) || b.created_at.localeCompare(a.created_at), old: (a, b) => a.issue_date.localeCompare(b.issue_date), high: (a, b) => b.total_paise - a.total_paise, low: (a, b) => a.total_paise - b.total_paise, name: (a, b) => a.customer_name.localeCompare(b.customer_name) };
    return r.sort(by[sort]);
  }, [data, q, show, sort]);
  if (error) return <Page title="Invoices"><Err e={error} /></Page>; if (!data) return <Page title="Invoices"><Spin /></Page>;
  if (edit) return <Editor inv={edit} data={data} onBack={() => { setEdit(null); reload(); }} />;
  const exportAll = () => download('invoices.csv', toCSV(data.list, [{ label: 'Invoice no', key: 'invoice_no' }, { label: 'Date', key: 'issue_date' }, { label: 'Customer', key: 'customer_name' }, { label: 'Email', key: 'customer_email' }, { label: 'Phone', key: 'customer_phone' }, { label: 'Address', key: 'customer_address' }, { label: 'Amount', get: (i) => i.total_paise / 100 }, { label: 'GST', get: (i) => i.gst_paise / 100 }, { label: 'Status', get: (i) => (i.status === 'paid' ? 'paid' : 'unpaid') }, { label: 'Paid on', key: 'paid_on' }]));
  return (<Page title="Invoices" action={<><Btn variant="ghost" icon="filein" onClick={() => setImp(true)}>Import</Btn><Btn variant="ghost" icon="fileout" onClick={exportAll}>Export</Btn><Btn icon="plus" onClick={() => setEdit({})}>New invoice</Btn></>}>
    <div className="ad-filterbar"><div className="ad-tabsbar" style={{ margin: 0 }}>{[['all', 'All'], ['unpaid', 'Unpaid'], ['paid', 'Paid']].map(([k, t]) => <button key={k} className={show === k ? 'on' : ''} onClick={() => setShow(k)}>{t}</button>)}</div>
      <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="ad-sort">{SORTS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>
    <input className="ad-search" type="search" placeholder="Search customer or invoice number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search invoices" />
    <Card tight>{rows.length ? <div className="ad-list">{rows.map((i) => (
      <button key={i.id} className="ad-row" onClick={() => setEdit(i)}><div className="main"><b>{i.customer_name}</b><small>{i.invoice_no} · {fmtD(i.issue_date)}</small></div><div className="end"><b>{money(i.total_paise)}</b><Badge tone={i.status === 'paid' ? 'ok' : 'warn'}>{i.status === 'paid' ? 'Paid' : 'Unpaid'}</Badge></div></button>))}</div> : <Empty>{data.list.length ? 'No invoices match.' : 'No invoices yet. Tap "New invoice".'}</Empty>}</Card>
    {imp && <ImportCsv kind="invoices" onClose={() => setImp(false)} onDone={reload} />}
  </Page>);
}

function Editor({ inv, data, onBack }) {
  const isNew = !inv.id; const st = data.st; const gstSet = st.gst || {}; const [run, busy] = useAction(); const { data: customers, reload: reloadCustomers } = useCustomers();
  const prefix = st.invoice?.prefix || 'TBB/YYYY-YY'; const start = st.invoice?.start || 1;
  const f = useForm({ name: inv.customer_name || '', email: inv.customer_email || '', phone: inv.customer_phone || '', address: inv.customer_address || '', gstin: inv.customer_gstin || '', date: isoToDMY(inv.issue_date || todayISO()), due: isoToDMY(inv.due_date),
    no: inv.invoice_no || '', discount: inv.discount_paise ? String(inv.discount_paise / 100) : '', gst: isNew ? !!gstSet.enabled : !!inv.gst_enabled, notes: inv.notes || '',
    pay: inv.status === 'paid' ? 'paid' : 'unpaid', method: inv.payment_method || 'upi', paidOn: isoToDMY(inv.paid_on || todayISO()), category: 'Services' });
  const [items, setItems] = useState((inv.items?.length ? inv.items : [{ desc: '', qty: 1, unit_paise: 0, gst_rate: 18, hsn: '' }]).map((x) => ({ desc: x.desc, qty: String(x.qty), price: x.unit_paise ? String(x.unit_paise / 100) : '', rate: String(x.gst_rate ?? 18), hsn: x.hsn || '' })));
  const issue = dmyToISO(f.v.date) || todayISO();
  useEffect(() => { if (isNew && !f.v.no) f.set('no', nextInvoiceNo(data.list.map((x) => x.invoice_no), prefix, issue, start)); /* eslint-disable-next-line */ }, []);
  const setItem = (i, k, v) => setItems((a) => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const clean = items.filter((x) => x.desc.trim() || x.price).map((x) => ({ desc: RULES.title.done(x.desc), qty: Number(x.qty) || 1, unit_paise: rupeesToPaise(x.price), gst_rate: Number(x.rate) || 0, hsn: x.hsn.trim() }));
  const calc = calcInvoice(clean, rupeesToPaise(f.v.discount), f.v.gst);
  const biz = { ...(st.business || {}), address: st.business?.address || ADDRESS_TEXT, name: st.business?.name || 'Thin Black Brush', gstin: gstSet.gstin || '' };
  const doc = { no: f.v.no || 'Preview', date: issue, due: dmyToISO(f.v.due), title: f.v.pay === 'paid' ? 'Receipt' : 'Invoice', biz, customer: { name: f.v.name, address: f.v.address, phone: f.v.phone, email: f.v.email, gstin: f.v.gstin }, calc, gstOn: f.v.gst, notes: f.v.notes, terms: st.invoice?.terms || '', paid: f.v.pay === 'paid', method: f.v.method, paidOn: dmyToISO(f.v.paidOn) };
  const pick = (c) => f.setAll((v) => ({ ...v, name: c.name, phone: c.phone || v.phone, email: c.email || v.email, address: [c.address_line1, c.address_line2, [c.city, c.pincode].filter(Boolean).join(' - '), c.state].filter(Boolean).join('\n') || v.address }));
  const addNew = (name) => run(async () => { await ensureCustomer({ name, email: f.v.email, phone: f.v.phone }); reloadCustomers(); }, `${name} added to customers`);
  async function saveCore() {
    const v = f.v; if (!v.name.trim()) throw new Error('Please add the customer name.'); if (!clean.length || calc.total <= 0) throw new Error('Please add at least one item with a price.'); if (!dmyToISO(v.date)) throw new Error('Please enter the date as DD/MM/YYYY.');
    if (v.due && !dmyToISO(v.due)) throw new Error('Please enter the due date as DD/MM/YYYY.'); const no = v.no.trim(); if (!no) throw new Error('Please add an invoice number.');
    if (data.list.some((x) => x.invoice_no === no && x.id !== inv.id)) throw new Error('That invoice number is already used.');
    const paid = v.pay === 'paid'; const paidOn = paid ? dmyToISO(v.paidOn) : null; if (paid && !paidOn) throw new Error('Please enter the payment date as DD/MM/YYYY.');
    const row = { invoice_no: no, issue_date: issue, due_date: dmyToISO(v.due), customer_name: v.name, customer_email: v.email || null, customer_phone: v.phone || null, customer_address: v.address || null, customer_gstin: v.gst ? v.gstin || null : null, items: clean, discount_paise: calc.discount, gst_enabled: v.gst, gst_rate: Number(clean[0]?.gst_rate) || 18,
      subtotal_paise: calc.subtotal, gst_paise: calc.gst, total_paise: calc.total, notes: v.notes || null, status: paid ? 'paid' : inv.status === 'sent' ? 'sent' : 'draft', paid_on: paidOn, payment_method: paid ? v.method : null };
    const saved = isNew ? must(await sb().from('invoices').insert(row).select().single()) : (must(await sb().from('invoices').update(row).eq('id', inv.id)), { ...inv, ...row });
    await sb().from('ledger_entries').delete().eq('source', 'invoice').eq('source_id', saved.id);     // income is only counted once the money has come in
    if (paid) must(await sb().from('ledger_entries').insert({ entry_date: paidOn, kind: 'in', category: v.category, description: `Invoice ${no}`, amount_paise: calc.total, gst_paise: calc.gst, method: v.method, party: v.name, source: 'invoice', source_id: saved.id }));
    await ensureCustomer({ name: v.name, email: v.email, phone: v.phone }).catch(() => {});
    return saved;
  }
  const sendEmail = async (saved) => {
    const to = RULES.email.done(f.v.email); if (!to) throw new Error('Please add the customer email first.');
    const { data: s } = await supabase().auth.getSession(); const r = await fetch('/api/manager/email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session.access_token}` }, body: JSON.stringify({ type: 'invoice', invoice_id: saved.id, to }) });
    if (!r.ok) throw new Error('Could not send the email. Please check the email settings.'); if (saved.status === 'draft') await sb().from('invoices').update({ status: 'sent' }).eq('id', saved.id);
  };
  const del = () => run(async () => { await sb().from('ledger_entries').delete().eq('source', 'invoice').eq('source_id', inv.id); must(await sb().from('invoices').delete().eq('id', inv.id)); onBack(); }, 'Invoice deleted');
  return (<Page title={isNew ? 'New invoice' : inv.invoice_no} action={<Btn variant="ghost" onClick={onBack}>Close</Btn>}>
    <div className="ad-noprint"><Card><form className="ad-form" onSubmit={(e) => { e.preventDefault(); run(async () => { await saveCore(); onBack(); }, 'Invoice saved'); }}>
      <CustomerSuggest value={f.v.name} onType={(v) => f.set('name', v)} onPick={pick} onAddNew={addNew} customers={customers} required />
      <F form={f} k="phone" label="Phone" type="tel" rule="phone" /><F form={f} k="email" label="Email" type="email" rule="email" />
      <div className="full"><F form={f} k="address" label="Address" type="textarea" rule="text" rows={3} /></div>
      <F form={f} k="no" label="Invoice number" rule="code" required hint="Filled in automatically, you can change it" /><F form={f} k="date" label="Invoice date" type="date" required /><F form={f} k="due" label="Due date" type="date" />
      <div className="full"><F form={f} k="gst" label="Collect GST on this invoice" type="check" /></div>
      {f.v.gst && <F form={f} k="gstin" label="Customer GSTIN" rule="code" maxLength={15} />}
      <div className="full"><p className="ad-section-t">Items (prices before GST)</p>
        {items.map((x, i) => (<div key={i} className={`inv-item ${f.v.gst ? 'gst' : ''}`}>
          <input aria-label="Description" placeholder="Description" value={x.desc} onChange={(e) => setItem(i, 'desc', RULES.title.typing(e.target.value))} onBlur={(e) => setItem(i, 'desc', RULES.title.done(e.target.value))} />
          <input aria-label="Quantity" placeholder="Qty" inputMode="numeric" value={x.qty} onChange={(e) => setItem(i, 'qty', e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <input aria-label="Price" inputMode="decimal" placeholder="₹ price" value={x.price} onChange={(e) => setItem(i, 'price', RULES.money.typing(e.target.value))} />
          {f.v.gst && <><select aria-label="GST rate" value={x.rate} onChange={(e) => setItem(i, 'rate', e.target.value)}>{[...new Set([...RATES, x.rate])].map((r) => <option key={r} value={r}>{r}%</option>)}</select>
            <input aria-label="HSN or SAC code" placeholder="HSN/SAC" inputMode="numeric" value={x.hsn} onChange={(e) => setItem(i, 'hsn', e.target.value.replace(/\D/g, '').slice(0, 8))} /></>}
          <button type="button" className="ad-x" aria-label="Remove item" onClick={() => setItems((a) => (a.length > 1 ? a.filter((_, j) => j !== i) : a))}>✕</button></div>))}
        <div className="ad-actions"><Btn type="button" variant="ghost" className="ad-btn ghost sm" icon="plus" onClick={() => setItems((a) => [...a, { desc: '', qty: '1', price: '', rate: '18', hsn: '' }])}>Add item</Btn></div></div>
      <F form={f} k="discount" label="Discount (₹)" type="money" rule="money" />
      <F form={f} k="pay" label="Payment" type="select" required options={[['unpaid', 'Not paid yet'], ['paid', 'Paid']]} />
      {f.v.pay === 'paid' && <><F form={f} k="method" label="Paid by" type="select" required options={METHOD_OPTIONS} /><F form={f} k="paidOn" label="Paid on" type="date" required /><F form={f} k="category" label="Counts as income under" type="select" required options={IN_CATEGORIES} /></>}
      <div className="full"><F form={f} k="notes" label="Notes" type="textarea" rule="sentence" rows={2} /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>
        <Btn type="button" variant="ghost" busy={busy} icon="mail" onClick={() => run(async () => { const s = await saveCore(); await sendEmail(s); onBack(); }, 'Invoice saved and emailed')}>Email</Btn>
        <Btn type="button" variant="ghost" icon="print" onClick={() => window.print()}>Print</Btn>
        {!isNew && <Confirm onYes={del}>Delete</Confirm>}</div></form></Card></div>
    <FitA4><InvoiceSheet d={doc} /></FitA4>
  </Page>);
}
