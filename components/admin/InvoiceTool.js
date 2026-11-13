'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { nb, Segs, SortMenu, useBack, useLoad, sb, must, every, Page, Card, Badge, Empty, Spin, Err, Btn, F, useForm, useAction, Confirm, Modal, dmyToISO, isoToDMY, fmtD, fmtDT, download } from './kit';
import { CustomerSuggest, useCustomers, ensureCustomer } from './pickers';
import { InvoiceSheet, FitA4 } from './InvoiceSheet';
import { printElement } from '@/lib/printDoc';
import Icon from '@/components/Icons';
import { nextInvoiceNo, fyOf, todayISO, money, rupeesToPaise, toCSV, IN_CATEGORIES, methodLabel, INVOICE_METHODS } from '@/lib/accounting';
import { calcInvoice } from '@/lib/invoiceCalc';
import { formatFor, formatNumber, nextNumberInList } from '@/lib/numbering';
import { RULES } from '@/lib/format';
import { ADDRESS_TEXT, parseAddress } from '@/lib/address';
import { adminClient as supabase } from '@/lib/supabase-admin';

const param = (k) => { try { return new URLSearchParams(window.location.search).get(k); } catch { return null; } };   // a link from elsewhere in the app (e.g. Accounts) can open one item
const SORTS = [['new', 'Newest first'], ['old', 'Oldest first'], ['high', 'Highest amount'], ['low', 'Lowest amount'], ['name', 'Customer A to Z']];
const RATES = ['0', '5', '12', '18', '28'];
const TYPES = [['invoice', 'Invoice'], ['quotation', 'Quotation']];
const TYPE_NAME = { ...Object.fromEntries(TYPES), credit_note: 'Credit note' };
const SHOW = [['all', 'All'], ['unpaid', 'Unpaid'], ['quotation', 'Quotations']];
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
  if (inv.status === 'draft') return ['Draft', ''];
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
    const { data, error } = await sb().rpc('next_invoice_number');            // uses the number up
    if (!error && Number(data) > 0) return formatNumber(formatFor('invoice', st), Number(data), issue);
    return nextNumberInList(list.filter((x) => typeOf(x) === 'invoice').map((x) => x.invoice_no), formatFor('invoice', st), issue, inv.start || 1);
  }
  return nextNumberInList(list.filter((x) => typeOf(x) === type).map((x) => x.invoice_no), formatFor('quotation', st), issue, inv.quotation_start || 1);
}
/** The number a new document would get, without using it up. Shown in the form so it is never blank. */
async function suggestNumber(type, issue, list, st) {
  const inv = st.invoice || {};
  if (type === 'invoice') {
    const { data, error } = await sb().rpc('peek_invoice_number');
    if (!error && Number(data) > 0) return formatNumber(formatFor('invoice', st), Number(data), issue);
    return nextNumberInList(list.filter((x) => typeOf(x) === 'invoice').map((x) => x.invoice_no), formatFor('invoice', st), issue, inv.start || 1);
  }
  return nextNumberInList(list.filter((x) => typeOf(x) === type).map((x) => x.invoice_no), formatFor('quotation', st), issue, inv.quotation_start || 1);
}

