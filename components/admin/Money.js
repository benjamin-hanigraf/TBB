'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Icon from '@/components/Icons';
import { nb, useLoad, useToast, sb, must, every, Page, Card, Stat, Badge, Empty, Spin, Err, Modal, Btn, F, useForm, useAction, Confirm, dmyToISO, isoToDMY, fmtD, download } from './kit';
import { syncPaymentsToLedger } from '@/lib/ledgerSync';
import { IN_CATEGORIES, OUT_CATEGORIES, methodChoices, methodLabel, summarise, fyChoices, fyOf, inFY, fyRange, todayISO, money, moneyR, monthLabel, rupeesToPaise, gstInside } from '@/lib/accounting';

export default function Money() {
  const sp = useSearchParams(); const toast = useToast(); const [fy, setFy] = useState(fyOf(todayISO())); const [view, setView] = useState(sp.get('view') === 'report' ? 'report' : 'list'); const [kind, setKind] = useState('all'); const [q, setQ] = useState(''); const [edit, setEdit] = useState(null);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [e, s, inv, bk, en, ord] = await Promise.all([
      every(() => c.from('ledger_entries').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false }).order('id')),
      c.from('settings').select('value').eq('key', 'gst').maybeSingle(),
      every(() => c.from('invoices').select('id,invoice_no,customer_name,issue_date,due_date,total_paise,status,doc_type,invoice_payments(amount_paise)').eq('doc_type', 'invoice').not('status', 'in', '("cancelled","draft")')),
      every(() => c.from('bookings').select('amount_paise,name,created_at').eq('status', 'pending')),
      every(() => c.from('class_enrolments').select('amount_paise,name,created_at').eq('status', 'pending')),
      every(() => c.from('orders').select('total_paise,name,created_at').eq('status', 'pending')),
    ]);
    // Everything customers still owe, one line per customer (invoices with a balance, and sign-ups / orders not paid yet)
    const owed = []; const add = (name, amount, from, what) => { if (amount > 0) owed.push({ name: String(name || '').trim() || 'Not named', amount, from: String(from || '').slice(0, 10), what }); };
    for (const i of inv.error ? [] : inv.data) add(i.customer_name, Math.max(0, (i.total_paise || 0) - (i.invoice_payments || []).reduce((t, p) => t + p.amount_paise, 0)), i.due_date || i.issue_date, 'invoice');
    for (const x of bk.error ? [] : bk.data) add(x.name, x.amount_paise, x.created_at, 'workshop sign-up');
    for (const x of en.error ? [] : en.data) add(x.name, x.amount_paise, x.created_at, 'class enrolment');
    for (const x of ord.error ? [] : ord.data) add(x.name, x.total_paise, x.created_at, 'order');
    const receivables = owed.reduce((t, o) => t + o.amount, 0);
    return { entries: must(e), gst: s.data?.value || { enabled: false, rate_percent: 18 }, receivables, owed };
  });
  useEffect(() => { let on = true; let full = false; try { const last = Number(localStorage.getItem('tbb-sync-full') || 0); if (Date.now() - last > 6 * 3600e3) { full = true; localStorage.setItem('tbb-sync-full', String(Date.now())); } } catch {}   // the whole history is rechecked now and then; the rest of the time only recent payments
    syncPaymentsToLedger(sb(), { full }).then((n) => { if (on && n > 0) { toast(`${n} payment${n > 1 ? 's' : ''} added to your accounts`); reload(); } }).catch((e) => console.error('sync', e)); return () => { on = false; }; /* eslint-disable-next-line */ }, []);
  useEffect(() => { const n = sp.get('new'); if (n === 'in' || n === 'out' || n === 'entry') setEdit({ kind: n === 'out' ? 'out' : 'in' }); }, [sp]);
  if (error) return <Page title="Accounts"><Err e={error} /></Page>; if (!data) return <Page title="Accounts"><Spin /></Page>;
  const sum = summarise(data.entries, fy); const choices = fyChoices(data.entries); const gstOn = data.gst.enabled;
  const rows = data.entries.filter((e) => inFY(e.entry_date, fy) && (kind === 'all' || e.kind === kind) && (!q || `${e.category} ${e.party || ''} ${e.description || ''}`.toLowerCase().includes(q.toLowerCase())));
  return (<Page title="Accounts" action={<>
    <select className="ad-fy-sel" value={fy} onChange={(e) => setFy(e.target.value)} aria-label="Financial year">{choices.map((c) => <option key={c} value={c}>{c}</option>)}</select>
    <Btn icon="plus" onClick={() => setEdit({ kind: 'in' })}>Add Entry</Btn>
  </>}>
    <div className="ad-grid"><Stat label="Income" value={moneyR(sum.moneyIn)} /><Stat label="Expense" value={moneyR(sum.moneyOut)} /><Stat label="Profit" value={moneyR(sum.profit)} tone={sum.profit < 0 ? 'bad' : ''} /><Stat label="Receivables" value={moneyR(data.receivables)} />
      {gstOn && <Stat label="GST to pay" value={moneyR(sum.gstPayable)} sub={`${moneyR(sum.gstCollected)} collected, ${moneyR(sum.gstPaid)} credit from purchases`} />}</div>
    <div className="ad-filterbar"><div className="ad-tabsbar" style={{ margin: 0 }}>{[['all', 'All'], ['in', 'Income'], ['out', 'Expense']].map(([k, t]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{t}</button>)}</div>
      <button type="button" className="ad-x ad-toggle" aria-label={view === 'list' ? 'Show reports' : 'Show entries'} title={view === 'list' ? 'Reports' : 'Entries'} onClick={() => setView(view === 'list' ? 'report' : 'list')}><Icon n={view === 'list' ? 'chartpie' : 'list'} size={18} /></button></div>
    {view === 'list' ? (<>
      <input className="ad-search" type="search" placeholder="Search category, name or note" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search entries" />
      <Card tight>{rows.length ? <div className="ad-list">{rows.map((e) => (
        <button key={e.id} className="ad-row tx-row" onClick={() => setEdit(e)}><div className="main"><b>{nb(e.party || e.description || e.category)}</b>{e.party && e.description && <small>{nb(e.description)}</small>}</div>
          <div className="tx-tag"><Badge>{e.category}</Badge></div>
          <div className="end"><b style={{ color: e.kind === 'in' ? '#14532d' : '#9b1c1c' }}>{e.kind === 'in' ? '+' : '−'}{money(e.amount_paise)}</b><small>{fmtD(e.entry_date)}</small></div></button>))}</div> : <Empty>No entries in {fy}. Tap "Add Entry" to add one. Online payments are added automatically.</Empty>}</Card></>)
    : (<Reports sum={sum} gstOn={gstOn} kind={kind} owed={data.owed} />)}
    {edit && <Entry e={edit} gst={data.gst} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
  </Page>);
}

const GREYS = ['#1d1d1f', '#4a4a4f', '#76767b', '#9d9da2', '#bdbdc2', '#dcdce0'];
/** One horizontal bar split by category (largest first, the smallest grouped as Others), with the figures listed below it. */
function StackBar({ rows, total, label }) {
  const top = rows.slice(0, 5); const rest = rows.slice(5).reduce((s, r) => s + r.amount, 0); const parts = rest > 0 ? [...top, { category: 'Others', amount: rest }] : top;
  if (!parts.length || !total) return <Empty>Nothing yet.</Empty>;
  return (<div className="ad-stack"><div className="ad-stack-bar" role="img" aria-label={label}>{parts.map((r, i) => <i key={r.category} style={{ width: `${(r.amount / total) * 100}%`, background: GREYS[i] }} title={`${r.category}: ${moneyR(r.amount)}`} />)}</div>
    <ul>{parts.map((r, i) => <li key={r.category}><i style={{ background: GREYS[i] }} /><span>{r.category}</span><b>{Math.round((r.amount / total) * 100)}%</b><small>{moneyR(r.amount)}</small></li>)}</ul></div>);
}
const short = (paise) => { const n = Math.abs(paise) / 100; const t = n >= 1e7 ? `${+(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `${+(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}k` : String(Math.round(n)); return `${paise < 0 ? '−' : ''}₹${t}`; };
const mon = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' });
/** Income and expense as bars for every month, with the profit as a line over the same months. */
function MonthChart({ months }) {
  if (!months.length) return null;
  const W = 640, H = 260, L = 50, Rt = 10, T = 14, B = 28; const hi = Math.max(1, ...months.flatMap((m) => [m.in, m.out, m.profit])); const lo = Math.min(0, ...months.map((m) => m.profit));
  const y = (v) => T + ((hi - v) / (hi - lo)) * (H - T - B); const gw = (W - L - Rt) / months.length; const bw = Math.min(22, gw * 0.32); const cx = (i) => L + gw * i + gw / 2;
  const ticks = [lo, lo + (hi - lo) / 2, hi].map((v) => Math.round(v / 100) * 100);
  return (<div className="ad-mchart"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Income and expense by month, with profit as a line">
    {ticks.map((v, i) => <g key={i}><line x1={L} x2={W - Rt} y1={y(v)} y2={y(v)} stroke="#e5e5ea" strokeWidth="1" /><text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6e6e73">{short(v)}</text></g>)}
    <line x1={L} x2={W - Rt} y1={y(0)} y2={y(0)} stroke="#8e8e93" strokeWidth="1" />
    {months.map((m, i) => <g key={m.month}><rect x={cx(i) - bw - 1} y={Math.min(y(0), y(m.in))} width={bw} height={Math.abs(y(m.in) - y(0))} rx="3" fill="#1d1d1f"><title>{`${monthLabel(m.month)} income ${moneyR(m.in)}`}</title></rect>
      <rect x={cx(i) + 1} y={Math.min(y(0), y(m.out))} width={bw} height={Math.abs(y(m.out) - y(0))} rx="3" fill="#c7c7cc"><title>{`${monthLabel(m.month)} expense ${moneyR(m.out)}`}</title></rect>
      <text x={cx(i)} y={H - 9} textAnchor="middle" fontSize="11" fill="#6e6e73">{mon(m.month)}</text></g>)}
    <polyline points={months.map((m, i) => `${cx(i)},${y(m.profit)}`).join(' ')} fill="none" stroke="#0071e3" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    {months.map((m, i) => <circle key={m.month} cx={cx(i)} cy={y(m.profit)} r="4" fill="#fff" stroke="#0071e3" strokeWidth="2"><title>{`${monthLabel(m.month)} profit ${moneyR(m.profit)}`}</title></circle>)}
  </svg>
  <p className="ad-legend"><span><i style={{ background: '#1d1d1f' }} />Income</span><span><i style={{ background: '#c7c7cc' }} />Expense</span><span><i className="ln" />Profit</span></p></div>);
}
const age = (from) => { if (!from) return ''; const d = Math.floor((Date.now() - new Date(`${from}T00:00:00`).getTime()) / 864e5); return d > 0 ? `${d} ${d === 1 ? 'day' : 'days'} ago` : 'today'; };
function Reports({ sum, gstOn, kind, owed }) {
  const byCust = Object.values(owed.reduce((m, o) => { const k = o.name.toLowerCase(); const c = (m[k] ||= { name: o.name, amount: 0, count: 0, from: '' }); c.amount += o.amount; c.count += 1; if (o.from && (!c.from || o.from < c.from)) c.from = o.from; return m; }, {})).sort((a, b) => b.amount - a.amount);
  const owedTotal = byCust.reduce((t, c) => t + c.amount, 0); const showGst = gstOn || sum.gstCollected > 0 || sum.gstPaid > 0;
  return (<>
    {kind !== 'out' && <Card title="Who owes you"><p style={{ margin: '0 0 6px' }}>{byCust.length ? <><b>{moneyR(owedTotal)}</b> from {byCust.length} {byCust.length === 1 ? 'customer' : 'customers'}, biggest balance first.</> : 'Nobody owes you anything right now.'}</p>
      {byCust.length > 0 && <div className="ad-list">{byCust.map((c) => <div key={c.name} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{nb(c.name)}</b><small>{c.count} {c.count === 1 ? 'item' : 'items'} · since {age(c.from)}</small></div><div className="end"><b>{moneyR(c.amount)}</b></div></div>)}</div>}
      <p className="ad-help" style={{ marginBottom: 0 }}>Unpaid invoices (after part payments) plus sign-ups, enrolments and orders that are not paid yet. Drafts are not counted.</p></Card>}
    {kind !== 'out' && <Card title="Where the income came from"><StackBar rows={sum.inByCategory} total={sum.moneyIn} label="Income by category" /></Card>}
    {kind !== 'in' && <Card title="Where the expense went"><StackBar rows={sum.outByCategory} total={sum.moneyOut} label="Expense by category" /></Card>}
    {kind !== 'out' && sum.tdsByCustomer.length > 0 && <Card title="TDS deducted by customers">
      <p style={{ margin: '0 0 6px' }}><b>{moneyR(sum.tdsTotal)}</b> in TDS from {sum.tdsByCustomer.length} {sum.tdsByCustomer.length === 1 ? 'customer' : 'customers'} this financial year{sum.moneyIn ? `, ${Math.round((sum.tdsTotal / sum.moneyIn) * 1000) / 10}% of your income` : ''}.</p>
      <div className="ad-list">{sum.tdsByCustomer.map((t) => <div key={t.customer} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{t.customer}</b><small>{t.count} {t.count === 1 ? 'payment' : 'payments'}</small></div><div className="end"><b>{moneyR(t.amount)}</b></div></div>)}</div>
      <p className="ad-help" style={{ marginBottom: 0 }}>This is tax your customers have deducted and paid to the government on your behalf. You can claim it as credit when you file your return.</p></Card>}
    <Card title="Month by month"><MonthChart months={sum.months} /><div className="ad-scroll"><table className="ad-table"><thead><tr><th>Month</th><th className="r">Income</th><th className="r">Expense</th><th className="r">Profit</th></tr></thead>
      <tbody>{sum.months.map((m) => <tr key={m.month}><td>{monthLabel(m.month)}</td><td className="r">{moneyR(m.in)}</td><td className="r">{moneyR(m.out)}</td><td className="r" style={{ color: m.profit < 0 ? '#9b1c1c' : undefined }}>{moneyR(m.profit)}</td></tr>)}
        {!sum.months.length && <tr><td colSpan={4}><Empty>No entries yet.</Empty></td></tr>}</tbody></table></div></Card>
    {showGst && <Card title="GST summary"><div className="ad-scroll"><table className="ad-table"><thead><tr><th>Month</th><th className="r">Output (collected)</th><th className="r">Input (paid)</th><th className="r">To pay</th></tr></thead>
      <tbody>{sum.months.map((m) => <tr key={m.month}><td>{monthLabel(m.month)}</td><td className="r">{moneyR(m.gstIn)}</td><td className="r">{moneyR(m.gstOut)}</td><td className="r">{moneyR(m.gstPayable)}</td></tr>)}
        <tr className="tot"><td><b>Total</b></td><td className="r"><b>{moneyR(sum.gstCollected)}</b></td><td className="r"><b>{moneyR(sum.gstPaid)}</b></td><td className="r"><b>{moneyR(sum.gstPayable)}</b></td></tr></tbody></table></div>
      <p className="ad-help" style={{ marginBottom: 0 }}>Output GST is what customers paid you. Input GST is the credit on your own bills. The difference is what you pay the government. This is a guide for your accountant, not a GST return.</p></Card>}
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
    const out = f.v.kind === 'out'; const g = f.v.hasGst ? rupeesToPaise(out ? f.v.gstAmt : f.v.gstAmt || suggest()) : 0;
    if (f.v.hasGst && out && g <= 0) throw new Error('Please enter the GST amount shown on the bill.'); if (g > amt) throw new Error(out ? 'The GST amount cannot be more than the amount spent.' : 'GST cannot be more than the amount.');       // on an expense it is the GST credit to claim back
    const row = { entry_date: iso, kind: f.v.kind, category: f.v.category, amount_paise: amt, gst_paise: g, method: f.v.method, party: f.v.party || null, description: f.v.description || null };
    must(isNew ? await sb().from('ledger_entries').insert({ ...row, source: 'manual' }) : await sb().from('ledger_entries').update(row).eq('id', e.id)); onSaved();
  }, 'Saved'); };
  const del = () => run(async () => { must(await sb().from('ledger_entries').delete().eq('id', e.id)); onSaved(); }, 'Deleted');
  return (<Modal title={isNew ? 'Add Entry' : 'Entry'} onClose={onClose}>
    {link && <p className="ad-help" style={{ marginTop: 0 }}><a className="ad-linkbtn" href={link}>See where it came from</a></p>}
    {!editing && <><dl className="ad-view">{[['Type', e.kind === 'in' ? 'Income (received)' : 'Expense (spent)'], ['Date', fmtD(e.entry_date)], ['Amount', money(e.amount_paise)], ['Category', e.category], [e.kind === 'in' ? 'Received from' : 'Paid to', e.party], ['Paid by', methodLabel(e.method)], [e.kind === 'out' ? 'GST on the bill' : 'GST included', e.gst_paise > 0 ? money(e.gst_paise) : ''], ['Note', e.description]].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <div className="ad-actions full"><Btn icon="edit" onClick={() => setEditing(true)}>Edit</Btn></div></>}
    {editing && <form onSubmit={save} className="ad-form">
      {isNew && <div className="full"><div className="ad-tabsbar" style={{ margin: 0 }}>{[['in', 'Income'], ['out', 'Expense']].map(([k, t]) => <button type="button" key={k} className={f.v.kind === k ? 'on' : ''} onClick={() => { f.set('kind', k); f.set('category', ''); }}>{t}</button>)}</div></div>}
      <F form={f} k="date" label="Date" type="date" required />
      <F form={f} k="amount" label="Amount (₹)" type="money" rule="money" required />
      <F form={f} k="category" label="Category" type="select" required options={cats} />
      <F form={f} k="party" label={f.v.kind === 'in' ? 'Received from' : 'Paid to'} rule="name" />
      <F form={f} k="method" label="Paid by" type="select" required options={methodChoices(e.method)} />
      {f.v.kind === 'out'
        ? <><div className="full"><F form={f} k="hasGst" label="Contains GST?" type="check" /></div>{f.v.hasGst && <F form={f} k="gstAmt" label="GST amount (₹)" type="money" rule="money" required hint="The GST part of the bill" />}</>
        : gst.enabled && <><div className="full"><F form={f} k="hasGst" label="This amount includes GST" type="check" /></div>{f.v.hasGst && <F form={f} k="gstAmt" label="GST included (₹)" type="money" rule="money" placeholder={suggest()} hint={`Leave empty to use ${gst.rate_percent || 18}% of the amount`} />}</>}
      <div className="full"><F form={f} k="description" label="Note" rule="sentence" /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Btn type="button" variant="ghost" onClick={() => { f.reset(); setEditing(false); }}>Cancel</Btn>}{!isNew && <Confirm onYes={del}>Delete</Confirm>}</div>
    </form>}</Modal>);
}
