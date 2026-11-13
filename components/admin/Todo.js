'use client';
import { useEffect, useRef, useState } from 'react';
import { nb, Segs, useLoad, sb, must, every, Page, Card, Fold, Empty, Spin, Err, Modal, Btn, F, useForm, useAction, useToast, Confirm, dmyToISO, isoToDMY, fmtD } from './kit';
import { todayISO } from '@/lib/accounting';

const Wrap = ({ embedded, title, action, children }) => (embedded ? <div id="todo" className="ad-embed"><div className="ad-embed-row"><h2 className="ad-embed-h">{title}</h2>{action}</div>{children}</div> : <Page title={title} action={action}>{children}</Page>);
export default function Todo({ embedded = false, onChanged }) {
  const [edit, setEdit] = useState(null); const [run, busy] = useAction(); const toast = useToast(); const add = useForm({ title: '', due: '' }); const [adding, setAdding] = useState(false);
  const [local, setLocal] = useState({}); const [leaving, setLeaving] = useState({}); const [undoing, setUndoing] = useState({}); const timers = useRef({});            // local: ticks shown at once; undoing: ticked a moment ago (Undo is offered); leaving: rows sliding away
  const { data, error, reload } = useLoad(async () => must(await every(() => sb().from('todos').select('*').order('due_on', { nullsFirst: false }).order('created_at', { ascending: false }).order('id'))));
  useEffect(() => { setLocal((l) => Object.fromEntries(Object.entries(l).filter(([id]) => undoing[id]))); setLeaving({}); /* eslint-disable-next-line */ }, [data]);                                       // fresh data from the database replaces what was shown meanwhile
  useEffect(() => { let id = null; try { id = new URLSearchParams(window.location.search).get('todo'); } catch {} const t = id && data?.find((x) => x.id === id); if (t) setEdit(t); }, [data]);   // a link from Home opens that task
  if (error) return <Wrap embedded={embedded} title="Tasks"><Err e={error} /></Wrap>; if (!data) return <Wrap embedded={embedded} title="Tasks"><Spin /></Wrap>;
  const items = data.map((t) => (t.id in local ? { ...t, done: local[t.id], done_at: local[t.id] ? new Date().toISOString() : null } : t));
  const today = todayISO(); const open = items.filter((t) => !t.done), done = items.filter((t) => t.done).sort((a, b) => (b.done_at || '').localeCompare(a.done_at || ''));
  // Today holds everything to do now: due today, overdue, and tasks with no date. Only tasks with a later date wait under Coming up.
  const now = items.filter((t) => undoing[t.id] || (!t.done && (!t.due_on || t.due_on <= today))).sort((a, b) => (a.due_on || '9999').localeCompare(b.due_on || '9999')); const later = open.filter((t) => t.due_on && t.due_on > today);
  // Ticking: the row slides and fades away, then the task is saved quietly. The page never reloads or jumps, and the Add button is not touched.
  const save = async (t, next) => { const r = await sb().from('todos').update({ done: next, done_at: next ? new Date().toISOString() : null }).eq('id', t.id); if (r.error) { toast('Could not save. Please try again.', 'err'); return false; } return true; };
  // Ticking saves at once and keeps the task on the list for a few seconds with an Undo button, in case of an accidental touch. Then it slides away.
  const toggle = async (t) => {
    if (undoing[t.id]) return undo(t);
    if (t.done) { setLeaving((l) => ({ ...l, [t.id]: true })); setTimeout(async () => { setLocal((l) => ({ ...l, [t.id]: false })); setLeaving((l) => { const n = { ...l }; delete n[t.id]; return n; }); if (await save(t, false)) { reload(); onChanged?.(); } else setLocal((l) => { const n = { ...l }; delete n[t.id]; return n; }); }, 260); return; }
    setLocal((l) => ({ ...l, [t.id]: true })); setUndoing((u) => ({ ...u, [t.id]: true }));
    if (!(await save(t, true))) { setLocal((l) => { const n = { ...l }; delete n[t.id]; return n; }); setUndoing((u) => { const n = { ...u }; delete n[t.id]; return n; }); return; }
    timers.current[t.id] = setTimeout(() => { setLeaving((l) => ({ ...l, [t.id]: true })); setTimeout(() => { setUndoing((u) => { const n = { ...u }; delete n[t.id]; return n; }); setLeaving((l) => { const n = { ...l }; delete n[t.id]; return n; }); reload(); onChanged?.(); }, 280); }, 5000);
  };
  const undo = async (t) => { clearTimeout(timers.current[t.id]); setLocal((l) => ({ ...l, [t.id]: false })); setUndoing((u) => { const n = { ...u }; delete n[t.id]; return n; }); if (await save(t, false)) { reload(); onChanged?.(); } };
  const create = (e) => { e.preventDefault(); return run(async () => {
    if (!add.v.title.trim()) throw new Error('Please type the task.'); const due = add.v.due ? dmyToISO(add.v.due) : null; if (add.v.due && !due) throw new Error('Please enter the date as DD/MM/YYYY.');
    must(await sb().from('todos').insert({ title: add.v.title.trim(), due_on: due })); add.reset({ title: '', due: '' }); setAdding(false); reload(); onChanged?.(); }, 'Task added'); };
  const row = (t) => (<div key={t.id} className={`ad-row todo-row ${leaving[t.id] ? 'leaving' : ''}`} style={{ cursor: 'default' }}>
    <input type="checkbox" checked={t.done || !!leaving[t.id]} onChange={() => toggle(t)} aria-label={t.done ? 'Mark as not done' : 'Mark as done'} />
    <button type="button" className="main todo-main" onClick={() => setEdit(t)}><b style={t.done ? { textDecoration: 'line-through', color: '#8e8e93' } : undefined}>{nb(t.title)}</b>{(t.due_on || t.note) && <Segs className={!t.done && t.due_on && t.due_on < today ? 'late' : ''} items={[t.due_on && (!t.done && t.due_on < today ? `Overdue · ${fmtD(t.due_on)}` : fmtD(t.due_on)), t.note]} />}</button>{undoing[t.id] && <Btn variant="ghost" icon="undo" className="ad-btn ghost sm undo" onClick={() => undo(t)}>Undo</Btn>}</div>);
  return (<Wrap embedded={embedded} title="Tasks" action={<Btn variant="ghost" icon={adding ? 'close' : 'plus'} onClick={() => setAdding((a) => !a)}>{adding ? 'Close' : 'Add'}</Btn>}>
    {adding && <Card><form className="ad-form todo-add" onSubmit={create}>
      <F form={add} k="title" label="New task" rule="sentence" placeholder="e.g. Order paper for the next workshop" required autoFocus />
      <F form={add} k="due" label="Due on" type="date" />
      <div className="ad-actions"><Btn busy={busy} icon="plus">Add</Btn></div></form></Card>}
    {now.length ? <Card title="Today" tight><div className="ad-list">{now.map(row)}</div></Card> : <Card title="Today"><Empty>Nothing to do right now.</Empty></Card>}
    {later.length > 0 && <Fold title="Coming up"><div className="ad-list">{later.map(row)}</div></Fold>}
    {done.length > 0 && <Fold title="Completed"><div className="ad-list">{done.slice(0, 50).map(row)}</div></Fold>}
    {edit && <EditTask t={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); onChanged?.(); }} />}
  </Wrap>);
}
function EditTask({ t, onClose, onSaved }) {
  const [run, busy] = useAction(); const f = useForm({ title: t.title, note: t.note || '', due: isoToDMY(t.due_on) });
  const save = (e) => { e.preventDefault(); return run(async () => { if (!f.v.title.trim()) throw new Error('Please type the task.'); const due = f.v.due ? dmyToISO(f.v.due) : null; if (f.v.due && !due) throw new Error('Please enter the date as DD/MM/YYYY.');
    must(await sb().from('todos').update({ title: f.v.title.trim(), note: f.v.note || null, due_on: due }).eq('id', t.id)); onSaved(); }, 'Saved'); };
  const del = () => run(async () => { must(await sb().from('todos').delete().eq('id', t.id)); onSaved(); }, 'Deleted');
  return (<Modal title="Edit task" onClose={onClose}><form className="ad-form" onSubmit={save}>
    <div className="full"><F form={f} k="title" label="Task" rule="sentence" required /></div><F form={f} k="due" label="Due on" type="date" />
    <div className="full"><F form={f} k="note" label="Note" type="textarea" rule="sentence" rows={3} /></div>
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn><Confirm onYes={del}>Delete</Confirm></div></form></Modal>);
}