export default function InvoiceTool() {
  const [edit, setEdit] = useState(null); const [q, setQ] = useState(''); const sp = useSearchParams(); const [show, setShow] = useState(() => { const s = sp.get('show'); return SHOW.some(([k]) => k === s) ? s : 'all'; });       // read from the page being opened (a link such as Home's Receivables card picks the Unpaid tab)
  useEffect(() => { const s = sp.get('show'); if (SHOW.some(([k]) => k === s)) setShow(s); }, [sp]); const [sort, setSort] = useState('new');
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
  useEffect(() => { const id = sp.get('open'); const i = id && data?.list.find((x) => x.id === id); if (i) setEdit(i); }, [data, sp]);
  if (error) return <Page title="Invoices"><Err e={error} /></Page>; if (!data) return <Page title="Invoices"><Spin /></Page>;
  if (edit) return <Editor inv={edit} data={data} onOpen={setEdit} onBack={() => { setEdit(null); reload(); }} />;
  const owed = data.list.filter((i) => typeOf(i) === 'invoice' && i.status !== 'cancelled').reduce((s, i) => s + balanceOf(i, data.payments).balance, 0);
  return (<Page title="Invoices" action={<><Btn icon="plus" onClick={() => setEdit({ doc_type: show === 'quotation' ? 'quotation' : 'invoice' })}>New</Btn></>}>
    {owed > 0 && <p className="ad-sub">Still to be paid on invoices: <b>{money(owed)}</b></p>}
    <div className="ad-filterbar"><div className="ad-tabsbar" style={{ margin: 0 }}>
      <button className={show === 'unpaid' ? 'on' : ''} onClick={() => setShow(show === 'unpaid' ? 'all' : 'unpaid')}>{show === 'unpaid' ? 'Show All' : 'Show Unpaid'}</button>
      <button className={show === 'quotation' ? 'on' : ''} onClick={() => setShow(show === 'quotation' ? 'all' : 'quotation')}>Quotations</button></div>
      <SortMenu options={SORTS} value={sort} onChange={setSort} /></div>
    <input className="ad-search" type="search" placeholder="Search customer or number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search invoices" />
    <Card tight>{rows.length ? <div className="ad-list">{rows.map((i) => { const [label, tone] = statusOf(i, data.payments); const b = balanceOf(i, data.payments); const ty = typeOf(i);
      return (<button key={i.id} className="ad-row" onClick={() => setEdit(i)}><div className="main"><b>{nb(i.customer_name)}</b><Segs items={[ty !== 'invoice' ? TYPE_NAME[ty] : '', i.invoice_no, fmtD(i.issue_date), label === 'Part paid' ? `${money(b.balance)} left` : '']} /></div><div className="end"><b>{ty === 'credit_note' ? '− ' : ''}{money(i.total_paise)}</b><Badge tone={tone}>{label}</Badge></div></button>); })}</div>
      : <Empty>{data.list.length ? 'Nothing matches.' : 'No invoices yet. Tap "New".'}</Empty>}</Card>
  </Page>);
}

