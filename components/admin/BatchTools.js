'use client';
import { useState } from 'react';
import { sb, must, useLoad, Modal, Btn, F, useForm, useAction, useToast, Empty, Err, Spin, Badge, Confirm, fmtD, dmyToISO, isoToDMY } from './kit';
import { MessageModal } from './WorkshopTools';
import { classDates, moveClass, progress, dayList, fmtDay, addDays, daysBetween, DAY_NAMES } from '@/lib/batches';
import { todayISO } from '@/lib/accounting';

const SESSION_TONE = { scheduled: '', done: 'ok', cancelled: 'bad' };

/** All the batches of one class level, with how far each has got. */
export function BatchesModal({ level, onClose, onChanged }) {
  const [open, setOpen] = useState(null); const [creating, setCreating] = useState(false);
  const { data, error, reload } = useLoad(async () => must(await sb().from('class_batches').select('*,class_sessions(id,status),class_enrolments(id,status)').eq('class_id', level.id).order('starts_on', { ascending: false })), [level.id]);
  const changed = () => { reload(); onChanged?.(); };
  return (<Modal title={`Batches · ${level.title}, ${level.level}`} onClose={onClose} wide>
    <p className="ad-help" style={{ marginTop: 0 }}>A batch is one group of students taking this course together, with its own dates. Run as many batches as you like.</p>
    {error && <Err e={error} />}{!data && !error && <Spin />}
    {data && (data.filter((b) => !b.solo).length ? <div className="ad-list">{data.filter((b) => !b.solo).map((b) => {   /* one-on-one schedules are managed from Students */ const done = b.class_sessions.filter((s) => s.status === 'done').length, total = b.class_sessions.filter((s) => s.status !== 'cancelled').length, people = b.class_enrolments.filter((e) => ['paid', 'transferred'].includes(e.status)).length;
      return <button key={b.id} className="ad-row" onClick={() => setOpen(b)}><div className="main"><b>{b.name || `Batch from ${fmtD(b.starts_on)}`}</b><small>{[dayList(b.days), b.time_text, `from ${fmtD(b.starts_on)}`].filter(Boolean).join(' · ')}</small><small>{done} of {total} classes done · {people}{b.capacity ? ` / ${b.capacity}` : ''} students</small></div><div className="end">{!b.active && <Badge>Hidden</Badge>}{done === total && total > 0 ? <Badge tone="ok">Finished</Badge> : done > 0 ? <Badge tone="warn">Running</Badge> : <Badge>Not started</Badge>}</div></button>; })}</div> : <Empty>No batches yet. Add one to schedule the classes and take attendance.</Empty>)}
    <div className="ad-actions full"><Btn icon="plus" onClick={() => setCreating(true)}>New batch</Btn></div>
    {creating && <BatchForm level={level} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); changed(); }} />}
    {open && <BatchModal batchId={open.id} level={level} onClose={() => setOpen(null)} onChanged={changed} />}
  </Modal>);
}

function BatchForm({ level, batch, onClose, onSaved }) {
  const isNew = !batch; const [run, busy] = useAction();
  const f = useForm({ name: batch?.name || '', start: isoToDMY(batch?.starts_on), days: batch?.days || [], time: batch?.time_text || '', sessions: String(batch?.sessions || level.sessions || 8), capacity: batch?.capacity ? String(batch.capacity) : '', active: batch?.active ?? true });
  const toggle = (d) => f.set('days', f.v.days.includes(d) ? f.v.days.filter((x) => x !== d) : [...f.v.days, d].sort());
  const save = (e) => { e.preventDefault(); return run(async () => {
    const v = f.v; const cap = v.capacity ? parseInt(v.capacity, 10) : null; if (v.capacity && !(cap > 0)) throw new Error('Seats must be 1 or more.');
    if (!isNew) { must(await sb().from('class_batches').update({ name: v.name || null, time_text: v.time || null, capacity: cap, active: v.active }).eq('id', batch.id)); onSaved(); return; }
    const start = dmyToISO(v.start); if (!start) throw new Error('Please enter the first class date as DD/MM/YYYY.'); const n = parseInt(v.sessions, 10); if (!(n >= 1 && n <= 200)) throw new Error('Number of classes must be between 1 and 200.');
    const b = must(await sb().from('class_batches').insert({ class_id: level.id, name: v.name || null, starts_on: start, days: v.days, time_text: v.time || null, sessions: n, capacity: cap, active: v.active }).select().single());
    const dates = classDates(start, v.days, n); must(await sb().from('class_sessions').insert(dates.map((d, i) => ({ batch_id: b.id, no: i + 1, on_date: d })))); onSaved(); }, 'Batch saved'); };
  return (<Modal title={isNew ? 'New batch' : 'Edit batch'} onClose={onClose}><form className="ad-form" onSubmit={save}>
    <div className="full"><F form={f} k="name" label="Name" rule="text" placeholder="e.g. Tuesday and Thursday evenings" hint="Optional. Helps you tell batches apart" /></div>
    {isNew && <><F form={f} k="start" label="First class on" type="date" required /><F form={f} k="sessions" label="Number of classes" rule="digits" required inputMode="numeric" />
      <div className="ad-field full"><span>Days <em> (optional)</em></span><div className="daypick">{DAY_NAMES.map((n, d) => <label key={n} className={f.v.days.includes(d) ? 'on' : ''}><input type="checkbox" checked={f.v.days.includes(d)} onChange={() => toggle(d)} /><span>{n}</span></label>)}</div><small>If you choose none, the first class day repeats every week.</small></div></>}
    <F form={f} k="time" label="Time" rule="text" placeholder="e.g. 4:30 pm to 5:30 pm" /><F form={f} k="capacity" label="Seats" rule="digits" inputMode="numeric" hint="Optional" />
    {!isNew && <div className="full"><F form={f} k="active" label="Show this batch (untick to hide it)" type="check" /></div>}
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn></div></form></Modal>);
}

