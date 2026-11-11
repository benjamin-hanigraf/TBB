'use client';
import { useEffect, useMemo, useState } from 'react';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Btn, F, useForm, useAction, useToast, Confirm, dmyToISO, isoToDMY, fmtD, STATUS_TONE } from './kit';
import { invoiceTotals, nextInvoiceNo, todayISO, money, rupeesToPaise } from '@/lib/accounting';
import { buildManualInvoice, renderInvoiceHTML } from '@/lib/server/invoice';
import { RULES } from '@/lib/format';
import { supabase } from '@/lib/supabase-browser';

export default function InvoiceTool() {
  const [edit, setEdit] = useState(null);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [i, s] = await Promise.all([c.from('invoices').select('*').order('created_at', { ascending: false }).limit(500), c.from('settings').select('key,value')]);
    const st = Object.fromEntries(must(s).map((r) => [r.key, r.value])); return { list: must(i), st };
  });
  if (error) return <Page title="Invoices" back="/admin/tools"><Err e={error} /></Page>; if (!data) return <Page title="Invoices" back="/admin/tools"><Spin /></Page>;
  if (edit) return <Editor inv={edit} data={data} onBack={() => { setEdit(null); reload(); }} />;
  return (<Page title="Invoices" back="/admin/tools" action={<Btn icon="plus" onClick={() => setEdit({})}>New invoice</Btn>}>
    <Card tight>{data.list.length ? <div className="ad-list">{data.list.map((i) => (
      <button key={i.id} className="ad-row" onClick={() => setEdit(i)}><div className="main"><b>{i.customer_name}</b><small>{i.invoice_no} · {fmtD(i.issue_date)}</small></div><div className="end"><b>{money(i.total_paise)}</b><Badge tone={STATUS_TONE[i.status]}>{i.status}</Badge></div></button>))}</div> : <Empty>No invoices yet. Tap "New invoice".</Empty>}</Card>
  </Page>);
}

