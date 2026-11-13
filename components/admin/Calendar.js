'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icons';
import { nb, Segs, useLoad, sb, must, every, Card, Fold, Empty, Spin, Err, Badge, Modal, ViewModal, Btn, F, useForm, useAction, Confirm, dmyToISO, isoToDMY, fmtD } from './kit';
import { todayISO, rupeesToPaise, money, methodLabel } from '@/lib/accounting';
import { addDays } from '@/lib/dates';
import { parseSlot } from '@/lib/clash';
import { useClash } from './Clash';
import { METHOD_OPTIONS } from './ManualEntry';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');
const istDate = (s) => new Date(new Date(s).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const istTime = (s) => new Date(s).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
const KINDS = { workshop: 'Workshop', class: 'Class', todo: 'Task', event: 'Event', rentout: 'Rent-out' };
const LETTER = { workshop: 'W', class: 'C', rentout: 'R', event: 'E', todo: 'T' };
const span = (a, b, max) => { const out = []; for (let d = a, n = 0; d <= b && n < max; d = addDays(d, 1), n++) out.push(d); return out; };

/** Turns workshops, class sessions, to-dos, events and rent-outs into one list of {date, title, kind, time, note, href}. */
export function buildEvents({ workshops = [], sessions = [], todos = [], events = [], rentouts = [] }) {
  const ev = [];
  for (const w of workshops) {
    if (w.status === 'cancelled') continue; const s = istDate(w.starts_at); const e = w.kind === 'course' && w.ends_at ? istDate(w.ends_at) : s;
    for (const d of span(s, e, 120)) ev.push({ date: d, title: w.title, kind: 'workshop', time: d === s ? istTime(w.starts_at) : '', note: w.venue_name || '', draft: w.status === 'draft', href: '/manager/workshops' });
  }
  for (const s of sessions) { if (s.status === 'cancelled') continue; const en = s.class_enrolments; const lv = en?.class_levels;     // a class shows the student's name; the class details are in the list below
    ev.push({ date: s.on_date, title: en?.student_name || 'Class', kind: 'class', time: s.time_text || '', note: `${lv?.title || 'Class'}${lv?.level ? ` (${lv.level})` : ''} · Class ${s.no}${s.status === 'done' ? ' · attended' : ''}${s.moved_from ? ' · moved' : ''}`, href: '/manager/classes' }); }
  for (const t of todos) if (t.due_on && !t.done) ev.push({ date: t.due_on, title: t.title, kind: 'todo', time: '', note: t.note || '', href: `/manager/planner?todo=${t.id}` });
  for (const e of events) for (const d of span(e.on_date, e.end_date && e.end_date > e.on_date ? e.end_date : e.on_date, 60)) ev.push({ date: d, title: e.title, kind: 'event', time: d === e.on_date ? e.time_text || '' : '', note: e.note || '', event: e });
  for (const r of rentouts) for (const d of span(r.on_date, r.end_date && r.end_date > r.on_date ? r.end_date : r.on_date, 60)) ev.push({ date: d, title: r.name, kind: 'rentout', time: d === r.on_date ? r.time_text || '' : '', note: [r.purpose, r.amount_paise ? (r.paid ? `${money(r.amount_paise)} paid` : `${money(r.amount_paise)} not paid yet`) : ''].filter(Boolean).join(' · '), rentout: r });
  return ev.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
}


const monthIdx = (mi) => ({ y: Math.floor(mi / 12), m: (mi % 12) + 1 });
/** What the rent-out has been paid so far. An older rent-out that was only marked "paid" counts as one payment. */
export const rentPayments = (r) => (r.rentout_payments?.length ? r.rentout_payments : r.paid && r.amount_paise > 0 ? [{ id: r.id, amount_paise: r.amount_paise, paid_on: r.paid_on || r.on_date, method: r.method, legacy: true }] : []);
const paidOf = (r) => rentPayments(r).reduce((t, p) => t + p.amount_paise, 0);

export default function CalendarPanel({ version = 0, ym, setYm, sel, setSel, onOpen }) {
  const today = todayISO(); const [pick, setPick] = useState(false); const [pickYear, setPickYear] = useState(null);
  const [yy, mm] = ym.split('-').map(Number); const wk = Math.floor((yy * 12 + mm - 1) / 6);          // the calendar loads a window of about 18 months and loads the next one when you travel beyond it
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const a = monthIdx(wk * 6 - 3), b = monthIdx(wk * 6 + 12); const lo = `${a.y}-${pad(a.m)}-01`; const hi = `${b.y}-${pad(b.m)}-${pad(new Date(b.y, b.m, 0).getDate())}`; const loW = addDays(lo, -45);
    const rent = async () => { const r = await every(() => c.from('rentouts').select('*,rentout_payments(*)').gte('on_date', loW).lte('on_date', hi).order('on_date').order('id')); return r.error ? every(() => c.from('rentouts').select('*').gte('on_date', loW).lte('on_date', hi).order('on_date').order('id')) : r; };
    const [w, s, t, e, r] = await Promise.all([
      every(() => c.from('workshops').select('id,title,kind,starts_at,ends_at,venue_name,status').gte('starts_at', `${loW}T00:00:00+05:30`).lte('starts_at', `${hi}T23:59:59+05:30`).order('starts_at').order('id')),
      every(() => c.from('class_sessions').select('*,class_enrolments(student_name,class_levels(title,level))').gte('on_date', lo).lte('on_date', hi).order('on_date').order('id')),
      every(() => c.from('todos').select('id,title,note,due_on,done').eq('done', false).not('due_on', 'is', null).order('id')),
      every(() => c.from('events').select('*').gte('on_date', loW).lte('on_date', hi).order('on_date').order('id')),
      rent()]);
    // Show whatever loaded. A missing table (database not updated yet) should not blank the whole calendar.
    const missing = []; const ok = (x, name) => { if (!x.error) return x.data || []; missing.push(name); console.error('calendar', name, x.error); return []; };
    return { workshops: ok(w, 'workshops'), sessions: ok(s, 'classes'), todos: ok(t, 'tasks'), events: ok(e, 'events'), rentouts: ok(r, 'rent-outs'), missing };
  }, [wk]);
  const first = useRef(true); useEffect(() => { if (first.current) { first.current = false; return; } reload(); }, [version, reload]);       // refreshes in place: the calendar never flashes empty
  const events = useMemo(() => (data ? buildEvents(data) : []), [data]);
  const by = useMemo(() => { const m = {}; events.forEach((e) => (m[e.date] ||= []).push(e)); return m; }, [events]);
  if (error) return <Err e={error} />; if (!data) return <Spin />;
  const [y, m] = [yy, mm]; const lead = new Date(y, m - 1, 1).getDay(); const count = new Date(y, m, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => `${ym}-${pad(i + 1)}`)]; while (cells.length % 7) cells.push(null);
  const go = (n) => { const d = new Date(y, m - 1 + n, 1); setYm(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); };
  const upcoming = events.filter((e) => e.date >= today).slice(0, 10); const dayList = by[sel] || [];
  const py = pickYear ?? y;
  const row = (e, i, showDate) => { const inner = (<><div className="main"><b>{nb(e.title)}</b><Segs items={[showDate && new Date(`${e.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), e.time, e.note]} /></div><div className="end"><Badge tone={`k-${e.kind}`}>{KINDS[e.kind]}</Badge></div></>);
    return e.event ? <button key={i} className="ad-row" onClick={() => onOpen(e.event, 'event')}>{inner}</button> : e.rentout ? <button key={i} className="ad-row" onClick={() => onOpen(e.rentout, 'rentout')}>{inner}</button> : <Link key={i} href={e.href} className="ad-row">{inner}</Link>; };
  return (<>
    {data.missing?.length > 0 && <p className="ad-err" role="alert">Could not load {data.missing.join(', ')}. If this keeps happening, supabase/database.sql may not have been run yet.</p>}
    <Card>
      <div className="cal-head"><button className="ad-x" aria-label="Previous month" onClick={() => go(-1)}><Icon n="left" size={18} /></button>
        <div className="cal-mid"><button type="button" className="cal-title" aria-expanded={pick} aria-haspopup="listbox" onClick={() => { setPickYear(y); setPick(!pick); }}>{MONTHS[m - 1]} {y}</button></div>
        <button className="ad-x" aria-label="Next month" onClick={() => go(1)}><Icon n="right" size={18} /></button></div>
      {pick && <div className="cal-pickwrap">
        <div className="cal-pickhead"><button type="button" className="ad-x" aria-label="Previous year" onClick={() => setPickYear(py - 1)}><Icon n="left" size={16} /></button><b>{py}</b><button type="button" className="ad-x" aria-label="Next year" onClick={() => setPickYear(py + 1)}><Icon n="right" size={16} /></button></div>
        <div className="cal-pick" role="listbox" aria-label="Choose a month">{MONTHS.map((n, i) => <button key={n} type="button" role="option" aria-selected={py === y && i + 1 === m} className={`${py === y && i + 1 === m ? 'on' : ''} ${`${py}-${pad(i + 1)}` === today.slice(0, 7) ? 'now' : ''}`} onClick={() => { setYm(`${py}-${pad(i + 1)}`); setPick(false); }}>{n.slice(0, 3)}</button>)}</div></div>}
      <div className="cal-grid" role="grid" aria-label={`${MONTHS[m - 1]} ${y}`}>
        {DAYS.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => d ? (<button key={d} type="button" className={`cal-day ${d === today ? 'today' : ''} ${d === sel ? 'sel' : ''}`} onClick={() => setSel(d)} aria-label={`${+d.slice(8)} ${MONTHS[m - 1]}${by[d] ? `, ${by[d].length} item${by[d].length > 1 ? 's' : ''}` : ''}`}>
          <b>{+d.slice(8)}</b>
          <span className="cal-chips">{(by[d] || []).slice(0, 2).map((e, k) => <i key={k} className={`chip ${e.kind} ${e.draft ? 'draft' : ''}`}><em>{e.title}</em></i>)}{(by[d] || []).length > 2 && <i className="more">+{by[d].length - 2}</i>}</span>
          <span className="cal-letters" aria-hidden="true">{(by[d] || []).slice(0, 4).map((e, k) => <i key={k} className={e.kind}>{LETTER[e.kind]}</i>)}{(by[d] || []).length > 4 && <i className="more">+</i>}</span></button>) : <div key={`e${i}`} className="cal-empty" />)}
      </div>
    </Card>
    <Card title={new Date(`${sel}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}>
      {dayList.length ? <div className="ad-list">{dayList.map((e, i) => row(e, i, false))}</div> : <Empty>Nothing scheduled.</Empty>}</Card>
    <Fold title="Coming up">{upcoming.length ? <div className="ad-list">{upcoming.map((e, i) => row(e, i, true))}</div> : <Empty>Nothing coming up. Tap Add to put an event or a rent-out here.</Empty>}</Fold>
  </>);
}

/** Opens an event or a rent-out to read first (Edit is one tap away). */
export function PlanView({ kind, item, onEdit, onClose }) {
  if (kind === 'event') return (<ViewModal title={item.title} onEdit={onEdit} onClose={onClose}
    rows={[['Date', item.end_date && item.end_date > item.on_date ? `${fmtD(item.on_date)} to ${fmtD(item.end_date)}` : fmtD(item.on_date)], ['Time', item.time_text], ['Note', item.note]]} />);
  const pays = rentPayments(item); const paid = paidOf(item); const left = Math.max(0, (item.amount_paise || 0) - paid);
  return (<ViewModal title={`Rent-out · ${item.name}`} onEdit={onEdit} onClose={onClose}
    rows={[['Hired by', item.name], ['Phone', item.phone], ['Email', item.email], ['For', item.purpose], ['Date', item.end_date && item.end_date > item.on_date ? `${fmtD(item.on_date)} to ${fmtD(item.end_date)}` : fmtD(item.on_date)], ['Time', item.time_text],
      ['Amount', item.amount_paise ? money(item.amount_paise) : ''], ['Paid so far', item.amount_paise ? `${money(paid)}${left ? ` · ${money(left)} still to pay` : ' · fully paid'}` : ''], ['Note', item.note]]}>
    {pays.length > 0 && <div className="ad-list" style={{ marginBottom: 12 }}>{pays.map((p) => <div key={p.id} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{money(p.amount_paise)}</b><Segs items={[fmtD(p.paid_on), methodLabel(p.method), p.note]} /></div></div>)}</div>}
  </ViewModal>);
}

/** Add or change an event or a rent-out in one form. When adding, a switch at the top chooses which. */
export function PlanForm({ kind: startKind, item = {}, onClose, onSaved }) {
  const isNew = !item.id; const [kind, setKind] = useState(startKind || 'event'); const [run, busy] = useAction(); const [check, clashDialog] = useClash(); const rent = kind === 'rentout';
  const f = useForm({ title: item.title || '', name: item.name || '', phone: item.phone || '', email: item.email || '', purpose: item.purpose || '', on: isoToDMY(item.on_date), end: isoToDMY(item.end_date), time: item.time_text || '', amount: item.amount_paise ? String(item.amount_paise / 100) : '', note: item.note || '',
    pAmount: '', pOn: isoToDMY(todayISO()), pMethod: 'upi', pNote: '' });
  const [pays, setPays] = useState(() => (startKind === 'rentout' ? rentPayments(item).map((p) => ({ id: p.id, amount_paise: p.amount_paise, paid_on: p.paid_on, method: p.method || 'other', note: p.note || '' })) : []));
  const amount = rupeesToPaise(f.v.amount); const paidSum = pays.reduce((t, p) => t + p.amount_paise, 0);
  const addPay = () => {
    const a = rupeesToPaise(f.v.pAmount); const on = dmyToISO(f.v.pOn); if (a <= 0) return run(async () => { throw new Error('Please enter the amount received.'); }); if (!on) return run(async () => { throw new Error('Please enter the payment date as DD/MM/YYYY.'); });
    if (amount > 0 && paidSum + a > amount) return run(async () => { throw new Error(`That is more than the ${money(amount - paidSum)} still to pay.`); });
    setPays((l) => [...l, { id: crypto.randomUUID(), amount_paise: a, paid_on: on, method: f.v.pMethod, note: f.v.pNote.trim() }]); f.setAll((v) => ({ ...v, pAmount: '', pNote: '' }));
  };
  const save = (ev) => { ev.preventDefault(); return run(async () => {
    const v = f.v; const on = dmyToISO(v.on); if (!on) throw new Error('Please enter the date as DD/MM/YYYY.'); const end = v.end ? dmyToISO(v.end) : null; if (v.end && (!end || end < on)) throw new Error('The end date must be on or after the start date.');
    if (!rent) {
      const row = { title: v.title.trim(), on_date: on, end_date: end, time_text: v.time || null, note: v.note || null }; if (!row.title) throw new Error('Please add a title.');
      const slot = parseSlot(row.time_text); if (slot && !(await check(span(on, end || on, 60).map((d) => ({ date: d, slot, label: `Event: ${row.title}` })), { kind: 'event', id: item.id }))) return;
      must(isNew ? await sb().from('events').insert(row) : await sb().from('events').update(row).eq('id', item.id)); onSaved(); return;
    }
    if (!v.name.trim()) throw new Error('Please add who is hiring the studio.');
    if (paidSum > 0 && amount < paidSum) throw new Error(`The amount must be at least ${money(paidSum)}, the amount already paid.`);
    const slot = parseSlot(v.time) || { start: 0, end: 1440 };               // no time given: the whole day is taken
    if (!(await check(span(on, end || on, 60).map((d) => ({ date: d, slot, label: `Rent-out: ${v.name.trim()}` })), { kind: 'rentout', id: item.id }))) return;
    const last = pays[pays.length - 1];
    const row = { name: v.name.trim(), phone: v.phone || null, email: v.email || null, purpose: v.purpose || null, on_date: on, end_date: end, time_text: v.time || null, amount_paise: amount, paid: amount > 0 && paidSum >= amount, paid_on: last?.paid_on || null, method: last?.method || null, note: v.note || null };
    const saved = isNew ? must(await sb().from('rentouts').insert(row).select().single()) : (must(await sb().from('rentouts').update(row).eq('id', item.id)), { id: item.id });
    const oldIds = rentPayments(item).map((p) => p.id);
    await sb().from('ledger_entries').delete().eq('source', 'rentout').in('source_id', [saved.id, ...oldIds]);                 // the income entries always match the payments as saved
    must(await sb().from('rentout_payments').delete().eq('rentout_id', saved.id));
    if (pays.length) {
      must(await sb().from('rentout_payments').insert(pays.map((p) => ({ id: p.id, rentout_id: saved.id, amount_paise: p.amount_paise, paid_on: p.paid_on, method: p.method, note: p.note || null }))));
      must(await sb().from('ledger_entries').insert(pays.map((p) => ({ entry_date: p.paid_on, kind: 'in', category: 'Studio rent-outs', description: `Rent-out: ${row.purpose || 'studio'}${pays.length > 1 ? ' (part payment)' : ''}`, amount_paise: p.amount_paise, gst_paise: 0, method: p.method, party: row.name, source: 'rentout', source_id: p.id }))));
    }
    onSaved(); }, 'Saved'); };
  const del = () => run(async () => {
    const ids = rent ? [item.id, ...rentPayments(item).map((p) => p.id)] : [];
    if (rent) { await sb().from('ledger_entries').delete().eq('source', 'rentout').in('source_id', ids); must(await sb().from('rentouts').delete().eq('id', item.id)); } else must(await sb().from('events').delete().eq('id', item.id));
    onSaved(); }, 'Deleted');
  return (<Modal title={isNew ? 'Add to the planner' : rent ? 'Edit rent-out' : 'Edit event'} onClose={onClose}><form className="ad-form" onSubmit={save}>
    {isNew && <div className="full"><div className="ad-tabsbar" style={{ margin: 0 }}>{[['event', 'Event'], ['rentout', 'Rent-out']].map(([k, t]) => <button type="button" key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{t}</button>)}</div></div>}
    {rent ? <><F form={f} k="name" label="Hired by" rule="name" required /><F form={f} k="phone" label="Phone" type="tel" rule="phone" />
      <F form={f} k="email" label="Email" type="email" rule="email" /><F form={f} k="purpose" label="For" rule="sentence" placeholder="e.g. Photo shoot" /></>
      : <div className="full"><F form={f} k="title" label="What is it?" rule="sentence" required placeholder="e.g. Meeting with the printer" /></div>}
    <F form={f} k="on" label="Date" type="date" required /><F form={f} k="end" label="Until" type="date" hint={rent ? 'Only for several days' : 'Only for events over several days'} />
    <F form={f} k="time" label="Time" rule="text" placeholder={rent ? 'e.g. 10 am to 2 pm' : 'e.g. 3 pm'} hint={rent ? 'Leave empty if it takes the whole day' : undefined} />
    {rent && <F form={f} k="amount" label="Amount (₹)" type="money" rule="money" />}
    {rent && <div className="full"><p className="ad-section-t">Payments</p>
      {pays.length > 0 && <div className="ad-list" style={{ marginTop: 8 }}>{pays.map((p) => <div key={p.id} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{money(p.amount_paise)}</b><Segs items={[fmtD(p.paid_on), methodLabel(p.method), p.note]} /></div><button type="button" className="ad-x" aria-label="Remove payment" onClick={() => setPays((l) => l.filter((x) => x.id !== p.id))}>✕</button></div>)}</div>}
      {amount > 0 && <p className="ad-help" style={{ margin: '8px 0 0' }}>Paid {money(paidSum)} of {money(amount)} · {amount > paidSum ? `${money(amount - paidSum)} still to pay` : 'fully paid'}</p>}</div>}
    {rent && (amount === 0 || paidSum < amount) && <div className="full"><div className="ad-form pay-add"><F form={f} k="pAmount" label="Add a payment (₹)" type="money" rule="money" /><F form={f} k="pOn" label="Received on" type="date" /><F form={f} k="pMethod" label="Paid by" type="select" options={METHOD_OPTIONS} /><F form={f} k="pNote" label="Note" rule="sentence" placeholder="e.g. Advance" />
      <div className="ad-actions"><Btn type="button" variant="ghost" icon="plus" onClick={addPay}>Add payment</Btn></div></div></div>}
    <div className="full"><F form={f} k="note" label="Note" type="textarea" rule="sentence" rows={2} /></div>
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Confirm onYes={del}>Delete</Confirm>}</div></form>{clashDialog}</Modal>);
}
