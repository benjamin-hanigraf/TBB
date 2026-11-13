'use client';
import Icon from '@/components/Icons';
// One-on-one classes: each student has their own class dates (any day, any time). A class is either attended or not yet; a student cannot "miss" one.
import { useState } from 'react';
import { Segs, useLoad, sb, must, Modal, Btn, F, useForm, useAction, Confirm, Badge, Empty, Spin, Err, dmyToISO, isoToDMY } from './kit';
import { fmtDay } from '@/lib/dates';
import { todayISO } from '@/lib/accounting';
import { parseSlot } from '@/lib/clash';
import { useClash } from './Clash';

/** Puts a student's classes in date order and numbers them 1, 2, 3... (two steps, because two classes cannot hold the same number at the same moment). */
export async function renumber(enrolmentId) {
  const s = must(await sb().from('class_sessions').select('id,no,on_date').eq('enrolment_id', enrolmentId).order('on_date').order('no'));
  const changed = s.map((x, i) => ({ id: x.id, from: x.no, to: i + 1 })).filter((x) => x.from !== x.to); if (!changed.length) return;
  for (const c of changed) must(await sb().from('class_sessions').update({ no: -c.to }).eq('id', c.id));
  for (const c of changed) must(await sb().from('class_sessions').update({ no: c.to }).eq('id', c.id));
}
const waLink = (phone, text) => { const d = String(phone || '').replace(/\D/g, '').slice(-10); return d.length === 10 ? `https://wa.me/91${d}?text=${encodeURIComponent(text)}` : null; };

