'use client';
import { useEffect, useMemo, useState } from 'react';
import { useLoad, sb, must, every, Page, Card, Badge, Empty, Spin, Err, Btn, F, useForm, useAction, Confirm, Modal, dmyToISO, isoToDMY, fmtD, fmtDT, download } from './kit';
import ImportCsv from './ImportCsv';
import { CustomerSuggest, useCustomers, ensureCustomer } from './pickers';
import { InvoiceSheet, FitA4 } from './InvoiceSheet';
import { METHOD_OPTIONS } from './ManualEntry';
import { nextInvoiceNo, fyOf, todayISO, money, rupeesToPaise, toCSV, IN_CATEGORIES } from '@/lib/accounting';
import { calcInvoice } from '@/lib/invoiceCalc';
import { RULES } from '@/lib/format';
import { ADDRESS_TEXT } from '@/lib/address';
import { adminClient as supabase } from '@/lib/supabase-admin';

const param = (k) => { try { return new URLSearchParams(window.location.search).get(k); } catch { return null; } };   // a link from elsewhere in the app (e.g. Accounts) can open one item
const SORTS = [['new', 'Newest first'], ['old', 'Oldest first'], ['high', 'Highest amount'], ['low', 'Lowest amount'], ['name', 'Customer A to Z']];
const RATES = ['0', '5', '12', '18', '28'];
const TYPES = [['invoice', 'Invoice'], ['quotation', 'Quotation']];
const TYPE_NAME = { ...Object.fromEntries(TYPES), credit_note: 'Credit note' };
const SHOW = [['all', 'All'], ['unpaid', 'Unpaid'], ['paid', 'Paid'], ['quotation', 'Quotations']];
const typeOf = (i) => i.doc_type || 'invoice';

/** How much has been paid on an invoice and what is left. */
export function balanceOf(inv, payments = []) {
  let paid = payments.filter((p) => p.invoice_id === inv.id).reduce((s, p) => s + p.amount_paise, 0);
  if (!paid && inv.status === 'paid' && typeOf(inv) === 'invoice') paid = inv.total_paise || 0;   // imported or older invoices marked paid without payment rows
  return { paid, balance: Math.max(0, (inv.total_paise || 0) - paid) };
}
/** Status shown for a row: Paid, Part paid, Unpaid, Accepted, Refunded, and so on. */
export function statusOf(inv, payments = []) {
  const t = typeOf(inv);
  if (inv.status === 'cancelled') return ['Cancelled', 'bad'];
  if (t === 'quotation') return inv.status === 'accepted' ? ['Accepted', 'ok'] : inv.status === 'sent' ? ['Sent', 'info'] : ['Draft', ''];
  if (t === 'credit_note') return ['Credit note', ''];          // no longer made; any older one still shows
  const { paid, balance } = balanceOf(inv, payments);
  if (paid > 0 && balance === 0) return ['Paid', 'ok'];
  if (paid > 0) return ['Part paid', 'warn'];
  return [inv.due_date && inv.due_date < todayISO() ? 'Overdue' : 'Unpaid', inv.due_date && inv.due_date < todayISO() ? 'bad' : 'warn'];
}