/** One batch: its students, its dated classes, attendance, and moving a class earlier or later. */
export function BatchModal({ batchId, level, onClose, onChanged }) {
  const toast = useToast(); const [run, busy] = useAction(); const [att, setAtt] = useState(null); const [move, setMove] = useState(null); const [edit, setEdit] = useState(false); const [msg, setMsg] = useState(false); const [extra, setExtra] = useState(false); const [pickId, setPickId] = useState('');
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const b = must(await c.from('class_batches').select('*').eq('id', batchId).single());
    const [s, e, free] = await Promise.all([c.from('class_sessions').select('*').eq('batch_id', batchId).order('no'), c.from('class_enrolments').select('*').eq('batch_id', batchId).in('status', ['paid', 'transferred']).order('student_name'),
      c.from('class_enrolments').select('id,student_name,name,student_group,student_age').eq('class_id', b.class_id).is('batch_id', null).in('status', ['paid', 'transferred']).order('student_name')]);
    const sessions = must(s); const a = sessions.length ? must(await c.from('class_attendance').select('*').in('session_id', sessions.map((x) => x.id))) : [];
    return { b, sessions, people: must(e), free: must(free), a };
  }, [batchId]);
  const changed = () => { reload(); onChanged?.(); };
  if (error) return <Modal title="Batch" onClose={onClose}><Err e={error} /></Modal>; if (!data) return <Modal title="Batch" onClose={onClose}><Spin /></Modal>;
  const { b, sessions, people, free, a } = data; const today = todayISO(); const live = sessions.filter((s) => s.status !== 'cancelled'); const done = sessions.filter((s) => s.status === 'done').length;
  const full = b.capacity && people.length >= b.capacity;
  const addPerson = () => run(async () => { if (!pickId) throw new Error('Please choose a student.'); if (full) throw new Error('This batch is full.'); must(await sb().from('class_enrolments').update({ batch_id: b.id }).eq('id', pickId)); setPickId(''); changed(); }, 'Student added to the batch');
  const removePerson = (id) => run(async () => { must(await sb().from('class_enrolments').update({ batch_id: null }).eq('id', id)); changed(); }, 'Removed from the batch');
  const setStatus = (s, status) => run(async () => { must(await sb().from('class_sessions').update({ status }).eq('id', s.id)); changed(); }, status === 'cancelled' ? 'Class cancelled' : 'Class restored');
  const remove = () => run(async () => { if (a.length) { must(await sb().from('class_batches').update({ active: false }).eq('id', b.id)); toast('This batch has attendance records, so it was hidden instead of deleted.'); } else { must(await sb().from('class_batches').delete().eq('id', b.id)); } onChanged?.(); onClose(); });
  const label = b.name || `Batch from ${fmtD(b.starts_on)}`;
  return (<Modal title={label} onClose={onClose} wide>
    <p className="ad-help" style={{ marginTop: 0 }}>{level.title}, {level.level} · {[dayList(b.days), b.time_text].filter(Boolean).join(' · ')}<br />{done} of {live.length} classes done · {people.length}{b.capacity ? ` of ${b.capacity}` : ''} students</p>
    <p className="ad-section-t">Students</p>
    {people.length ? <div className="ad-list">{people.map((p) => { const pr = progress(sessions, a, p.id); return <div key={p.id} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{p.student_name}</b><small>{p.student_group === 'child' ? `Child, age ${p.student_age}` : 'Adult'} · attended <b style={{ color: '#1d1d1f' }}>{pr.attended}</b> of {pr.held} held · {pr.total} in the course{pr.missed ? ` · missed ${pr.missed}` : ''}</small>
      <div className="progress" aria-hidden="true"><i style={{ width: `${pr.total ? (pr.attended / pr.total) * 100 : 0}%` }} /></div></div><div className="end"><Confirm onYes={() => removePerson(p.id)} label="Remove">Remove</Confirm></div></div>; })}</div> : <Empty>No students in this batch yet.</Empty>}
    {free.length > 0 && !full && <div className="ad-form" style={{ marginTop: 12, gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'end' }}><label className="ad-field"><span>Add a student who has paid for this course</span><select value={pickId} onChange={(e) => setPickId(e.target.value)}><option value="">Choose…</option>{free.map((p) => <option key={p.id} value={p.id}>{p.student_name} ({p.student_group === 'child' ? `age ${p.student_age}` : 'adult'})</option>)}</select></label><Btn busy={busy} onClick={addPerson}>Add</Btn></div>}
    {full && <p className="ad-help">This batch is full.</p>}
    <p className="ad-section-t" style={{ marginTop: 22 }}>Classes</p>
    <div className="ad-list">{sessions.map((s) => { const here = a.filter((x) => x.session_id === s.id && x.present).length;
      return <div key={s.id} className="ad-row" style={{ cursor: 'default', alignItems: 'flex-start' }}><div className="main"><b>Class {s.no} · {fmtDay(s.on_date)}</b><small>{s.moved_from ? `Moved from ${fmtDay(s.moved_from)}` : s.on_date < today && s.status === 'scheduled' ? 'Attendance not taken yet' : s.on_date === today ? 'Today' : ''}{s.status === 'done' ? `${s.moved_from ? ' · ' : ''}${here} of ${people.length} present` : ''}</small>
        <div className="row-actions">{s.status !== 'cancelled' && <Btn variant="ghost" className="ad-btn sm" onClick={() => setAtt(s)}>{s.status === 'done' ? 'Edit attendance' : 'Attendance'}</Btn>}{s.status !== 'cancelled' && <Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setMove(s)}>Move</Btn>}
          {s.status === 'cancelled' ? <Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setStatus(s, 'scheduled')}>Restore</Btn> : s.status === 'scheduled' ? <Confirm onYes={() => setStatus(s, 'cancelled')} label="Cancel class">Cancel class</Confirm> : null}</div></div>
        <div className="end"><Badge tone={SESSION_TONE[s.status]}>{s.status === 'done' ? 'Done' : s.status === 'cancelled' ? 'Cancelled' : 'Scheduled'}</Badge></div></div>; })}</div>
    <div className="ad-actions full"><Btn variant="ghost" icon="plus" onClick={() => setExtra(true)}>Add a class</Btn><Btn variant="ghost" icon="mail" disabled={!people.length} onClick={() => setMsg(true)}>Message students</Btn><Btn variant="ghost" onClick={() => setEdit(true)}>Edit batch</Btn><Confirm onYes={remove}>Delete</Confirm></div>
    {att && <AttendanceModal session={att} people={people} attendance={a} onClose={() => setAtt(null)} onSaved={() => { setAtt(null); changed(); }} />}
    {move && <MoveModal session={move} sessions={sessions} onClose={() => setMove(null)} onSaved={() => { setMove(null); changed(); }} />}
    {edit && <BatchForm level={level} batch={b} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); changed(); }} />}
    {msg && <MessageModal audience="batch" id={b.id} title={label} people={people} onClose={() => setMsg(false)} />}
    {extra && <ExtraClass batch={b} sessions={sessions} onClose={() => setExtra(false)} onSaved={() => { setExtra(false); changed(); }} />}
  </Modal>);
}

