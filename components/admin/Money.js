'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Icon from '@/components/Icons';
import { nb, Segs, useLoad, useToast, sb, must, every, Page, Card, Stat, Badge, Empty, Spin, Err, Modal, Btn, F, useForm, useAction, Confirm, dmyToISO, isoToDMY, fmtD, download } from './kit';
import { syncPaymentsToLedger } from '@/lib/ledgerSync';
import { IN_CATEGORIES, OUT_CATEGORIES, methodChoices, methodLabel, summarise, fyChoices, fyOf, inFY, fyRange, todayISO, money, moneyR, monthLabel, rupeesToPaise, gstInside } from '@/lib/accounting';

export default function Money() {
  const sp = useSearchParams(); const toast = useToast(); const [fy, setFy] = useState(fyOf(todayISO())); const [view, setView] = useState(sp.get('view') === 'report' ? 'report' : 'list'); const [kind, setKind] = useState('all'); const [q, setQ] = useState(''); const [edit, setEdit] = useState(null);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [e, s] = await Promise.all([every(() => c.from('ledger_entries').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false }).order('id')), c.from('settings').select('value').eq('key', 'gst').maybeSingle()]);
    return { entries: must(e), gst: s.data?.value || { enabled: false, rate_percent: 18 } };
  });
  useEffect(() => { let on = true; let full = false; try { const last = Number(localStorage.getItem('tbb-sync-full') || 0); if (Date.now() - last > 6 * 3600e3) { full = true; localStorage.setItem('tbb-sync-full', String(Date.now())); } } catch {}   // the whole history is rechecked now and then; the rest of the time only recent payments
    syncPaymentsToLedger(sb(), { full }).then((n) => { if (on && n > 0) { toast(`${n} payment${n > 1 ? 's' : ''} added to your accounts`); reload(); } }).catch((e) => console.error('sync', e)); return () => { on = false; }; /* eslint-disable-next-line */ }, []);
  useEffect(() => { const n = sp.get('new'); if (n === 'in' || n === 'out') setEdit({ kind: n }); }, [sp]);
  if (error) return <Page title="Accounts"><Err e={error} /></Page>; if (!data) return <Page title="Accounts"><Spin /></Page>;
  const sum = summarise(data.entries, fy); const choices = fyChoices(data.entries); const gstOn = data.gst.enabled;
  const rows = data.entries.filter((e) => inFY(e.entry_date, fy) && (kind === 'all' || e.kind === kind) && (!q || `${e.category} ${e.party || ''} ${e.description || ''}`.toLowerCase().includes(q.toLowerCase())));
  return (<Page title="Accounts" action={<><Btn icon="plus" onClick={() => setEdit({ kind: 'in' })}>Income</Btn><Btn variant="ghost" icon="plus" onClick={() => setEdit({ kind: 'out' })}>Expense</Btn></>}>
    <div className="ad-field" style={{ maxWidth: 240, marginBottom: 14 }}><span>Financial year (April to March)</span><select value={fy} onChange={(e) => setFy(e.target.value)} aria-label="Financial year">{choices.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
    <div className="ad-grid"><Stat label="Income" value={moneyR(sum.moneyIn)} /><Stat label="Expense" value={moneyR(sum.moneyOut)} /><Stat label="Profit" value={moneyR(sum.profit)} tone={sum.profit < 0 ? 'bad' : 'good'} />
      {gstOn && <Stat label="GST to pay" value={moneyR(sum.gstPayable)} sub={`${moneyR(sum.gstCollected)} collected, ${moneyR(sum.gstPaid)} paid on purchases`} />}</div>
    <div className="ad-filterbar"><div className="ad-tabsbar" style={{ margin: 0 }}>{[['all', 'All'], ['in', 'Income'], ['out', 'Expense']].map(([k, t]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{t}</button>)}</div>
      <button type="button" className="ad-x ad-toggle" aria-label={view === 'list' ? 'Show reports' : 'Show entries'} title={view === 'list' ? 'Reports' : 'Entries'} onClick={() => setView(view === 'list' ? 'report' : 'list')}><Icon n={view === 'list' ? 'chartpie' : 'list'} size={18} /></button></div>
    {view === 'list' ? (<>
      <input className="ad-search" type="search" placeholder="Search category, name or note" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search entries" />
      <Card tight>{rows.length ? <div className="ad-list">{rows.map((e) => (
        <button key={e.id} className="ad-row" onClick={() => setEdit(e)}><div className="main"><b>{nb(e.category)}</b><Segs items={[fmtD(e.entry_date), e.party, e.description]} /></div>
          <div className="end"><b style={{ color: e.kind === 'in' ? '#14532d' : '#9b1c1c' }}>{e.kind === 'in' ? '+' : '−'}{money(e.amount_paise)}</b></div></button>))}</div> : <Empty>No entries in {fy}. Tap "Income" or "Expense" to add one. Online payments are added automatically.</Empty>}</Card></>)
    : (<Reports sum={sum} gstOn={gstOn} kind={kind} />)}
    {edit && <Entry e={edit} gst={data.gst} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
  </Page>);
}

const GREYS = ['#1d1d1f', '#4a4a4f', '#76767b', '#9d9da2', '#bdbdc2', '#dcdce0'];
function Donut({ rows, total }) {
  const top = rows.slice(0, 5); const rest = rows.slice(5).reduce((s, r) => s + r.amount, 0); const parts = rest > 0 ? [...top, { category: 'Others', amount: rest }] : top;
  if (!parts.length || !total) return <Empty>Nothing yet.</Empty>;
  const R = 52, C = 2 * Math.PI * R; let acc = 0;
  return (<div className="ad-donut"><svg viewBox="0 0 140 140" role="img" aria-label="Share by category" width="150" height="150"><circle cx="70" cy="70" r={R} fill="none" stroke="#f0f0f3" strokeWidth="22" />
    {parts.map((r, i) => { const frac = r.amount / total; const el = <circle key={r.category} cx="70" cy="70" r={R} fill="none" stroke={GREYS[i]} strokeWidth="22" strokeDasharray={`${Math.max(0, frac * C - 1.5)} ${C}`} strokeDashoffset={-acc * C} transform="rotate(-90 70 70)" />; acc += frac; return el; })}</svg>
    <ul>{parts.map((r, i) => <li key={r.category}><i style={{ background: GREYS[i] }} /><span>{r.category}</span><b>{Math.round((r.amount / total) * 100)}%</b><small>{moneyR(r.amount)}</small></li>)}</ul></div>);
}
function Reports({ sum, gstOn, kind }) {
  return (<>
    {kind !== 'out' && <Card title="Where the income came from"><Donut rows={sum.inByCategory} total={sum.moneyIn} /></Card>}
    {kind !== 'in' && <Card title="Where the expense went"><Donut rows={sum.outByCategory} total={sum.moneyOut} /></Card>}
    {kind !== 'out' && sum.tdsByCustomer.length > 0 && <Card title="TDS deducted by customers">
      <p style={{ margin: '0 0 6px' }}><b>{moneyR(sum.tdsTotal)}</b> in TDS from {sum.tdsByCustomer.length} {sum.tdsByCustomer.length === 1 ? 'customer' : 'customers'} this financial year{sum.moneyIn ? `, ${Math.round((sum.tdsTotal / sum.moneyIn) * 1000) / 10}% of your income` : ''}.</p>
      <div className="ad-list">{sum.tdsByCustomer.map((t) => <div key={t.customer} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{t.customer}</b><small>{t.count} {t.count === 1 ? 'payment' : 'payments'}</small></div><div className="end"><b>{moneyR(t.amount)}</b></div></div>)}</div>
      <p className="ad-help" style={{ marginBottom: 0 }}>This is tax your customers have deducted and paid to the government on your behalf. You can claim it as credit when you file your return.</p></Card>}
    <Card title="Month by month"><div className="ad-scroll"><table className="ad-table"><thead><tr><th>Month</th><th className="r">Income</th><th className="r">Expense</th><th className="r">Profit</th>{gstOn && <th className="r">GST due</th>}</tr></thead>
      <tbody>{sum.months.map((m) => <tr key={m.month}><td>{monthLabel(m.month)}</td><td className="r">{moneyR(m.in)}</td><td className="r">{moneyR(m.out)}</td><td className="r" style={{ color: m.profit < 0 ? '#9b1c1c' : undefined }}>{moneyR(m.profit)}</td>{gstOn && <td className="r">{moneyR(m.gstPayable)}</td>}</tr>)}
        {!sum.months.length && <tr><td colSpan={5}><Empty>No entries yet.</Empty></td></tr>}</tbody></table></div></Card>
    {gstOn && <Card title="GST summary"><p style={{ margin: 0 }}>GST collected from customers: <b>{moneyR(sum.gstCollected)}</b><br />GST paid on your purchases: <b>{moneyR(sum.gstPaid)}</b><br />GST payable to the government: <b>{moneyR(sum.gstPayable)}</b></p><p className="ad-help">This is a guide for your accountant. It is not a GST return.</p></Card>}
  </>);
}

/** Where an automatic entry came from, as a link into the app (or null). */
async function sourceLink(e) {
  const id = e.source_id; if (!id) return null; const c = sb(); const one = async (t, cols) => (await c.from(t).select(cols).eq('id', id).maybeSingle()).data;
  if (await one('orders', 'id')) return `/manager/orders?open=${id}`;
  const b = await one('bookings', 'workshop_id'); if (b) return `/manager/workshops?people=${b.workshop_id}`;
  const en = await one('class_enrolments', 'class_id'); if (en) return `/manager/classes?people=${en.class_id}`;
  if (await one('invoices', 'id')) return `/manager/invoices?open=${id}`;
  if (await one('rentouts', 'id')) return '/manager/planner';
  const p = await one('invoice_payments', 'invoice_id'); if (p) return `/manager/invoices?open=${p.invoice_id}`;
  return null;
}
function Entry({ e, gst, onClose, onSaved }) {
  const isNew = !e.id; const auto = e.source && e.source !== 'manual'; const [run, busy] = useAction(); const [link, setLink] = useState(null); const [editing, setEditing] = useState(isNew);
  useEffect(() => { if (auto) sourceLink(e).then(setLink).catch(() => {}); /* eslint-disable-next-line */ }, [e.id]);
  const f = useForm({ kind: e.kind || 'in', date: isoToDMY(e.entry_date || todayISO()), amount: e.amount_paise ? String(e.amount_paise / 100) : '', hasGst: e.gst_paise > 0, gstAmt: e.gst_paise ? String(e.gst_paise / 100) : '', category: e.category || '', party: e.party || '', method: e.method === 'card' ? 'bank' : e.method || 'upi', description: e.description || '' });
  const cats = f.v.kind === 'in' ? IN_CATEGORIES : OUT_CATEGORIES;
  const suggest = () => f.v.amount && gst.enabled ? String(gstInside(rupeesToPaise(f.v.amount), gst.rate_percent || 18) / 100) : '';
  const save = (ev) => { ev.preventDefault(); return run(async () => {
    const iso = dmyToISO(f.v.date); if (!iso) throw new Error('Please enter the date as DD/MM/YYYY.'); const amt = rupeesToPaise(f.v.amount); if (amt <= 0) throw new Error('Please enter an amount.');
    const g = f.v.hasGst ? rupeesToPaise(f.v.gstAmt || suggest()) : 0; if (g > amt) throw new Error('GST cannot be more than the amount.');
    const row = { entry_date: iso, kind: f.v.kind, category: f.v.category, amount_paise: amt, gst_paise: g, method: f.v.method, party: f.v.party || null, description: f.v.description || null };
    must(isNew ? await sb().from('ledger_entries').insert({ ...row, source: 'manual' }) : await sb().from('ledger_entries').update(row).eq('id', e.id)); onSaved();
  }, 'Saved'); };
  const del = () => run(async () => { must(await sb().from('ledger_entries').delete().eq('id', e.id)); onSaved(); }, 'Deleted');
  return (<Modal title={isNew ? (f.v.kind === 'in' ? 'Income' : 'Expense') : 'Entry'} onClose={onClose}>
    {link && <p className="ad-help" style={{ marginTop: 0 }}><a className="ad-linkbtn" href={link}>See where it came from</a></p>}
    {!editing && <><dl className="ad-view">{[['Type', e.kind === 'in' ? 'Income (received)' : 'Expense (spent)'], ['Date', fmtD(e.entry_date)], ['Amount', money(e.amount_paise)], ['Category', e.category], [e.kind === 'in' ? 'Received from' : 'Paid to', e.party], ['Paid by', methodLabel(e.method)], ['GST included', e.gst_paise > 0 ? money(e.gst_paise) : ''], ['Note', e.description]].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <div className="ad-actions full"><Btn icon="edit" onClick={() => setEditing(true)}>Edit</Btn></div></>}
    {editing && <form onSubmit={save} className="ad-form">
      <F form={f} k="kind" label="Type" type="select" required options={[['in', 'Income (received)'], ['out', 'Expense (spent)']]} />
      <F form={f} k="date" label="Date" type="date" required />
      <F form={f} k="amount" label="Amount (₹)" type="money" rule="money" required />
      <F form={f} k="category" label="Category" type="select" required options={cats} />
      <F form={f} k="party" label={f.v.kind === 'in' ? 'Received from' : 'Paid to'} rule="name" />
      <F form={f} k="method" label="Paid by" type="select" required options={methodChoices(e.method)} />
      {gst.enabled && <><div className="full"><F form={f} k="hasGst" label="This amount includes GST" type="check" /></div>{f.v.hasGst && <F form={f} k="gstAmt" label="GST included (₹)" type="money" rule="money" placeholder={suggest()} hint={`Leave empty to use ${gst.rate_percent || 18}% of the amount`} />}</>}
      <div className="full"><F form={f} k="description" label="Note" rule="sentence" /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Btn type="button" variant="ghost" onClick={() => { f.reset(); setEditing(false); }}>Cancel</Btn>}{!isNew && <Confirm onYes={del}>Delete</Confirm>}</div>
    </form>}</Modal>);
}