async function managerPost(body) {
  const { data: s } = await supabase().auth.getSession();
  const r = await fetch('/api/manager/email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session?.access_token}` }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status === 400 ? 'Please check the customer email address.' : 'Could not send the email. Please check the email settings.');
}

/** Next number. Invoices share one series with website receipts (kept in the database); quotations have their own. */
async function nextNumber(type, issue, list, st) {
  const inv = st.invoice || {};
  if (type === 'invoice') {
    const { data, error } = await sb().rpc('next_invoice_number');
    if (!error && data) { const p = String(inv.prefix || 'TBB/YYYY-YY').replace(/yyyy-yy/gi, fyOf(issue)).replace(/\/+$/, ''); return `${p}/${String(data).padStart(3, '0')}`; }
    return nextInvoiceNo(list.filter((x) => typeOf(x) === 'invoice').map((x) => x.invoice_no), inv.prefix || 'TBB/YYYY-YY', issue, inv.start || 1);
  }
  const prefix = inv.quotation_prefix || 'TBB-Q/YYYY-YY';
  return nextInvoiceNo(list.filter((x) => typeOf(x) === type).map((x) => x.invoice_no), prefix, issue, 1);
}

export default function InvoiceTool() {
  const [edit, setEdit] = useState(null); const [imp, setImp] = useState(false); const [q, setQ] = useState(''); const [show, setShow] = useState('all'); const [sort, setSort] = useState('new');
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [i, s, p] = await Promise.all([every(() => c.from('invoices').select('*').order('created_at', { ascending: false }).order('id')), c.from('settings').select('key,value'), every(() => c.from('invoice_payments').select('*').order('paid_on').order('id'))]);
    return { list: must(i), st: Object.fromEntries(must(s).map((r) => [r.key, r.value])), payments: p.error ? [] : p.data };
  });
  const rows = useMemo(() => {
    if (!data) return []; const t = q.trim().toLowerCase();
    const keep = (i) => { const ty = typeOf(i); if (show === 'quotation') return ty === show; if (show === 'all') return true; if (ty !== 'invoice' || i.status === 'cancelled') return false; const b = balanceOf(i, data.payments); return show === 'paid' ? b.paid > 0 && b.balance === 0 : b.balance > 0; };
    const r = data.list.filter((i) => keep(i) && (!t || `${i.customer_name} ${i.invoice_no} ${i.customer_email || ''}`.toLowerCase().includes(t)));
    const by = { new: (a, b) => b.issue_date.localeCompare(a.issue_date) || b.created_at.localeCompare(a.created_at), old: (a, b) => a.issue_date.localeCompare(b.issue_date), high: (a, b) => b.total_paise - a.total_paise, low: (a, b) => a.total_paise - b.total_paise, name: (a, b) => a.customer_name.localeCompare(b.customer_name) };
    return r.sort(by[sort]);
  }, [data, q, show, sort]);
  useEffect(() => { const id = param('open'); const i = id && data?.list.find((x) => x.id === id); if (i) setEdit(i); }, [data]);
  if (error) return <Page title="Invoices"><Err e={error} /></Page>; if (!data) return <Page title="Invoices"><Spin /></Page>;
  if (edit) return <Editor inv={edit} data={data} onOpen={setEdit} onBack={() => { setEdit(null); reload(); }} />;
  const owed = data.list.filter((i) => typeOf(i) === 'invoice' && i.status !== 'cancelled').reduce((s, i) => s + balanceOf(i, data.payments).balance, 0);
  const exportAll = () => download('invoices.csv', toCSV(data.list, [{ label: 'Type', get: (i) => TYPE_NAME[typeOf(i)] }, { label: 'Invoice no', key: 'invoice_no' }, { label: 'Date', key: 'issue_date' }, { label: 'Due', key: 'due_date' }, { label: 'Customer', key: 'customer_name' }, { label: 'Email', key: 'customer_email' }, { label: 'Phone', key: 'customer_phone' }, { label: 'Address', key: 'customer_address' }, { label: 'Amount', get: (i) => i.total_paise / 100 }, { label: 'GST', get: (i) => i.gst_paise / 100 }, { label: 'Paid', get: (i) => balanceOf(i, data.payments).paid / 100 }, { label: 'Balance', get: (i) => (typeOf(i) === 'invoice' ? balanceOf(i, data.payments).balance / 100 : 0) }, { label: 'Status', get: (i) => statusOf(i, data.payments)[0] }, { label: 'Paid on', key: 'paid_on' }]));
  return (<Page title="Invoices" action={<><Btn variant="ghost" icon="filein" onClick={() => setImp(true)}>Import</Btn><Btn variant="ghost" icon="fileout" onClick={exportAll}>Export</Btn><Btn icon="plus" onClick={() => setEdit({ doc_type: show === 'quotation' ? 'quotation' : 'invoice' })}>New</Btn></>}>
    {owed > 0 && <p className="ad-sub">Still to be paid on invoices: <b>{money(owed)}</b></p>}
    <div className="ad-filterbar"><div className="ad-tabsbar" style={{ margin: 0 }}>{SHOW.map(([k, t]) => <button key={k} className={show === k ? 'on' : ''} onClick={() => setShow(k)}>{t}</button>)}</div>
      <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="ad-sort">{SORTS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>
    <input className="ad-search" type="search" placeholder="Search customer or number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search invoices" />
    <Card tight>{rows.length ? <div className="ad-list">{rows.map((i) => { const [label, tone] = statusOf(i, data.payments); const b = balanceOf(i, data.payments); const ty = typeOf(i);
      return (<button key={i.id} className="ad-row" onClick={() => setEdit(i)}><div className="main"><b>{i.customer_name}</b><small>{ty !== 'invoice' ? `${TYPE_NAME[ty]} · ` : ''}{i.invoice_no} · {fmtD(i.issue_date)}{label === 'Part paid' ? ` · ${money(b.balance)} left` : ''}</small></div><div className="end"><b>{ty === 'credit_note' ? '− ' : ''}{money(i.total_paise)}</b><Badge tone={tone}>{label}</Badge></div></button>); })}</div>
      : <Empty>{data.list.length ? 'Nothing matches.' : 'No invoices yet. Tap "New".'}</Empty>}</Card>
    {imp && <ImportCsv kind="invoices" onClose={() => setImp(false)} onDone={reload} />}
  </Page>);
}