/** e: the enrolment (the student). level: their class level. */
export function OneOnOneModal({ e, level, onClose, onChanged }) {
  const [run, busy] = useAction(); const [move, setMove] = useState(null); const [check, clashDialog] = useClash();
  const { data, error, reload } = useLoad(async () => must(await sb().from('class_sessions').select('*').eq('enrolment_id', e.id).order('on_date').order('no')), [e.id]);
  const lastTime = data?.filter((x) => x.time_text).slice(-1)[0]?.time_text || '';
  const f = useForm({ date: '', time: '' });
  const changed = () => { reload(); onChanged?.(); };
  if (error) return <Modal title={e.student_name} onClose={onClose}><Err e={error} /></Modal>;
  if (!data) return <Modal title={e.student_name} onClose={onClose}><Spin /></Modal>;
  const today = todayISO(); const live = data.filter((s) => s.status !== 'cancelled'); const total = level.sessions || 8; const done = data.filter((s) => s.status === 'done').length; const toSchedule = Math.max(0, total - live.length);

  const add = (ev) => { ev.preventDefault(); return run(async () => {
    const d = dmyToISO(f.v.date); if (!d) throw new Error('Please enter the date as DD/MM/YYYY.'); const time = (f.v.time || lastTime).trim() || null;
    if (!(await check([{ date: d, slot: parseSlot(time), label: `Class: ${e.student_name}` }]))) return;
    if (live.length >= total) throw new Error(`All ${total} classes are already scheduled. Cancel one first, or raise the number of classes for this level.`);
    const top = data.reduce((m, s) => Math.max(m, s.no), 0);
    must(await sb().from('class_sessions').insert({ enrolment_id: e.id, no: top + 1, on_date: d, time_text: time }));
    await renumber(e.id); f.reset({ date: '', time }); changed(); }, 'Class added'); };
  const setStatus = (s, status) => run(async () => {
    if (status === 'done' && s.on_date > todayISO()) throw new Error('This class is on a later date. You can mark it as attended once it has happened.');
    if (status === 'scheduled' && s.status === 'cancelled' && live.length >= total) throw new Error(`All ${total} classes are already scheduled. Cancel or delete another one first.`); must(await sb().from('class_sessions').update({ status }).eq('id', s.id)); changed(); }, status === 'done' ? 'Marked as attended' : status === 'cancelled' ? 'Class cancelled' : 'Changed back');
  const remove = (s) => run(async () => { must(await sb().from('class_sessions').delete().eq('id', s.id)); await renumber(e.id); changed(); }, 'Class deleted');
  const upcoming = live.filter((s) => s.on_date >= today && s.status === 'scheduled');
  const wa = upcoming.length ? waLink(e.phone, `Hi ${String(e.name || '').split(' ')[0]}, here are ${e.student_name === e.name ? 'your' : `${e.student_name}'s`} upcoming ${level.title} classes:\n${upcoming.map((s) => `• ${fmtDay(s.on_date)}${s.time_text ? `, ${s.time_text}` : ''}`).join('\n')}\n\nThin Black Brush`) : null;

  return (<Modal title={`${e.student_name} · classes`} onClose={onClose} wide>
    <p className="ad-help" style={{ marginTop: 0 }}>{level.title} ({level.level}) · attended <b>{done}</b> · {live.length} of {total} classes scheduled{toSchedule ? ` · ${toSchedule} still to schedule` : ''}</p>
    {data.length ? <div className="ad-list">{data.map((s) => { const past = s.on_date < today;
      return (<div key={s.id} className="ad-row sess-row" style={{ cursor: 'default' }}>
        <div className="sess-head"><div className="main"><b><span style={{ whiteSpace: 'nowrap' }}>Class {s.no} ·</span> <span style={{ whiteSpace: 'nowrap' }}>{fmtDay(s.on_date)}{s.time_text ? ' ·' : ''}</span>{s.time_text ? <> <span style={{ whiteSpace: 'nowrap' }}>{s.time_text}</span></> : ''}</b>
          <Segs items={[s.moved_from ? `Moved from ${fmtDay(s.moved_from)}` : s.status === 'scheduled' && past ? 'Not marked yet' : s.on_date === today && s.status === 'scheduled' ? 'Today' : '', s.note]} /></div>
          <Badge tone={s.status === 'cancelled' ? 'bad' : s.status === 'done' ? 'ok' : ''}>{s.status === 'cancelled' ? 'Cancelled' : s.status === 'done' ? 'Attended' : 'Scheduled'}</Badge></div>
        <div className="sess-actions">
          {s.status === 'scheduled' && <><Btn variant="ghost" busy={busy} onClick={() => setStatus(s, 'done')}>Attended</Btn><Btn variant="ghost" onClick={() => setMove(s)}>Reschedule</Btn><Confirm onYes={() => setStatus(s, 'cancelled')}>Cancel</Confirm></>}
          {s.status === 'done' && <Btn variant="ghost" busy={busy} onClick={() => setStatus(s, 'scheduled')}>Undo</Btn>}
          {s.status === 'cancelled' && <><Btn variant="ghost" busy={busy} onClick={() => setStatus(s, 'scheduled')}>Restore</Btn><Confirm onYes={() => remove(s)}>Delete</Confirm></>}</div></div>); })}</div>
      : <Empty>No classes scheduled yet. Add the first date below.</Empty>}
    <form className="ad-form" style={{ marginTop: 14 }} onSubmit={add}>
      <F form={f} k="date" label="Add a class on" type="date" required /><F form={f} k="time" label="Time" rule="text" placeholder={lastTime || 'e.g. 4:30 pm'} hint={lastTime ? 'Leave empty to use the same time as last time' : undefined} />
      <div className="row-actions full"><Btn busy={busy} icon="plus">Add</Btn>{wa && <a className="ad-btn ghost" href={wa} target="_blank" rel="noopener"><Icon n="whatsapp" size={16} /><span>Send dates on WhatsApp</span></a>}</div></form>
    {move && <MoveOne s={move} student={e.student_name} check={check} onClose={() => setMove(null)} onSaved={async () => { setMove(null); await renumber(e.id); changed(); }} />}
    {clashDialog}
  </Modal>);
}

function MoveOne({ s, student, check, onClose, onSaved }) {
  const [run, busy] = useAction(); const f = useForm({ date: isoToDMY(s.on_date), time: s.time_text || '' });
  const save = () => run(async () => { const d = dmyToISO(f.v.date); if (!d) throw new Error('Please enter the new date as DD/MM/YYYY.'); const time = f.v.time.trim() || null;
    if (!(await check([{ date: d, slot: parseSlot(time), label: `Class: ${student}` }], { kind: 'class', id: s.id }))) return;
    must(await sb().from('class_sessions').update({ on_date: d, time_text: time, ...(d !== s.on_date ? { moved_from: s.moved_from || s.on_date } : {}) }).eq('id', s.id)); await onSaved(); }, 'Class rescheduled');
  return (<Modal title={`Reschedule class ${s.no}`} onClose={onClose}><p className="ad-help" style={{ marginTop: 0 }}>Now on <b>{fmtDay(s.on_date)}{s.time_text ? `, ${s.time_text}` : ''}</b>. The student is not told automatically.</p>
    <div className="ad-form"><F form={f} k="date" label="New date" type="date" required /><F form={f} k="time" label="Time" rule="text" /></div>
    <div className="row-actions" style={{ marginTop: 16 }}><Btn busy={busy} icon="clock" onClick={save}>Reschedule</Btn><Btn variant="ghost" onClick={onClose}>Cancel</Btn></div></Modal>);
}