/** Mark each student present or absent for one class. */
function AttendanceModal({ session, people, attendance, onClose, onSaved }) {
  const [run, busy] = useAction(); const init = Object.fromEntries(people.map((p) => { const r = attendance.find((x) => x.session_id === session.id && x.enrolment_id === p.id); return [p.id, r ? r.present : null]; })); const [v, setV] = useState(init);
  const save = () => run(async () => {
    const rows = people.filter((p) => v[p.id] !== null).map((p) => ({ session_id: session.id, enrolment_id: p.id, present: !!v[p.id] }));
    if (rows.length) must(await sb().from('class_attendance').upsert(rows, { onConflict: 'session_id,enrolment_id' }));
    must(await sb().from('class_sessions').update({ status: 'done' }).eq('id', session.id)); onSaved(); }, 'Attendance saved');
  const count = Object.values(v).filter((x) => x === true).length;
  return (<Modal title={`Attendance · Class ${session.no}, ${fmtDay(session.on_date)}`} onClose={onClose}>
    {people.length ? <><div className="ad-actions" style={{ marginTop: 0, marginBottom: 10 }}><Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setV(Object.fromEntries(people.map((p) => [p.id, true])))}>Mark everyone present</Btn><span className="ad-help" style={{ margin: 0 }}>{count} of {people.length} present</span></div>
      <div className="ad-list">{people.map((p) => <div key={p.id} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{p.student_name}</b><small>{p.student_group === 'child' ? `Child, age ${p.student_age}` : 'Adult'}</small></div>
        <div className="ad-seg" style={{ margin: 0 }} role="group" aria-label={`Attendance for ${p.student_name}`}><button type="button" className={v[p.id] === true ? 'on' : ''} onClick={() => setV((x) => ({ ...x, [p.id]: true }))}>Present</button><button type="button" className={v[p.id] === false ? 'on' : ''} onClick={() => setV((x) => ({ ...x, [p.id]: false }))}>Absent</button></div></div>)}</div></> : <Empty>There are no students in this batch yet.</Empty>}
    <p className="ad-help">Saving marks this class as done. Anyone you leave unmarked counts as absent in their progress.</p>
    <div className="ad-actions full"><Btn busy={busy} icon="check" onClick={save}>Save</Btn><Btn variant="ghost" onClick={onClose}>Cancel</Btn></div></Modal>);
}