function Editor({ inv, data, onBack, onOpen }) {
  const isNew = !inv.id; const st = data.st; const gstSet = st.gst || {}; const [run, busy] = useAction(); const { data: customers, reload: reloadCustomers } = useCustomers();
  const [payments, setPayments] = useState(() => data.payments.filter((p) => p.invoice_id === inv.id)); const [payForm, setPayForm] = useState(false);
  const f = useForm({ type: typeOf(inv), name: inv.customer_name || '', email: inv.customer_email || '', phone: inv.customer_phone || '', address: inv.customer_address || '', gstin: inv.customer_gstin || '', date: isoToDMY(inv.issue_date || todayISO()), due: isoToDMY(inv.due_date),
    no: inv.invoice_no || '', discount: inv.discount_paise ? String(inv.discount_paise / 100) : '', gst: isNew && !inv.items ? !!gstSet.enabled : !!inv.gst_enabled, notes: inv.notes || '', state: inv.status || 'draft',
    payNow: 'no', method: 'upi', paidOn: isoToDMY(todayISO()), category: 'Services' });
  const [items, setItems] = useState((inv.items?.length ? inv.items : [{ desc: '', qty: 1, unit_paise: 0, gst_rate: 18, hsn: '' }]).map((x) => ({ desc: x.desc, qty: String(x.qty), price: x.unit_paise ? String(x.unit_paise / 100) : '', rate: String(x.gst_rate ?? 18), hsn: x.hsn || '' })));
  const type = f.v.type; const issue = dmyToISO(f.v.date) || todayISO();
  const [numbered, setNumbered] = useState(!!inv.invoice_no);
  // A new document gets its number when it is first saved (so two people cannot take the same one); until then a preview is shown.
  useEffect(() => { if (isNew && !numbered) { const prefix = type === 'invoice' ? st.invoice?.prefix || 'TBB/YYYY-YY' : st.invoice?.quotation_prefix || 'TBB-Q/YYYY-YY'; f.set('no', ''); f.set('preview', `${prefix.replace(/yyyy-yy/gi, fyOf(issue)).replace(/\/+$/, '')}/…`); } /* eslint-disable-next-line */ }, [type]);
  const setItem = (i, k, v) => setItems((a) => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const clean = items.filter((x) => x.desc.trim() || x.price).map((x) => ({ desc: RULES.title.done(x.desc), qty: Number(x.qty) || 1, unit_paise: rupeesToPaise(x.price), gst_rate: Number(x.rate) || 0, hsn: x.hsn.trim() }));
  const calc = calcInvoice(clean, rupeesToPaise(f.v.discount), f.v.gst);
  const paidSum = payments.reduce((s, p) => s + p.amount_paise, 0) || (type === 'invoice' && f.v.state === 'paid' ? calc.total : 0); const balance = Math.max(0, calc.total - paidSum);
  const biz = { ...(st.business || {}), address: st.business?.address || ADDRESS_TEXT, name: st.business?.name || 'Thin Black Brush', gstin: gstSet.gstin || '' };
  const title = type === 'quotation' ? 'Quotation' : paidSum > 0 && balance === 0 ? 'Receipt' : 'Invoice';
  const doc = { no: f.v.no || f.v.preview || 'Preview', date: issue, due: type === 'invoice' ? dmyToISO(f.v.due) : null, title, biz, customer: { name: f.v.name, address: f.v.address, phone: f.v.phone, email: f.v.email, gstin: f.v.gstin }, calc, gstOn: f.v.gst, notes: [type === 'quotation' && f.v.due ? `Valid until ${f.v.due}.` : '', f.v.notes].filter(Boolean).join('\n'), terms: st.invoice?.terms || '',
    paid: type === 'invoice' && paidSum > 0 && balance === 0, paidPaise: type === 'invoice' ? paidSum : 0, balance, method: payments.length === 1 ? payments[0].method : '', paidOn: payments.length ? payments[payments.length - 1].paid_on : null };
  const pick = (c) => f.setAll((v) => ({ ...v, name: c.name, phone: c.phone || v.phone, email: c.email || v.email, address: [c.address_line1, c.address_line2, [c.city, c.pincode].filter(Boolean).join(' - '), c.state].filter(Boolean).join('\n') || v.address }));
  const addNew = (name) => run(async () => { await ensureCustomer({ name, email: f.v.email, phone: f.v.phone }); reloadCustomers(); }, `${name} added to customers`);

  async function saveCore() {
    const v = f.v; if (!v.name.trim()) throw new Error('Please add the customer name.'); if (!clean.length || calc.total <= 0) throw new Error('Please add at least one item with a price.'); if (!dmyToISO(v.date)) throw new Error('Please enter the date as DD/MM/YYYY.');
    if (v.due && !dmyToISO(v.due)) throw new Error(`Please enter the ${type === 'quotation' ? 'valid until' : 'due'} date as DD/MM/YYYY.`);
    let no = v.no.trim(); if (!no) no = await nextNumber(type, issue, data.list, st);
    if (data.list.some((x) => x.invoice_no === no && x.id !== inv.id)) throw new Error('That number is already used.');
    const status = type === 'invoice' ? (v.state === 'cancelled' ? 'cancelled' : paidSum > 0 && paidSum >= calc.total ? 'paid' : v.state === 'paid' ? 'sent' : v.state) : v.state;
    const row = { doc_type: type, invoice_no: no, issue_date: issue, due_date: dmyToISO(v.due), customer_name: v.name, customer_email: v.email || null, customer_phone: v.phone || null, customer_address: v.address || null, customer_gstin: v.gst ? v.gstin || null : null, items: clean, discount_paise: calc.discount, gst_enabled: v.gst, gst_rate: Number(clean[0]?.gst_rate) || 18,
      subtotal_paise: calc.subtotal, gst_paise: calc.gst, total_paise: calc.total, notes: v.notes || null, status, paid_on: type === 'invoice' ? (status === 'paid' ? payments[payments.length - 1]?.paid_on || null : null) : null, payment_method: type === 'invoice' && status === 'paid' ? payments[payments.length - 1]?.method || null : null };
    const saved = isNew ? must(await sb().from('invoices').insert(row).select().single()) : (must(await sb().from('invoices').update(row).eq('id', inv.id)), { ...inv, ...row });
    f.set('no', no); setNumbered(true);
    if (type === 'invoice' && v.payNow === 'yes' && balance > 0 && status !== 'cancelled') {   // marked paid in full while saving: record the rest as one payment
      const on = dmyToISO(v.paidOn); if (!on) throw new Error('Please enter the payment date as DD/MM/YYYY.');
      const p = must(await sb().from('invoice_payments').insert({ invoice_id: saved.id, amount_paise: balance, paid_on: on, method: v.method }).select().single());
      must(await sb().from('ledger_entries').insert({ entry_date: on, kind: 'in', category: v.category, description: `Invoice ${no}`, amount_paise: balance, gst_paise: calc.total ? Math.round(calc.gst * balance / calc.total) : 0, method: v.method, party: v.name, source: 'invoice', source_id: p.id }));
      must(await sb().from('invoices').update({ status: 'paid', paid_on: on, payment_method: v.method }).eq('id', saved.id));
      setPayments((a) => [...a, p]); f.set('payNow', 'no'); f.set('state', 'paid');
    }
    await ensureCustomer({ name: v.name, email: v.email, phone: v.phone }).catch(() => {});
    return saved;
  }
  const email = (saved, kind = 'invoice') => { const to = RULES.email.done(f.v.email); if (!to) throw new Error('Please add the customer email first.'); return managerPost({ type: kind, invoice_id: saved.id, to }); };
  const del = () => run(async () => {
    const ids = [inv.id, ...payments.map((p) => p.id)];
    await sb().from('ledger_entries').delete().eq('source', 'invoice').in('source_id', ids); must(await sb().from('invoices').delete().eq('id', inv.id)); onBack(); }, 'Deleted');
  const removePayment = (p) => run(async () => {
    await sb().from('ledger_entries').delete().eq('source', 'invoice').eq('source_id', p.id); must(await sb().from('invoice_payments').delete().eq('id', p.id));
    const left = payments.filter((x) => x.id !== p.id); setPayments(left);
    if (inv.status === 'paid' || f.v.state === 'paid') { await sb().from('invoices').update({ status: 'sent', paid_on: null, payment_method: null }).eq('id', inv.id); f.set('state', 'sent'); } }, 'Payment removed');
  const toInvoice = () => run(async () => {           // a quotation the customer accepted becomes a new invoice with the same items
    const saved = await saveCore(); if (f.v.state !== 'accepted') must(await sb().from('invoices').update({ status: 'accepted' }).eq('id', saved.id));
    const no = await nextNumber('invoice', todayISO(), data.list, st);
    const { id, created_at, ...rest } = { ...saved, status: 'accepted' };
    const created = must(await sb().from('invoices').insert({ ...rest, doc_type: 'invoice', invoice_no: no, against_no: null, issue_date: todayISO(), due_date: null, status: 'draft', notes: [saved.notes, `From quotation ${saved.invoice_no}.`].filter(Boolean).join('\n') }).select().single());
    onOpen(created); }, 'Invoice made from the quotation');

  const STATE_OPTS = type === 'quotation' ? [['draft', 'Draft'], ['sent', 'Sent'], ['accepted', 'Accepted'], ['cancelled', 'Cancelled']] : [['draft', 'Draft'], ['sent', 'Sent'], ['cancelled', 'Cancelled']];
  useEffect(() => { if (!STATE_OPTS.some(([k]) => k === f.v.state) && !(type === 'invoice' && f.v.state === 'paid')) f.set('state', STATE_OPTS[0][0]); /* eslint-disable-next-line */ }, [type]);
  const heading = isNew ? `New ${TYPE_NAME[type].toLowerCase()}` : inv.invoice_no;

  return (<Page title={heading} action={<Btn variant="ghost" onClick={onBack}>Close</Btn>}>
    <div className="ad-noprint"><Card><form className="ad-form" onSubmit={(e) => { e.preventDefault(); run(async () => { await saveCore(); onBack(); }, 'Saved'); }}>
      {isNew && <div className="full"><div className="ad-tabsbar" style={{ margin: 0 }}>{TYPES.map(([k, t]) => <button type="button" key={k} className={type === k ? 'on' : ''} onClick={() => f.set('type', k)}>{t}</button>)}</div></div>}
      <CustomerSuggest value={f.v.name} onType={(v) => f.set('name', v)} onPick={pick} onAddNew={addNew} customers={customers} required />
      <F form={f} k="phone" label="Phone" type="tel" rule="phone" /><F form={f} k="email" label="Email" type="email" rule="email" />
      <div className="full"><F form={f} k="address" label="Address" type="textarea" rule="text" rows={3} /></div>
      <F form={f} k="no" label="Number" rule="code" placeholder={f.v.preview} hint={numbered ? undefined : 'Given automatically when you save. Type one only to override it.'} />
      <F form={f} k="date" label="Date" type="date" required />
      <F form={f} k="due" label={type === 'quotation' ? 'Valid until' : 'Due date'} type="date" />
      <F form={f} k="state" label="Status" type="select" required options={type === 'invoice' && f.v.state === 'paid' ? [['paid', 'Paid'], ...STATE_OPTS] : STATE_OPTS} />
      <div className="full"><F form={f} k="gst" label="Collect GST on this document" type="check" /></div>
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
      {type === 'invoice' && balance > 0 && f.v.state !== 'cancelled' && <F form={f} k="payNow" label="Payment" type="select" required options={[['no', paidSum ? 'Part paid (add payments below)' : 'Not paid yet'], ['yes', paidSum ? `Paid the rest (${money(balance)}) now` : 'Paid in full']]} />}
      {f.v.payNow === 'yes' && type === 'invoice' && <><F form={f} k="method" label="Paid by" type="select" required options={METHOD_OPTIONS} /><F form={f} k="paidOn" label="Paid on" type="date" required /><F form={f} k="category" label="Counts as income under" type="select" required options={IN_CATEGORIES} /></>}
      <div className="full"><F form={f} k="notes" label="Notes" type="textarea" rule="sentence" rows={2} /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>
        <Btn type="button" variant="ghost" busy={busy} icon="mail" onClick={() => run(async () => { const s = await saveCore(); await email(s); onBack(); }, 'Saved and emailed')}>Email</Btn>
        {type === 'invoice' && !isNew && balance > 0 && <Btn type="button" variant="ghost" busy={busy} icon="mail" onClick={() => run(async () => { const s = await saveCore(); await email(s, 'reminder'); }, 'Reminder sent')}>Send reminder</Btn>}
        {type === 'quotation' && !isNew && <Btn type="button" variant="ghost" busy={busy} icon="note" onClick={toInvoice}>Turn into invoice</Btn>}
        <Btn type="button" variant="ghost" icon="print" onClick={() => window.print()}>Print</Btn>
        {!isNew && <Confirm onYes={del}>Delete</Confirm>}</div>
      {inv.last_reminder_at && <p className="ad-sub full">Last reminder sent {fmtDT(inv.last_reminder_at)}</p>}</form></Card>

      {type === 'invoice' && (<Card title="Payments" action={!isNew && balance > 0 && <Btn variant="ghost" icon="plus" onClick={() => setPayForm(true)}>Add payment</Btn>}>
        {isNew ? <Empty>Choose "Paid in full" above, or save first and add payments here as they come in.</Empty> : <>
          {payments.length ? <div className="ad-list">{payments.map((p) => (<div key={p.id} className="ad-row"><div className="main"><b>{money(p.amount_paise)}</b><small>{[fmtD(p.paid_on), METHOD_OPTIONS.find(([k]) => k === p.method)?.[1] || p.method, p.note].filter(Boolean).join(' · ')}</small></div><div className="end"><Confirm onYes={() => removePayment(p)}>Remove</Confirm></div></div>))}</div> : <Empty>No payments yet.</Empty>}
          <p className="ad-sub">Total {money(calc.total)} · Paid {money(paidSum)} · <b>{balance > 0 ? `Left to pay ${money(balance)}` : 'Fully paid'}</b></p></>}
      </Card>)}
    </div>
    <FitA4><InvoiceSheet d={doc} /></FitA4>
    {payForm && <PaymentForm inv={{ ...inv, invoice_no: f.v.no || inv.invoice_no, customer_name: f.v.name }} balance={balance} total={calc.total} gst={calc.gst} onClose={() => setPayForm(false)}
      onSaved={(p, fullyPaid) => { setPayForm(false); setPayments((a) => [...a, p]); if (fullyPaid) f.set('state', 'paid'); }} />}
  </Page>);
}

/** One payment towards an invoice. Each payment is its own income entry in the accounts, on the day the money came in. */
function PaymentForm({ inv, balance, total, gst, onClose, onSaved }) {
  const [run, busy] = useAction(); const f = useForm({ amount: String(balance / 100), on: isoToDMY(todayISO()), method: 'upi', category: 'Services', note: '' });
  const save = (e) => { e.preventDefault(); run(async () => {
    const amt = rupeesToPaise(f.v.amount); if (amt <= 0) throw new Error('Please enter the amount received.'); if (amt > balance) throw new Error(`That is more than the ${money(balance)} still to be paid.`);
    const on = dmyToISO(f.v.on); if (!on) throw new Error('Please enter the date as DD/MM/YYYY.');
    const p = must(await sb().from('invoice_payments').insert({ invoice_id: inv.id, amount_paise: amt, paid_on: on, method: f.v.method, note: f.v.note || null }).select().single());
    must(await sb().from('ledger_entries').insert({ entry_date: on, kind: 'in', category: f.v.category, description: `Invoice ${inv.invoice_no}${amt < total ? ' (part payment)' : ''}`, amount_paise: amt, gst_paise: total ? Math.round(gst * amt / total) : 0, method: f.v.method, party: inv.customer_name, source: 'invoice', source_id: p.id }));
    const fullyPaid = amt === balance; if (fullyPaid) must(await sb().from('invoices').update({ status: 'paid', paid_on: on, payment_method: f.v.method }).eq('id', inv.id));
    onSaved(p, fullyPaid); }, 'Payment added'); };
  return (<Modal title="Add payment" onClose={onClose}><form className="ad-form" onSubmit={save}>
    <F form={f} k="amount" label="Amount received (₹)" type="money" rule="money" required hint={`${money(balance)} is still to be paid`} /><F form={f} k="on" label="Received on" type="date" required />
    <F form={f} k="method" label="Paid by" type="select" required options={METHOD_OPTIONS} /><F form={f} k="category" label="Counts as income under" type="select" required options={IN_CATEGORIES} />
    <div className="full"><F form={f} k="note" label="Note" rule="sentence" placeholder="e.g. Advance" /></div>
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save payment</Btn></div></form></Modal>);
}
