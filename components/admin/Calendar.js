'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icons';
import { useLoad, sb, must, every, Card, Empty, Spin, Err, Badge, Modal, Btn, F, useForm, useAction, Confirm, dmyToISO, isoToDMY } from './kit';
import { todayISO } from '@/lib/accounting';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');
const istDate = (s) => new Date(new Date(s).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const istTime = (s) => new Date(s).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
const addDays = (isoStr, n) => { const d = new Date(`${isoStr}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const KINDS = { workshop: 'Workshop', class: 'Class', todo: 'To-do', event: 'Event' };

/** Turns workshops, class sessions, to-dos and events into one list of {date, title, kind, time, note, href}. */
export function buildEvents({ workshops = [], sessions = [], todos = [], events = [] }) {
  const ev = [];
  for (const w of workshops) {
    if (w.status === 'cancelled') continue; const s = istDate(w.starts_at); const e = w.kind === 'course' && w.ends_at ? istDate(w.ends_at) : s;
    for (let d = s, n = 0; d <= e && n < 120; d = addDays(d, 1), n++) ev.push({ date: d, title: w.title, kind: 'workshop', time: d === s ? istTime(w.starts_at) : '', note: w.venue_name || '', draft: w.status === 'draft', href: '/manager/workshops' });
  }
  for (const s of sessions) { if (s.status === 'cancelled') continue; const b = s.class_batches; const lv = b?.class_levels; const level = `${lv?.title || 'Class'}${lv?.level ? `, ${lv.level}` : ''}`;   // one-on-one classes show the student's name
    ev.push({ date: s.on_date, title: b?.solo ? `${b.name} · ${level}` : level, kind: 'class', time: s.time_text || b?.time_text || '', note: `Class ${s.no}${b?.solo ? '' : ` of ${b?.sessions || '?'}`}${s.status === 'done' ? ' · done' : ''}${s.moved_from ? ' · moved' : ''}`, href: '/manager/classes' }); }
  for (const t of todos) if (t.due_on && !t.done) ev.push({ date: t.due_on, title: t.title, kind: 'todo', time: '', note: t.note || '', href: '#todo' });
  for (const e of events) { const end = e.end_date && e.end_date > e.on_date ? e.end_date : e.on_date; for (let d = e.on_date, n = 0; d <= end && n < 60; d = addDays(d, 1), n++) ev.push({ date: d, title: e.title, kind: 'event', time: d === e.on_date ? e.time_text || '' : '', note: e.note || '', event: e }); }
  return ev.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
}

export default function CalendarPanel({ version = 0 }) {
  const today = todayISO(); const [ym, setYm] = useState(today.slice(0, 7)); const [sel, setSel] = useState(today); const [edit, setEdit] = useState(null);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [w, s, t, e] = await Promise.all([
      every(() => c.from('workshops').select('id,title,kind,starts_at,ends_at,venue_name,status').order('starts_at').order('id')),
      every(() => c.from('class_sessions').select('*,class_batches(*,class_levels(title,level))').order('on_date').order('id')),
      every(() => c.from('todos').select('id,title,note,due_on,done').eq('done', false).not('due_on', 'is', null).order('id')),
      every(() => c.from('events').select('*').order('on_date').order('id'))]);
    // Show whatever loaded. A missing table (database update not run yet) should not blank the whole calendar.
    const missing = []; const ok = (r, name) => { if (!r.error) return r.data || []; missing.push(name); console.error('calendar', name, r.error); return []; };
    return { workshops: ok(w, 'workshops'), sessions: ok(s, 'class sessions'), todos: ok(t, 'to-dos'), events: ok(e, 'events'), missing };
  }, [version]);
  const events = useMemo(() => (data ? buildEvents(data) : []), [data]);
  const by = useMemo(() => { const m = {}; events.forEach((e) => (m[e.date] ||= []).push(e)); return m; }, [events]);
  if (error) return <Err e={error} />; if (!data) return <Spin />;
  const [y, m] = ym.split('-').map(Number); const lead = new Date(y, m - 1, 1).getDay(); const count = new Date(y, m, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => `${ym}-${pad(i + 1)}`)]; while (cells.length % 7) cells.push(null);
  const go = (n) => { const d = new Date(y, m - 1 + n, 1); setYm(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); };
  const upcoming = events.filter((e) => e.date >= today).slice(0, 10); const dayList = by[sel] || [];
  const row = (e, i, showDate) => { const inner = (<><div className="main"><b>{e.title}</b><small>{[showDate && new Date(`${e.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), e.time, e.note].filter(Boolean).join(' · ') || KINDS[e.kind]}</small></div><div className="end">{e.draft && <Badge>Draft</Badge>}<span className={`kindtag ${e.kind}`}>{KINDS[e.kind]}</span></div></>);
    return e.event ? <button key={i} className="ad-row" onClick={() => setEdit(e.event)}>{inner}</button> : <Link key={i} href={e.href} className="ad-row">{inner}</Link>; };
  return (<>
    {data.missing?.length > 0 && <p className="ad-err" role="alert">Could not load {data.missing.join(', ')}. If this keeps happening, supabase/database.sql may not have been run yet.</p>}
    <Card>
      <div className="cal-head"><button className="ad-x" aria-label="Previous month" onClick={() => go(-1)}><Icon n="left" size={18} /></button><h2>{MONTHS[m - 1]} {y}</h2><button className="ad-x" aria-label="Next month" onClick={() => go(1)}><Icon n="right" size={18} /></button>
        <button className="ad-btn ghost sm" onClick={() => { setYm(today.slice(0, 7)); setSel(today); }}>Today</button><button className="ad-btn sm" onClick={() => setEdit({ on_date: sel })}><Icon n="plus" size={14} /><span>Event</span></button></div>
      <div className="cal-grid" role="grid" aria-label={`${MONTHS[m - 1]} ${y}`}>
        {DAYS.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => d ? (<button key={d} type="button" className={`cal-day ${d === today ? 'today' : ''} ${d === sel ? 'sel' : ''}`} onClick={() => setSel(d)} aria-label={`${+d.slice(8)} ${MONTHS[m - 1]}${by[d] ? `, ${by[d].length} item${by[d].length > 1 ? 's' : ''}` : ''}`}>
          <b>{+d.slice(8)}</b>
          <span className="cal-chips">{(by[d] || []).slice(0, 2).map((e, k) => <i key={k} className={`chip ${e.kind} ${e.draft ? 'draft' : ''}`}><em>{e.title}</em></i>)}{(by[d] || []).length > 2 && <i className="more">+{by[d].length - 2}</i>}</span>
          <span className="cal-dots">{(by[d] || []).slice(0, 4).map((e, k) => <i key={k} className={e.kind} />)}</span></button>) : <div key={`e${i}`} className="cal-empty" />)}
      </div>
      <p className="cal-key"><span><i className="dotk workshop" /> Workshops</span><span><i className="dotk class" /> Classes</span><span><i className="dotk todo" /> To-do</span><span><i className="dotk event" /> Events</span></p>
    </Card>
    <Card title={new Date(`${sel}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} action={<button className="ad-btn ghost sm" onClick={() => setEdit({ on_date: sel })}>Add event</button>}>
      {dayList.length ? <div className="ad-list">{dayList.map((e, i) => row(e, i, false))}</div> : <Empty>Nothing scheduled.</Empty>}</Card>
    <Card title="Coming up">{upcoming.length ? <div className="ad-list">{upcoming.map((e, i) => row(e, i, true))}</div> : <Empty>Nothing coming up. Add an event, a class batch or a workshop.</Empty>}</Card>
    {edit && <EventForm e={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
  </>);
}

function EventForm({ e, onClose, onSaved }) {
  const isNew = !e.id; const [run, busy] = useAction();
  const f = useForm({ title: e.title || '', on: isoToDMY(e.on_date), end: isoToDMY(e.end_date), time: e.time_text || '', note: e.note || '' });
  const save = (ev) => { ev.preventDefault(); return run(async () => {
    const on = dmyToISO(f.v.on); if (!on) throw new Error('Please enter the date as DD/MM/YYYY.'); const end = f.v.end ? dmyToISO(f.v.end) : null; if (f.v.end && (!end || end < on)) throw new Error('The end date must be on or after the start date.');
    const row = { title: f.v.title.trim(), on_date: on, end_date: end, time_text: f.v.time || null, note: f.v.note || null }; if (!row.title) throw new Error('Please add a title.');
    must(isNew ? await sb().from('events').insert(row) : await sb().from('events').update(row).eq('id', e.id)); onSaved(); }, 'Saved'); };
  const del = () => run(async () => { must(await sb().from('events').delete().eq('id', e.id)); onSaved(); }, 'Deleted');
  return (<Modal title={isNew ? 'Add event' : 'Edit event'} onClose={onClose}><form className="ad-form" onSubmit={save}>
    <div className="full"><F form={f} k="title" label="What is it?" rule="sentence" required placeholder="e.g. Meeting with the printer" /></div>
    <F form={f} k="on" label="Date" type="date" required /><F form={f} k="end" label="Until" type="date" hint="Only for events over several days" />
    <F form={f} k="time" label="Time" rule="text" placeholder="e.g. 3 pm" /><div className="full"><F form={f} k="note" label="Note" type="textarea" rule="sentence" rows={3} /></div>
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Confirm onYes={del}>Delete</Confirm>}</div></form></Modal>);
}