/** Prepone or postpone one class, and optionally every class after it. */
function MoveModal({ session, sessions, onClose, onSaved }) {
  const [run, busy] = useAction(); const f = useForm({ date: isoToDMY(session.on_date), later: true, note: '' }); const iso = dmyToISO(f.v.date); const delta = iso ? daysBetween(session.on_date, iso) : 0;
  const changes = iso ? moveClass(sessions, session.no, iso, f.v.later) : []; const later = changes.length - (changes.length ? 1 : 0);
  const save = () => run(async () => { if (!iso) throw new Error('Please enter the new date as DD/MM/YYYY.'); if (!delta) throw new Error('Please choose a different date.');
    for (const c of changes) must(await sb().from('class_sessions').update({ on_date: c.on_date, moved_from: c.moved_from, ...(c.id === session.id && f.v.note ? { note: f.v.note } : {}) }).eq('id', c.id)); onSaved(); }, 'Class moved');
  return (<Modal title={`Move Class ${session.no}`} onClose={onClose}><p className="ad-help" style={{ marginTop: 0 }}>Now on <b>{fmtDay(session.on_date)}</b>.</p>
    <div className="ad-form"><F form={f} k="date" label="New date" type="date" required hint={delta ? (delta > 0 ? `Postponed by ${delta} ${delta === 1 ? 'day' : 'days'}` : `Preponed by ${-delta} ${delta === -1 ? 'day' : 'days'}`) : 'Type the date it should happen on'} />
      <div className="full"><F form={f} k="later" label="Move all the later classes by the same number of days" type="check" /></div>
      <div className="full"><F form={f} k="note" label="Reason" rule="sentence" hint="For your own record" /></div></div>
    {delta !== 0 && <p className="ad-help">{later > 0 ? `This class and ${later} later ${later === 1 ? 'class' : 'classes'} will move.` : 'Only this class will move.'}</p>}
    <p className="ad-help">Students are not told automatically. Use "Message students" to let them know.</p>
    <div className="ad-actions full"><Btn busy={busy} icon="check" onClick={save}>Move</Btn><Btn variant="ghost" onClick={onClose}>Cancel</Btn></div></Modal>);
}

function ExtraClass({ batch, sessions, onClose, onSaved }) {
  const [run, busy] = useAction(); const last = sessions[sessions.length - 1]; const f = useForm({ date: isoToDMY(last ? addDays(last.on_date, 7) : batch.starts_on) });
  const save = () => run(async () => { const d = dmyToISO(f.v.date); if (!d) throw new Error('Please enter the date as DD/MM/YYYY.'); must(await sb().from('class_sessions').insert({ batch_id: batch.id, no: (last?.no || 0) + 1, on_date: d })); onSaved(); }, 'Class added');
  return (<Modal title="Add a class" onClose={onClose}><div className="ad-form"><F form={f} k="date" label="Date" type="date" required /></div><div className="ad-actions full"><Btn busy={busy} icon="check" onClick={save}>Add</Btn><Btn variant="ghost" onClick={onClose}>Cancel</Btn></div></Modal>);
}
