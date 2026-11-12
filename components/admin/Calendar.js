'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icons';
import { useLoad, sb, must, every, Card, Fold, Empty, Spin, Err, Badge, Modal, Btn, F, useForm, useAction, Confirm, dmyToISO, isoToDMY } from './kit';
import { todayISO, rupeesToPaise, money } from '@/lib/accounting';
import { addDays } from '@/lib/dates';
import { parseSlot } from '@/lib/clash';
import { useClash } from './Clash';
import { METHOD_OPTIONS } from './ManualEntry';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');
const istDate = (s) => new Date(new Date(s).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const istTime = (s) => new Date(s).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
const KINDS = { workshop: 'Workshop', class: 'Class', todo: 'To-do', event: 'Event', rentout: 'Rent-out' };
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

export default function CalendarPanel({ version = 0 }) {
  const today = todayISO(); const [ym, setYm] = useState(today.slice(0, 7)); const [sel, setSel] = useState(today); const [edit, setEdit] = useState(null); const [rent, setRent] = useState(null);
  const [pick, setPick] = useState(null); const [yearStart, setYearStart] = useState(null);                    // pick: null, 'month' or 'year'
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [w, s, t, e, r] = await Promise.all([
      every(() => c.from('workshops').select('id,title,kind,starts_at,ends_at,venue_name,status').order('starts_at').order('id')),
      every(() => c.from('class_sessions').select('*,class_enrolments(student_name,class_levels(title,level))').order('on_date').order('id')),
      every(() => c.from('todos').select('id,title,note,due_on,done').eq('done', false).not('due_on', 'is', null).order('id')),
      every(() => c.from('events').select('*').order('on_date').order('id')),
      every(() => c.from('rentouts').select('*').order('on_date').order('id'))]);
    // Show whatever loaded. A missing table (database not updated yet) should not blank the whole calendar.
    const missing = []; const ok = (x, name) => { if (!x.error) return x.data || []; missing.push(name); console.error('calendar', name, x.error); return []; };
    return { workshops: ok(w, 'workshops'), sessions: ok(s, 'classes'), todos: ok(t, 'to-dos'), events: ok(e, 'events'), rentouts: ok(r, 'rent-outs'), missing };
  }, [version]);
  const events = useMemo(() => (data ? buildEvents(data) : []), [data]);
  const by = useMemo(() => { const m = {}; events.forEach((e) => (m[e.date] ||= []).push(e)); return m; }, [events]);
  if (error) return <Err e={error} />; if (!data) return <Spin />;
  const [y, m] = ym.split('-').map(Number); const lead = new Date(y, m - 1, 1).getDay(); const count = new Date(y, m, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => `${ym}-${pad(i + 1)}`)]; while (cells.length % 7) cells.push(null);
  const go = (n) => { const d = new Date(y, m - 1 + n, 1); setYm(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); };
  const upcoming = events.filter((e) => e.date >= today).slice(0, 10); const dayList = by[sel] || [];
  const y0 = yearStart ?? y - (y % 12);                         // the year picker shows 12 years at a time
  const row = (e, i, showDate) => { const inner = (<><div className="main"><b>{e.title}</b><small>{[showDate && new Date(`${e.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), e.time, e.note].filter(Boolean).join(' · ') || KINDS[e.kind]}</small></div><div className="end">{e.draft && <Badge>Draft</Badge>}<span className={`kindtag ${e.kind}`}>{KINDS[e.kind]}</span></div></>);
    return e.event ? <button key={i} className="ad-row" onClick={() => setEdit(e.event)}>{inner}</button> : e.rentout ? <button key={i} className="ad-row" onClick={() => setRent(e.rentout)}>{inner}</button> : <Link key={i} href={e.href} className="ad-row">{inner}</Link>; };
  return (<>
    {data.missing?.length > 0 && <p className="ad-err" role="alert">Could not load {data.missing.join(', ')}. If this keeps happening, supabase/database.sql may not have been run yet.</p>}
    <Card>
      <div className="cal-head"><button className="ad-x" aria-label="Previous month" onClick={() => go(-1)}><Icon n="left" size={18} /></button>
        <div className="cal-mid"><button type="button" className="cal-title" aria-expanded={pick === 'month'} onClick={() => setPick(pick === 'month' ? null : 'month')}>{MONTHS[m - 1]}<Icon n="chevdown" size={14} /></button>
          <button type="button" className="cal-title" aria-expanded={pick === 'year'} onClick={() => { setYearStart(y - (y % 12)); setPick(pick === 'year' ? null : 'year'); }}>{y}<Icon n="chevdown" size={14} /></button></div>
        <button className="ad-x" aria-label="Next month" onClick={() => go(1)}><Icon n="right" size={18} /></button></div>
      {pick && <div className="cal-pickwrap">
        {pick === 'year' && <div className="cal-pickhead"><button className="ad-x" aria-label="Earlier years" onClick={() => setYearStart(y0 - 12)}><Icon n="left" size={16} /></button><span>{y0} to {y0 + 11}</span><button className="ad-x" aria-label="Later years" onClick={() => setYearStart(y0 + 12)}><Icon n="right" size={16} /></button></div>}
        <div className="cal-pick" role="listbox" aria-label={pick === 'year' ? 'Choose a year' : 'Choose a month'}>
          {pick === 'month' ? MONTHS.map((n, i) => <button key={n} type="button" role="option" aria-selected={i + 1 === m} className={i + 1 === m ? 'on' : ''} onClick={() => { setYm(`${y}-${pad(i + 1)}`); setPick(null); }}>{n.slice(0, 3)}</button>)
            : Array.from({ length: 12 }, (_, i) => y0 + i).map((yr) => <button key={yr} type="button" role="option" aria-selected={yr === y} className={yr === y ? 'on' : ''} onClick={() => { setYm(`${yr}-${pad(m)}`); setPick('month'); }}>{yr}</button>)}</div></div>}
      <div className="cal-bar"><button className="ad-btn ghost sm" onClick={() => { setYm(today.slice(0, 7)); setSel(today); setPick(null); }}>Today</button><button className="ad-btn ghost sm" onClick={() => setEdit({ on_date: sel })}><Icon n="plus" size={14} /><span>Event</span></button><button className="ad-btn sm" onClick={() => setRent({ on_date: sel })}><Icon n="plus" size={14} /><span>Rent-out</span></button></div>
      <div className="cal-grid" role="grid" aria-label={`${MONTHS[m - 1]} ${y}`}>
        {DAYS.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => d ? (<button key={d} type="button" className={`cal-day ${d === today ? 'today' : ''} ${d === sel ? 'sel' : ''}`} onClick={() => setSel(d)} aria-label={`${+d.slice(8)} ${MONTHS[m - 1]}${by[d] ? `, ${by[d].length} item${by[d].length > 1 ? 's' : ''}` : ''}`}>
          <b>{+d.slice(8)}</b>
          <span className="cal-chips">{(by[d] || []).slice(0, 2).map((e, k) => <i key={k} className={`chip ${e.kind} ${e.draft ? 'draft' : ''}`}><em>{e.title}</em></i>)}{(by[d] || []).length > 2 && <i className="more">+{by[d].length - 2}</i>}</span>
          <span className="cal-dots">{(by[d] || []).slice(0, 4).map((e, k) => <i key={k} className={e.kind} />)}</span></button>) : <div key={`e${i}`} className="cal-empty" />)}
      </div>
      <p className="cal-key"><span><i className="dotk workshop" /> Workshops</span><span><i className="dotk class" /> Classes</span><span><i className="dotk rentout" /> Rent-outs</span><span><i className="dotk todo" /> To-do</span><span><i className="dotk event" /> Events</span></p>
    </Card>
    <Card title={new Date(`${sel}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}>
      {dayList.length ? <div className="ad-list">{dayList.map((e, i) => row(e, i, false))}</div> : <Empty>Nothing scheduled.</Empty>}</Card>
    <Fold title="Coming up">{upcoming.length ? <div className="ad-list">{upcoming.map((e, i) => row(e, i, true))}</div> : <Empty>Nothing coming up. Add an event, a rent-out or a workshop.</Empty>}</Fold>
    {edit && <EventForm e={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    {rent && <RentoutForm r={rent} onClose={() => setRent(null)} onSaved={() => { setRent(null); reload(); }} />}
  </>);
}

function EventForm({ e, onClose, onSaved }) {
  const isNew = !e.id; const [run, busy] = useAction(); const [check, clashDialog] = useClash();
  const f = useForm({ title: e.title || '', on: isoToDMY(e.on_date), end: isoToDMY(e.end_date), time: e.time_text || '', note: e.note || '' });
  const save = (ev) => { ev.preventDefault(); return run(async () => {
    const on = dmyToISO(f.v.on); if (!on) throw new Error('Please enter the date as DD/MM/YYYY.'); const end = f.v.end ? dmyToISO(f.v.end) : null; if (f.v.end && (!end || end < on)) throw new Error('The end date must be on or after the start date.');
    const row = { title: f.v.title.trim(), on_date: on, end_date: end, time_text: f.v.time || null, note: f.v.note || null }; if (!row.title) throw new Error('Please add a title.');
    const slot = parseSlot(row.time_text); if (slot && !(await check(span(on, end || on, 60).map((d) => ({ date: d, slot, label: `Event: ${row.title}` })), { kind: 'event', id: e.id }))) return;
    must(isNew ? await sb().from('events').insert(row) : await sb().from('events').update(row).eq('id', e.id)); onSaved(); }, 'Saved'); };
  const del = () => run(async () => { must(await sb().from('events').delete().eq('id', e.id)); onSaved(); }, 'Deleted');
  return (<Modal title={isNew ? 'Add event' : 'Edit event'} onClose={onClose}><form className="ad-form" onSubmit={save}>
    <div className="full"><F form={f} k="title" label="What is it?" rule="sentence" required placeholder="e.g. Meeting with the printer" /></div>
    <F form={f} k="on" label="Date" type="date" required /><F form={f} k="end" label="Until" type="date" hint="Only for events over several days" />
    <F form={f} k="time" label="Time" rule="text" placeholder="e.g. 3 pm" /><div className="full"><F form={f} k="note" label="Note" type="textarea" rule="sentence" rows={3} /></div>
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Confirm onYes={del}>Delete</Confirm>}</div></form>{clashDialog}</Modal>);
}

/** The studio hired out to someone. A paid rent-out is income in the accounts (under Studio rent-outs). */
function RentoutForm({ r, onClose, onSaved }) {
  const isNew = !r.id; const [run, busy] = useAction(); const [check, clashDialog] = useClash();
  const f = useForm({ name: r.name || '', phone: r.phone || '', email: r.email || '', purpose: r.purpose || '', on: isoToDMY(r.on_date), end: isoToDMY(r.end_date), time: r.time_text || '', amount: r.amount_paise ? String(r.amount_paise / 100) : '',
    paid: !!r.paid, method: r.method || 'upi', paidOn: isoToDMY(r.paid_on || todayISO()), note: r.note || '' });
  const save = (ev) => { ev.preventDefault(); return run(async () => {
    const v = f.v; const on = dmyToISO(v.on); if (!v.name.trim()) throw new Error('Please add who is hiring the studio.'); if (!on) throw new Error('Please enter the date as DD/MM/YYYY.');
    const end = v.end ? dmyToISO(v.end) : null; if (v.end && (!end || end < on)) throw new Error('The end date must be on or after the start date.');
    const amount = rupeesToPaise(v.amount); const paidOn = v.paid ? dmyToISO(v.paidOn) : null; if (v.paid && !paidOn) throw new Error('Please enter the payment date as DD/MM/YYYY.'); if (v.paid && amount <= 0) throw new Error('Please enter the amount that was paid.');
    const slot = parseSlot(v.time) || { start: 0, end: 1440 };               // no time given: the whole day is taken
    if (!(await check(span(on, end || on, 60).map((d) => ({ date: d, slot, label: `Rent-out: ${v.name.trim()}` })), { kind: 'rentout', id: r.id }))) return;
    const row = { name: v.name.trim(), phone: v.phone || null, email: v.email || null, purpose: v.purpose || null, on_date: on, end_date: end, time_text: v.time || null, amount_paise: amount, paid: v.paid, paid_on: paidOn, method: v.paid ? v.method : null, note: v.note || null };
    const saved = isNew ? must(await sb().from('rentouts').insert(row).select().single()) : (must(await sb().from('rentouts').update(row).eq('id', r.id)), { id: r.id });
    await sb().from('ledger_entries').delete().eq('source', 'rentout').eq('source_id', saved.id);                // the income entry always matches the rent-out as saved
    if (v.paid && amount > 0) must(await sb().from('ledger_entries').insert({ entry_date: paidOn, kind: 'in', category: 'Studio rent-outs', description: `Rent-out: ${row.purpose || 'studio'}`, amount_paise: amount, gst_paise: 0, method: v.method, party: row.name, source: 'rentout', source_id: saved.id }));
    onSaved(); }, 'Saved'); };
  const del = () => run(async () => { await sb().from('ledger_entries').delete().eq('source', 'rentout').eq('source_id', r.id); must(await sb().from('rentouts').delete().eq('id', r.id)); onSaved(); }, 'Deleted');
  return (<Modal title={isNew ? 'Add rent-out' : 'Edit rent-out'} onClose={onClose}><form className="ad-form" onSubmit={save}>
    <F form={f} k="name" label="Hired by" rule="name" required /><F form={f} k="phone" label="Phone" type="tel" rule="phone" />
    <F form={f} k="email" label="Email" type="email" rule="email" /><F form={f} k="purpose" label="For" rule="sentence" placeholder="e.g. Photo shoot" />
    <F form={f} k="on" label="Date" type="date" required /><F form={f} k="end" label="Until" type="date" hint="Only for several days" />
    <F form={f} k="time" label="Time" rule="text" placeholder="e.g. 10 am to 2 pm" hint="Leave empty if it takes the whole day" /><F form={f} k="amount" label="Amount (₹)" type="money" rule="money" />
    <div className="full"><F form={f} k="paid" label="Paid" type="check" /></div>
    {f.v.paid && <><F form={f} k="method" label="Paid by" type="select" required options={METHOD_OPTIONS} /><F form={f} k="paidOn" label="Paid on" type="date" required /></>}
    <div className="full"><F form={f} k="note" label="Note" type="textarea" rule="sentence" rows={2} /></div>
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Confirm onYes={del}>Delete</Confirm>}</div></form>{clashDialog}</Modal>);
}
