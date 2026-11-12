'use client';
// One-on-one classes: each student has their own class dates (any day, any time), and attendance is marked class by class.
// Behind the scenes the student gets a private "solo" batch, so these classes also show in the Calendar, on Home and in reminders.
import { useState } from 'react';
import { useLoad, sb, must, Modal, Btn, F, useForm, useAction, Confirm, Badge, Empty, Spin, Err, dmyToISO, isoToDMY } from './kit';
import { fmtDay } from '@/lib/batches';
import { todayISO } from '@/lib/accounting';

/** Puts the classes in date order and numbers them 1, 2, 3... (two steps, because two classes cannot share a number at the same moment). */
export async function renumber(batchId) {
  const s = must(await sb().from('class_sessions').select('id,no,on_date').eq('batch_id', batchId).order('on_date').order('no'));
  const changed = s.map((x, i) => ({ id: x.id, from: x.no, to: i + 1 })).filter((x) => x.from !== x.to); if (!changed.length) return;
  for (const c of changed) must(await sb().from('class_sessions').update({ no: -c.to }).eq('id', c.id));
  for (const c of changed) must(await sb().from('class_sessions').update({ no: c.to }).eq('id', c.id));
}
const waLink = (phone, text) => { const d = String(phone || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? `https://wa.me/91${d}?text=${encodeURIComponent(text)}` : null; };

/** e: the enrolment (student). level: their class level. */
export function OneOnOneModal({ e, level, onClose, onChanged }) {
  const [run, busy] = useAction(); const [move, setMove] = useState(null);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const en = must(await c.from('class_enrolments').select('id,batch_id,student_name,name,phone,status').eq('id', e.id).single());
    if (!en.batch_id) return { en, batch: null, sessions: [], att: [] };
    const batch = must(await c.from('class_batches').select('*').eq('id', en.batch_id).single());
    const sessions = must(await c.from('class_sessions').select('*').eq('batch_id', batch.id).order('on_date').order('no'));
    const att = sessions.length ? must(await c.from('class_attendance').select('*').eq('enrolment_id', en.id).in('session_id', sessions.map((x) => x.id))) : [];
    return { en, batch, sessions, att };
  }, [e.id]);
  const lastTime = data?.sessions.filter((x) => x.time_text).slice(-1)[0]?.time_text || '';
  const f = useForm({ date: '', time: '' });
  const changed = () => { reload(); onChanged?.(); };
  if (error) return <Modal title={e.student_name} onClose={onClose}><Err e={error} /></Modal>;
  if (!data) return <Modal title={e.student_name} onClose={onClose}><Spin /></Modal>;
  const { en, batch, sessions, att } = data; const today = todayISO();
  if (batch && !batch.solo) return (<Modal title={e.student_name} onClose={onClose}><p style={{ marginTop: 0 }}>{e.student_name} is in the group batch <b>{batch.name || 'without a name'}</b>. Manage their classes from Batches.</p><div className="ad-actions full"><Btn onClick={onClose}>Close</Btn></div></Modal>);

  const live = sessions.filter((s) => s.status !== 'cancelled'); const total = level.sessions || live.length; const toSchedule = Math.max(0, total - live.length);
  const present = (s) => att.find((a) => a.session_id === s.id);
  const attended = sessions.filter((s) => s.status === 'done' && present(s)?.present).length; const held = sessions.filter((s) => s.status === 'done').length;

  const add = (ev) => { ev.preventDefault(); return run(async () => {
    const d = dmyToISO(f.v.date); if (!d) throw new Error('Please enter the date as DD/MM/YYYY.'); const time = (f.v.time || lastTime).trim() || null;
    let b = batch;
    if (!b) {             // first class: make this student's private schedule
      b = must(await sb().from('class_batches').insert({ class_id: level.id, name: en.student_name, starts_on: d, days: [], sessions: Math.min(200, Math.max(1, total)), capacity: 1, solo: true, active: true }).select().single());
      must(await sb().from('class_enrolments').update({ batch_id: b.id }).eq('id', en.id));
    }
    const top = sessions.reduce((m, s) => Math.max(m, s.no), 0);
    must(await sb().from('class_sessions').insert({ batch_id: b.id, no: top + 1, on_date: d, time_text: time }));
    await renumber(b.id); f.reset({ date: '', time }); changed(); }, 'Class added'); };
  const mark = (s, isPresent) => run(async () => {
    must(await sb().from('class_attendance').upsert({ session_id: s.id, enrolment_id: en.id, present: isPresent }, { onConflict: 'session_id,enrolment_id' }));
    must(await sb().from('class_sessions').update({ status: 'done' }).eq('id', s.id)); changed(); }, isPresent ? 'Marked attended' : 'Marked missed');
  const undo = (s) => run(async () => { must(await sb().from('class_attendance').delete().eq('session_id', s.id).eq('enrolment_id', en.id)); must(await sb().from('class_sessions').update({ status: 'scheduled' }).eq('id', s.id)); changed(); }, 'Changed back');
  const setStatus = (s, status) => run(async () => { must(await sb().from('class_sessions').update({ status }).eq('id', s.id)); changed(); }, status === 'cancelled' ? 'Class cancelled' : 'Class restored');
  const remove = (s) => run(async () => { must(await sb().from('class_sessions').delete().eq('id', s.id)); await renumber(batch.id); changed(); }, 'Class removed');
  const upcoming = live.filter((s) => s.on_date >= today && s.status === 'scheduled');
  const wa = upcoming.length ? waLink(en.phone, `Hi ${String(en.name || '').split(' ')[0]}, here are ${en.student_name === en.name ? 'your' : `${en.student_name}'s`} upcoming ${level.title} classes:\n${upcoming.map((s) => `• ${fmtDay(s.on_date)}${s.time_text ? `, ${s.time_text}` : ''}`).join('\n')}\n\nThin Black Brush`) : null;

  return (<Modal title={`${en.student_name} · classes`} onClose={onClose} wide>
    <p className="ad-help" style={{ marginTop: 0 }}>{level.title}, {level.level} · attended <b>{attended}</b> of {held} held · {live.length} of {total} classes scheduled{toSchedule ? ` · ${toSchedule} still to schedule` : ''}</p>
    {sessions.length ? <div className="ad-list">{sessions.map((s) => { const a = present(s); const past = s.on_date < today;
      return (<div key={s.id} className="ad-row" style={{ cursor: 'default', alignItems: 'flex-start' }}><div className="main"><b>Class {s.no} · {fmtDay(s.on_date)}{s.time_text ? ` · ${s.time_text}` : ''}</b>
        <small>{s.moved_from ? `Moved from ${fmtDay(s.moved_from)}` : s.status === 'scheduled' && past ? 'Attendance not taken yet' : s.on_date === today ? 'Today' : ''}</small>
        <div className="row-actions">
          {s.status === 'scheduled' && <><Btn variant="ghost" className="ad-btn sm" busy={busy} onClick={() => mark(s, true)}>Attended</Btn><Btn variant="ghost" className="ad-btn ghost sm" busy={busy} onClick={() => mark(s, false)}>Missed</Btn><Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setMove(s)}>Move</Btn><Confirm onYes={() => setStatus(s, 'cancelled')}>Cancel class</Confirm></>}
          {s.status === 'done' && <Btn variant="ghost" className="ad-btn ghost sm" busy={busy} onClick={() => undo(s)}>Undo</Btn>}
          {s.status === 'cancelled' && <><Btn variant="ghost" className="ad-btn ghost sm" busy={busy} onClick={() => setStatus(s, 'scheduled')}>Restore</Btn><Confirm onYes={() => remove(s)}>Delete</Confirm></>}</div></div>
        <div className="end"><Badge tone={s.status === 'cancelled' ? 'bad' : s.status === 'done' ? (a?.present ? 'ok' : 'bad') : ''}>{s.status === 'cancelled' ? 'Cancelled' : s.status === 'done' ? (a?.present ? 'Attended' : 'Missed') : 'Scheduled'}</Badge></div></div>); })}</div>
      : <Empty>No classes scheduled yet. Add the first date below.</Empty>}
    <form className="ad-form" style={{ marginTop: 14 }} onSubmit={add}>
      <F form={f} k="date" label="Add a class on" type="date" required /><F form={f} k="time" label="Time" rule="text" placeholder={lastTime || 'e.g. 4:30 pm'} hint={lastTime ? 'Leave empty to use the same time as last time' : undefined} />
      <div className="ad-actions full"><Btn busy={busy} icon="plus">Add class</Btn>{wa && <a className="ad-btn ghost" href={wa} target="_blank" rel="noopener">Send dates on WhatsApp</a>}</div></form>
    {move && <MoveOne s={move} onClose={() => setMove(null)} onSaved={async () => { setMove(null); await renumber(batch.id); changed(); }} />}
  </Modal>);
}

function MoveOne({ s, onClose, onSaved }) {
  const [run, busy] = useAction(); const f = useForm({ date: isoToDMY(s.on_date), time: s.time_text || '' });
  const save = () => run(async () => { const d = dmyToISO(f.v.date); if (!d) throw new Error('Please enter the new date as DD/MM/YYYY.');
    must(await sb().from('class_sessions').update({ on_date: d, time_text: f.v.time.trim() || null, ...(d !== s.on_date ? { moved_from: s.moved_from || s.on_date } : {}) }).eq('id', s.id)); await onSaved(); }, 'Class moved');
  return (<Modal title={`Move class ${s.no}`} onClose={onClose}><p className="ad-help" style={{ marginTop: 0 }}>Now on <b>{fmtDay(s.on_date)}{s.time_text ? `, ${s.time_text}` : ''}</b>. The student is not told automatically.</p>
    <div className="ad-form"><F form={f} k="date" label="New date" type="date" required /><F form={f} k="time" label="Time" rule="text" /></div>
    <div className="ad-actions full"><Btn busy={busy} icon="check" onClick={save}>Move</Btn><Btn variant="ghost" onClick={onClose}>Cancel</Btn></div></Modal>);
}