function Editor({ inv, data, onBack }) {
  const isNew = !inv.id; const gstSet = data.st.gst || { enabled: false, rate_percent: 18 }; const [run, busy] = useAction(); const toast = useToast();
  const f = useForm({ name: inv.customer_name || '', email: inv.customer_email || '', phone: inv.customer_phone || '', address: inv.customer_address || '', gstin: inv.customer_gstin || '', date: isoToDMY(inv.issue_date || todayISO()), due: isoToDMY(inv.due_date), discount: inv.discount_paise ? String(inv.discount_paise / 100) : '', gst: inv.gst_enabled ?? !!gstSet.enabled, notes: inv.notes || '' });
  const [items, setItems] = useState((inv.items?.length ? inv.items : [{ desc: '', qty: 1, unit_paise: 0 }]).map((x) => ({ desc: x.desc, qty: String(x.qty), price: x.unit_paise ? String(x.unit_paise / 100) : '' })));
  const setItem = (i, k, v) => setItems((a) => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const rate = Number(inv.gst_rate) || gstSet.rate_percent || 18; const issue = dmyToISO(f.v.date) || todayISO();
  const clean = items.filter((x) => x.desc.trim() || x.price).map((x) => ({ desc: RULES.title.done(x.desc), qty: Number(x.qty) || 1, unit_paise: rupeesToPaise(x.price) }));
  const t = invoiceTotals(clean, rupeesToPaise(f.v.discount), f.v.gst, rate);
  const rowFor = (no) => ({ invoice_no: no, issue_date: issue, due_date: dmyToISO(f.v.due), customer_name: f.v.name, customer_email: f.v.email || null, customer_phone: f.v.phone || null, customer_address: f.v.address || null, customer_gstin: f.v.gstin || null, items: clean, discount_paise: t.discount, gst_enabled: f.v.gst, gst_rate: rate, subtotal_paise: t.subtotal, gst_paise: t.gst, total_paise: t.total, notes: f.v.notes || null, status: inv.status || 'draft' });
  const doc = useMemo(() => buildManualInvoice(rowFor(inv.invoice_no || 'Preview'), { business: data.st.business, gst: data.st.gst, invoice: data.st.invoice }, f.v.email), [f.v, items]); // eslint-disable-line
  const validate = () => { if (!f.v.name.trim()) throw new Error('Please add the customer name.'); if (!clean.length || t.total <= 0) throw new Error('Please add at least one item with a price.'); if (!dmyToISO(f.v.date)) throw new Error('Please enter the date as DD/MM/YYYY.'); };
  const save = async () => {
    validate(); let no = inv.invoice_no; const prefix = data.st.invoice?.prefix || 'TBB/YYYY-YY';
    if (isNew) { const ex = must(await sb().from('invoices').select('invoice_no').limit(5000)); no = nextInvoiceNo(ex.map((x) => x.invoice_no), prefix, issue); }
    const row = rowFor(no);
    if (isNew) { const r = must(await sb().from('invoices').insert(row).select().single()); return r; }
    must(await sb().from('invoices').update(row).eq('id', inv.id)); return { ...inv, ...row };
  };
  const sendEmail = (saved) => run(async () => {
    const to = RULES.email.done(f.v.email); if (!to) throw new Error('Please add the customer email first.');
    const { data: s } = await supabase().auth.getSession(); const r = await fetch('/api/admin/email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session.access_token}` }, body: JSON.stringify({ type: 'invoice', invoice_id: saved.id, to }) });
    if (!r.ok) throw new Error('Could not send the email. Please check the email settings.');
  }, 'Invoice emailed');
  const markPaid = (saved) => run(async () => {
    must(await sb().from('invoices').update({ status: 'paid' }).eq('id', saved.id));
    const { error } = await sb().from('ledger_entries').insert({ entry_date: todayISO(), kind: 'in', category: 'Services', description: `Invoice ${saved.invoice_no}`, amount_paise: t.total, gst_paise: t.gst, method: 'other', party: f.v.name, source: 'invoice', source_id: saved.id });
    if (error && error.code !== '23505') throw error; onBack();
  }, 'Marked as paid and added to your accounts');
  const del = () => run(async () => { must(await sb().from('invoices').delete().eq('id', inv.id)); onBack(); }, 'Invoice deleted');
  return (<Page title={isNew ? 'New invoice' : inv.invoice_no} back="#" action={<Btn variant="ghost" onClick={onBack}>Close</Btn>}>
    <div className="ad-noprint"><Card><form className="ad-form" onSubmit={(e) => { e.preventDefault(); run(async () => { const s = await save(); if (isNew) onBack(); return s; }, 'Invoice saved'); }}>
      <F form={f} k="name" label="Customer name" rule="name" required /><F form={f} k="phone" label="Phone" type="tel" rule="phone" /><F form={f} k="email" label="Email" type="email" rule="email" />
      <F form={f} k="date" label="Invoice date" type="date" required /><F form={f} k="due" label="Due date" type="date" /><F form={f} k="gstin" label="Customer GSTIN" rule="code" maxLength={15} />
      <div className="full"><F form={f} k="address" label="Address" type="textarea" rule="text" rows={3} /></div>
      <div className="full"><p className="ad-section-t">Items (prices before GST)</p>
        {items.map((x, i) => (<div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) 70px 110px 40px', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <input aria-label="Description" placeholder="Description" value={x.desc} onChange={(e) => setItem(i, 'desc', RULES.title.typing(e.target.value))} onBlur={(e) => setItem(i, 'desc', RULES.title.done(e.target.value))} />
          <input aria-label="Quantity" inputMode="numeric" value={x.qty} onChange={(e) => setItem(i, 'qty', e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <input aria-label="Price" inputMode="decimal" placeholder="₹ price" value={x.price} onChange={(e) => setItem(i, 'price', RULES.money.typing(e.target.value))} />
          <button type="button" className="ad-x" aria-label="Remove item" onClick={() => setItems((a) => (a.length > 1 ? a.filter((_, j) => j !== i) : a))}>✕</button></div>))}
        <div className="ad-actions"><Btn type="button" variant="ghost" className="ad-btn ghost sm" icon="plus" onClick={() => setItems((a) => [...a, { desc: '', qty: '1', price: '' }])}>Add item</Btn></div></div>
      <F form={f} k="discount" label="Discount (₹)" type="money" rule="money" />{gstSet.enabled && <F form={f} k="gst" label={`Add GST (${rate}%)`} type="check" />}
      <div className="full"><F form={f} k="notes" label="Notes" type="textarea" rule="sentence" rows={2} /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>
        <Btn type="button" variant="ghost" busy={busy} icon="mail" onClick={() => run(async () => { const s = await save(); await sendEmail(s); onBack(); })}>Save and email</Btn>
        {!isNew && inv.status !== 'paid' && <Btn type="button" variant="ghost" busy={busy} onClick={async () => { const s = await run(save); if (s) markPaid(s); }}>Mark as paid</Btn>}
        {!isNew && <Confirm onYes={del}>Delete</Confirm>}</div></form></Card></div>
    <Card><div dangerouslySetInnerHTML={{ __html: renderInvoiceHTML(doc) }} /><div className="ad-actions ad-noprint" style={{ justifyContent: 'center' }}><Btn type="button" variant="ghost" icon="print" onClick={() => window.print()}>Print or save as PDF</Btn></div></Card>
  </Page>);
}