function Editor({ inv, data, onBack, onOpen }) {
  useBack(onBack);
  const isNew = !inv.id; const [editing, setEditing] = useState(!inv.id); const snap = useRef(null); const sheetBox = useRef(); const [cancel, setCancel] = useState(false); const st = data.st; const gstSet = st.gst || {}; const [run, busy] = useAction(); const { data: customers, reload: reloadCustomers } = useCustomers();
  const [payments, setPayments] = useState(() => data.payments.filter((p) => p.invoice_id === inv.id)); const [payForm, setPayForm] = useState(false);
  const f = useForm({ type: typeOf(inv), name: inv.customer_name || '', email: inv.customer_email || '', phone: inv.customer_phone || '', address: inv.customer_address || '', gstin: inv.customer_gstin || '', date: isoToDMY(inv.issue_date || todayISO()), due: isoToDMY(inv.due_date),
    no: inv.invoice_no || '', discount: inv.discount_paise ? String(inv.discount_paise / 100) : '', gst: isNew && !inv.items ? !!gstSet.enabled : !!inv.gst_enabled, notes: inv.notes || '' });
  const [status, setStatus] = useState(inv.status || 'draft');       // draft after saving, sent when you press Sent; paid, part paid and unpaid follow from the payments
  const [items, setItems] = useState((inv.items?.length ? inv.items : [{ desc: '', qty: 1, unit_paise: 0, gst_rate: 18, hsn: '' }]).map((x) => ({ desc: x.desc, qty: x.qty === null || x.qty === undefined ? '' : String(x.qty), price: x.unit_paise ? String(x.unit_paise / 100) : '', rate: String(x.gst_rate ?? 18), hsn: x.hsn || '' })));
  const type = f.v.type; const issue = dmyToISO(f.v.date) || todayISO();
  const [numbered, setNumbered] = useState(!!inv.invoice_no);
  // A new document gets its number when it is first saved (so two people cannot take the same one); until then a preview is shown.
  // A new document opens with its number already filled in from the running series. You can change it; if you do not, it is the number used.
  const sug = useRef('');
  useEffect(() => { if (!isNew || numbered) return; let on = true; suggestNumber(type, issue, data.list, st).then((n) => { if (!on || !n) return; const prev = sug.current; sug.current = n; setNo((cur) => (!cur || cur === prev ? n : cur)); }).catch(() => {}); return () => { on = false; }; /* eslint-disable-next-line */ }, [type, f.v.date]);
  const setNo = (fn) => f.setAll((v) => ({ ...v, no: fn(v.no) }));
  const setItem = (i, k, v) => setItems((a) => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const clean = items.filter((x) => x.desc.trim() || x.price).map((x) => ({ desc: RULES.title.done(x.desc), qty: String(x.qty).trim() === '' ? null : (Number(x.qty) || 1), unit_paise: rupeesToPaise(x.price), gst_rate: Number(x.rate) || 0, hsn: x.hsn.trim() }));
  const calc = calcInvoice(clean, rupeesToPaise(f.v.discount), f.v.gst);
  const paidSum = payments.reduce((s, p) => s + p.amount_paise, 0) || (type === 'invoice' && status === 'paid' ? calc.total : 0); const balance = Math.max(0, calc.total - paidSum);
  const curStatus = statusOf({ ...inv, status, total_paise: calc.total, due_date: dmyToISO(f.v.due) }, payments);
  const biz = { ...(st.business || {}), address: st.business?.address || ADDRESS_TEXT, name: st.business?.name || 'Thin Black Brush', gstin: gstSet.gstin || '' };
  const title = type === 'quotation' ? 'Quotation' : paidSum > 0 && balance === 0 ? 'Receipt' : 'Invoice';
  const doc = { no: f.v.no || f.v.preview || 'Preview', date: issue, due: type === 'invoice' ? dmyToISO(f.v.due) : null, title, biz, customer: { name: f.v.name, address: f.v.address, phone: f.v.phone, email: f.v.email, gstin: f.v.gstin }, calc, gstOn: f.v.gst, notes: [type === 'quotation' && f.v.due ? `Valid until ${f.v.due}.` : '', f.v.notes].filter(Boolean).join('\n'), terms: st.invoice?.terms || '',
    paid: type === 'invoice' && paidSum > 0 && balance === 0, paidPaise: type === 'invoice' ? paidSum : 0, balance, method: payments.length === 1 ? payments[0].method : '', paidOn: payments.length ? payments[payments.length - 1].paid_on : null };
  const pick = (c) => f.setAll((v) => ({ ...v, name: c.name, phone: c.phone || v.phone, email: c.email || v.email, address: [c.address_line1, c.address_line2, [c.city, c.pincode].filter(Boolean).join(' - '), c.state].filter(Boolean).join('\n') || v.address }));
  const addNew = (name) => run(async () => { await ensureCustomer({ name, email: f.v.email, phone: f.v.phone, ...parseAddress(f.v.address) }); reloadCustomers(); }, `${name} added to customers`);

  async function saveCore() {
    const v = f.v; if (!v.name.trim()) throw new Error('Please add the customer name.'); if (!clean.length || calc.total <= 0) throw new Error('Please add at least one item with a price.'); if (!dmyToISO(v.date)) throw new Error('Please enter the date as DD/MM/YYYY.');
    if (v.due && !dmyToISO(v.due)) throw new Error(`Please enter the ${type === 'quotation' ? 'valid until' : 'due'} date as DD/MM/YYYY.`);
    let no = v.no.trim(); if (!no || (isNew && no === sug.current)) no = await nextNumber(type, issue, data.list, st);       // an unchanged suggestion is the next number in the series: it is used up now
    if (data.list.some((x) => x.invoice_no === no && x.id !== inv.id)) throw new Error('That number is already used.');
    const status = isNew ? 'draft' : type === 'invoice' ? (inv.status === 'cancelled' ? 'cancelled' : paidSum > 0 && paidSum >= calc.total ? 'paid' : inv.status === 'paid' ? 'sent' : inv.status || 'draft') : (inv.status || 'draft');       // a new document is a Draft; Sent is a button; Paid follows the payments
    const row = { doc_type: type, invoice_no: no, issue_date: issue, due_date: dmyToISO(v.due), customer_name: v.name, customer_email: v.email || null, customer_phone: v.phone || null, customer_address: v.address || null, customer_gstin: v.gst ? v.gstin || null : null, items: clean, discount_paise: calc.discount, gst_enabled: v.gst, gst_rate: Number(clean[0]?.gst_rate) || 18,
      subtotal_paise: calc.subtotal, gst_paise: calc.gst, total_paise: calc.total, notes: v.notes || null, status, paid_on: type === 'invoice' ? (status === 'paid' ? payments[payments.length - 1]?.paid_on || null : null) : null, payment_method: type === 'invoice' && status === 'paid' ? payments[payments.length - 1]?.method || null : null };
    const saved = isNew ? must(await sb().from('invoices').insert(row).select().single()) : (must(await sb().from('invoices').update(row).eq('id', inv.id)), { ...inv, ...row });
    f.set('no', no); setNumbered(true);
    await ensureCustomer({ name: v.name, email: v.email, phone: v.phone, ...parseAddress(v.address) }).catch(() => {});
    return saved;
  }
  const email = (saved, kind = 'invoice') => { const to = RULES.email.done(f.v.email); if (!to) throw new Error('Please add the customer email first.'); return managerPost({ type: kind, invoice_id: saved.id, to }); };
  const del = () => run(async () => {
    if (payments.length) throw new Error('This invoice has payments. Use Cancel invoice, then choose what happens to the money.');
    const ids = [inv.id, ...payments.map((p) => p.id)];
    await sb().from('ledger_entries').delete().eq('source', 'invoice').in('source_id', ids); must(await sb().from('invoices').delete().eq('id', inv.id)); onBack(); }, 'Deleted');
  const removePayment = (p) => run(async () => {
    await sb().from('ledger_entries').delete().eq('source', 'invoice').eq('source_id', p.id); must(await sb().from('invoice_payments').delete().eq('id', p.id));
    const left = payments.filter((x) => x.id !== p.id); setPayments(left);
    if (status === 'paid') { await sb().from('invoices').update({ status: 'sent', paid_on: null, payment_method: null }).eq('id', inv.id); setStatus('sent'); } }, 'Payment removed');
  // Turn into invoice: the quotation becomes a new invoice with the same items. For a few seconds an Undo button is shown; nothing is created until they have passed.
  const [turning, setTurning] = useState(false); const turn = useRef(null);
  const makeInvoice = async () => {
    const saved = await saveCore(); if (status !== 'accepted') { must(await sb().from('invoices').update({ status: 'accepted' }).eq('id', saved.id)); setStatus('accepted'); }
    const no = await nextNumber('invoice', todayISO(), data.list, st);
    const { id, created_at, ...rest } = { ...saved, status: 'accepted' };
    const created = must(await sb().from('invoices').insert({ ...rest, doc_type: 'invoice', invoice_no: no, against_no: null, issue_date: todayISO(), due_date: null, status: 'draft', notes: [saved.notes, `From quotation ${saved.invoice_no}.`].filter(Boolean).join('\n') }).select().single());
    onOpen(created);
  };
  const toInvoice = () => { if (turn.current) return; setTurning(true); turn.current = setTimeout(() => { turn.current = null; setTurning(false); run(makeInvoice, 'Invoice made from the quotation'); }, 6000); };
  const undoTurn = () => { clearTimeout(turn.current); turn.current = null; setTurning(false); };
  useEffect(() => () => { if (turn.current) { clearTimeout(turn.current); turn.current = null; makeInvoice().catch(() => {}); } }, []);       // leaving the page does not lose the click
  const markSent = () => run(async () => { must(await sb().from('invoices').update({ status: 'sent' }).eq('id', inv.id)); setStatus('sent'); }, 'Marked as sent');
  const cancelQuote = () => run(async () => { must(await sb().from('invoices').update({ status: 'cancelled' }).eq('id', inv.id)); setStatus('cancelled'); }, 'Quotation cancelled');

  const heading = isNew ? `New ${TYPE_NAME[type].toLowerCase()}` : inv.invoice_no;

  const startEdit = () => { snap.current = { v: f.v, items }; setEditing(true); };
  const stopEdit = () => { if (snap.current) { f.reset(snap.current.v); setItems(snap.current.items); } setEditing(false); };
  const bar = (<>{!editing && <Btn icon="edit" onClick={startEdit}>Edit</Btn>}<Btn variant="ghost" onClick={onBack}>Close</Btn></>);
  const printSheet = () => printElement(sheetBox.current.querySelector('.inv-sheet'), { title: doc.no });
  return (<Page title={heading} action={bar}>
    {!editing && inv.id && <div className="ad-noprint"><p style={{ margin: '0 0 12px' }}><Badge tone={curStatus[1]}>{curStatus[0]}</Badge></p>{turning && <div className="undo-bar"><span>Making an invoice from this quotation…</span><Btn variant="ghost" icon="undo" className="ad-btn ghost sm undo" onClick={undoTurn}>Undo</Btn></div>}</div>}
    {!editing && <div className="ad-noprint"><div className="ad-actions" style={{ marginBottom: 14 }}>
      {inv.id && status === 'draft' && <Btn icon="send" busy={busy} onClick={markSent}>Sent</Btn>}
      <Btn variant="ghost" icon="print" onClick={printSheet}>Print</Btn>
      {inv.customer_email && <Btn variant="ghost" busy={busy} icon="mail" onClick={() => run(async () => { await email(inv); if (status === 'draft') { must(await sb().from('invoices').update({ status: 'sent' }).eq('id', inv.id)); setStatus('sent'); } }, 'Emailed')}>Email</Btn>}
      {type === 'quotation' && inv.id && status !== 'cancelled' && <Btn variant="ghost" busy={busy} icon="note" onClick={toInvoice}>Turn into invoice</Btn>}
      {type === 'quotation' && inv.id && status !== 'cancelled' && <Confirm icon="close" onYes={cancelQuote}>Cancel quotation</Confirm>}
      {type === 'invoice' && inv.id && status !== 'cancelled' && <Btn variant="ghost" icon="close" onClick={() => setCancel(true)}>Cancel invoice</Btn>}</div></div>}
    <div className="ad-noprint">{editing && <Card><form className="ad-form" onSubmit={(e) => { e.preventDefault(); run(async () => { const sv = await saveCore(); if (isNew) onOpen(sv); setEditing(false); snap.current = null; }, 'Saved'); }}>
      {isNew && <div className="full"><div className="ad-tabsbar" style={{ margin: 0 }}>{TYPES.map(([k, t]) => <button type="button" key={k} className={type === k ? 'on' : ''} onClick={() => f.set('type', k)}>{t}</button>)}</div></div>}
      <CustomerSuggest value={f.v.name} onType={(v) => f.set('name', v)} onPick={pick} onAddNew={addNew} customers={customers} required />
      <F form={f} k="phone" label="Phone" type="tel" rule="phone" /><F form={f} k="email" label="Email" type="email" rule="email" />
      <div className="full"><F form={f} k="address" label="Address" type="textarea" rule="text" rows={3} /></div>
      <F form={f} k="no" label="Number" rule="code" hint={isNew && !numbered ? 'The next number in your series. You can change it.' : undefined} />
      <F form={f} k="date" label="Date" type="date" required />
      <F form={f} k="due" label={type === 'quotation' ? 'Valid until' : 'Due date'} type="date" />
      <div className="full"><F form={f} k="gst" label="Collect GST on this document" type="check" /></div>
      {f.v.gst && <F form={f} k="gstin" label="Customer GSTIN" rule="code" maxLength={15} />}
      <div className="full"><p className="ad-section-t">Items (prices before GST)</p>
        <p className="ad-help" style={{ margin: '2px 0 0' }}>Leave Qty empty when it does not apply (for a service). If it is empty on every line, the Qty column is left out.</p>
        {items.map((x, i) => (<div key={i} className={`inv-item ${f.v.gst ? 'gst' : ''}`}>
          <input aria-label="Description" placeholder="Description" value={x.desc} onChange={(e) => setItem(i, 'desc', RULES.title.typing(e.target.value))} onBlur={(e) => setItem(i, 'desc', RULES.title.done(e.target.value))} />
          <input aria-label="Quantity (leave empty if it does not apply)" placeholder="Qty" inputMode="numeric" value={x.qty} onChange={(e) => setItem(i, 'qty', e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <input aria-label="Price" inputMode="decimal" placeholder="₹ price" value={x.price} onChange={(e) => setItem(i, 'price', RULES.money.typing(e.target.value))} />
          {f.v.gst && <><select aria-label="GST rate" value={x.rate} onChange={(e) => setItem(i, 'rate', e.target.value)}>{[...new Set([...RATES, x.rate])].map((r) => <option key={r} value={r}>{r}%</option>)}</select>
            <input aria-label="HSN or SAC code" placeholder="HSN/SAC" inputMode="numeric" value={x.hsn} onChange={(e) => setItem(i, 'hsn', e.target.value.replace(/\D/g, '').slice(0, 8))} /></>}
          <button type="button" className="ad-x" aria-label="Remove item" onClick={() => setItems((a) => (a.length > 1 ? a.filter((_, j) => j !== i) : a))}>✕</button></div>))}
        <div className="ad-actions"><Btn type="button" variant="ghost" className="ad-btn ghost sm" icon="plus" onClick={() => setItems((a) => [...a, { desc: '', qty: '1', price: '', rate: '18', hsn: '' }])}>Add item</Btn></div></div>
      <F form={f} k="discount" label="Discount (₹)" type="money" rule="money" />
      <div className="full"><F form={f} k="notes" label="Notes" type="textarea" rule="sentence" rows={2} /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>
        {!isNew && <Btn type="button" variant="ghost" onClick={stopEdit}>Cancel</Btn>}
        <Btn type="button" variant="ghost" busy={busy} icon="mail" onClick={() => run(async () => { const s = await saveCore(); await email(s); onBack(); }, 'Saved and emailed')}>Email</Btn>
        {!isNew && <Confirm onYes={del}>Delete</Confirm>}</div>
      </form></Card>}

      {type === 'invoice' && !isNew && status !== 'draft' && (<Card title="Payments" action={balance > 0 && status !== 'cancelled' && <Btn variant="ghost" icon="plus" onClick={() => setPayForm(true)}>Add payment</Btn>}>
        {payments.length ? <div className="ad-list">{payments.map((p) => (<div key={p.id} className="ad-row"><div className="main"><b>{money(p.amount_paise)}</b><Segs items={[fmtD(p.paid_on), methodLabel(p.method), p.note]} /></div><div className="end"><Confirm onYes={() => removePayment(p)}>Remove</Confirm></div></div>))}</div> : <Empty>No payments yet.</Empty>}
        <div className="pay-sum"><div><span>Total</span><b>{money(calc.total)}</b></div><div><span>Paid</span><b>{money(paidSum)}</b></div><div className={balance > 0 ? 'due' : 'ok'}><span>{balance > 0 ? 'Left to pay' : 'Fully paid'}</span><b>{money(balance)}</b></div></div>
      </Card>)}
    </div>
    <div ref={sheetBox}><FitA4 fill><InvoiceSheet d={doc} /></FitA4></div>
    {cancel && <CancelInvoice inv={inv} payments={payments} onClose={() => setCancel(false)} onDone={(gone) => { setCancel(false); if (gone) setPayments([]); setStatus('cancelled'); onOpen({ ...inv, status: 'cancelled' }); }} />}
    {payForm && <PaymentForm inv={{ ...inv, invoice_no: f.v.no || inv.invoice_no, customer_name: f.v.name }} balance={balance} total={calc.total} gst={calc.gst} onClose={() => setPayForm(false)}
      onSaved={(p, fullyPaid) => { setPayForm(false); setPayments((a) => [...a, p]); if (fullyPaid) setStatus('paid'); }} />}
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
    <F form={f} k="method" label="Paid by" type="select" required options={INVOICE_METHODS} /><F form={f} k="category" label="Counts as income under" type="select" required options={IN_CATEGORIES} />
    <div className="full"><F form={f} k="note" label="Note" rule="sentence" placeholder="e.g. Advance" /></div>
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save payment</Btn></div></form></Modal>);
}

/** Cancelling an invoice that has been paid: ask what happens to the money. */
function CancelInvoice({ inv, payments, onClose, onDone }) {
  const [run, busy] = useAction(); const paid = payments.reduce((t, p) => t + p.amount_paise, 0);
  const finish = (how) => run(async () => {
    if (how === 'refund') {            // the money goes back to the customer: one refund entry for each payment, in the accounts
      for (const p of payments) {
        const { error } = await sb().from('ledger_entries').insert({ entry_date: todayISO(), kind: 'out', category: 'Refunds', description: `Refund: invoice ${inv.invoice_no}`, amount_paise: p.amount_paise, gst_paise: inv.total_paise ? Math.round((inv.gst_paise || 0) * p.amount_paise / inv.total_paise) : 0, method: ['upi', 'cash', 'card', 'bank', 'razorpay', 'other'].includes(p.method) ? p.method : 'other', party: inv.customer_name, source: 'refund', source_id: p.id });
        if (error && error.code !== '23505') throw error;
      }
    } else if (how === 'remove') {     // the payments were entered by mistake: they and their accounts entries are taken away
      must(await sb().from('invoice_payments').delete().eq('invoice_id', inv.id));
    }
    must(await sb().from('invoices').update({ status: 'cancelled' }).eq('id', inv.id)); onDone(how === 'remove');
  }, 'Invoice cancelled');
  return (<Modal title={`Cancel invoice ${inv.invoice_no}`} onClose={onClose}>
    {payments.length ? <>
      <p style={{ marginTop: 0 }}><b>{money(paid)}</b> has been received on this invoice. What should happen to that money?</p>
      <div className="choice-list">
        <button type="button" className="choice" disabled={busy} onClick={() => finish('refund')}><Icon n="wallet" size={20} /><span><b>Give it back</b><small>Records a refund of {money(paid)} in your accounts.</small></span></button>
        <button type="button" className="choice" disabled={busy} onClick={() => finish('remove')}><Icon n="trash" size={20} /><span><b>Remove the payment</b><small>It was entered by mistake. It is taken out of your accounts.</small></span></button>
        <button type="button" className="choice" disabled={busy} onClick={() => finish('keep')}><Icon n="check" size={20} /><span><b>Keep the money</b><small>For example a cancellation fee. It stays in your accounts as income.</small></span></button></div></>
      : <><p style={{ marginTop: 0 }}>Nothing has been paid on this invoice. It will be marked as cancelled.</p>
        <div className="ad-actions full"><Btn busy={busy} icon="check" onClick={() => finish('none')}>Cancel invoice</Btn></div></>}
    <div className="ad-actions full"><Btn variant="ghost" onClick={onClose}>Keep the invoice</Btn></div>
  </Modal>);
}
