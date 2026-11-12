'use client';
import { useState } from 'react';
import { useLoad, sb, must, Page, Card, Empty, Spin, Err, Modal, Btn, F, useForm, useAction, Confirm, dmyToISO, isoToDMY, fmtD } from './kit';
import { todayISO } from '@/lib/accounting';

const Wrap = ({ embedded, title, children }) => (embedded ? <div id="todo" className="ad-embed"><h2 className="ad-embed-h">{title}</h2>{children}</div> : <Page title={title}>{children}</Page>);
export default function Todo({ embedded = false, onChanged }) {
  const [edit, setEdit] = useState(null); const [showDone, setShowDone] = useState(false); const [run, busy] = useAction(); const add = useForm({ title: '', due: '' });
  const { data, error, reload } = useLoad(async () => must(await sb().from('todos').select('*').order('due_on', { nullsFirst: false }).order('created_at', { ascending: false }).limit(1000)));
  if (error) return <Wrap embedded={embedded} title="To-do"><Err e={error} /></Wrap>; if (!data) return <Wrap embedded={embedded} title="To-do"><Spin /></Wrap>;
  const today = todayISO(); const open = data.filter((t) => !t.done), done = data.filter((t) => t.done).sort((a, b) => (b.done_at || '').localeCompare(a.done_at || ''));
  const groups = [['Overdue', open.filter((t) => t.due_on && t.due_on < today)], ['Today', open.filter((t) => t.due_on === today)], ['Coming up', open.filter((t) => t.due_on && t.due_on > today)], ['Anytime', open.filter((t) => !t.due_on)]];
  const toggle = (t) => run(async () => { must(await sb().from('todos').update({ done: !t.done, done_at: t.done ? null : new Date().toISOString() }).eq('id', t.id)); reload(); onChanged?.(); });
  const create = (e) => { e.preventDefault(); return run(async () => {
    if (!add.v.title.trim()) throw new Error('Please type the task.'); const due = add.v.due ? dmyToISO(add.v.due) : null; if (add.v.due && !due) throw new Error('Please enter the date as DD/MM/YYYY.');
    must(await sb().from('todos').insert({ title: add.v.title.trim(), due_on: due })); add.reset({ title: '', due: '' }); reload(); onChanged?.(); }); };
  const row = (t) => (<div key={t.id} className="ad-row todo-row" style={{ cursor: 'default' }}>
    <input type="checkbox" checked={t.done} onChange={() => toggle(t)} aria-label={t.done ? 'Mark as not done' : 'Mark as done'} />
    <button type="button" className="main todo-main" onClick={() => setEdit(t)}><b style={t.done ? { textDecoration: 'line-through', color: '#8e8e93' } : undefined}>{t.title}</b>{(t.due_on || t.note) && <small>{[t.due_on && fmtD(t.due_on), t.note].filter(Boolean).join(' · ')}</small>}</button></div>);
  return (<Wrap embedded={embedded} title="To-do">
    <Card><form className="ad-form todo-add" onSubmit={create}>
      <F form={add} k="title" label="New task" rule="sentence" placeholder="e.g. Order paper for the next workshop" required />
      <F form={add} k="due" label="Remind me on" type="date" />
      <div className="ad-actions"><Btn busy={busy} icon="plus">Add</Btn></div></form></Card>
    {groups.map(([t, rows]) => rows.length ? <Card key={t} title={t} tight><div className="ad-list">{rows.map(row)}</div></Card> : null)}
    {!open.length && <Card><Empty>Nothing to do. Add a task above.</Empty></Card>}
    {done.length > 0 && <Card tight title={`Done (${done.length})`} action={<button className="ad-btn ghost sm" onClick={() => setShowDone(!showDone)}>{showDone ? 'Hide' : 'Show'}</button>}>{showDone && <div className="ad-list">{done.slice(0, 50).map(row)}</div>}</Card>}
    {edit && <EditTask t={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); onChanged?.(); }} />}
  </Wrap>);
}
function EditTask({ t, onClose, onSaved }) {
  const [run, busy] = useAction(); const f = useForm({ title: t.title, note: t.note || '', due: isoToDMY(t.due_on) });
  const save = (e) => { e.preventDefault(); return run(async () => { if (!f.v.title.trim()) throw new Error('Please type the task.'); const due = f.v.due ? dmyToISO(f.v.due) : null; if (f.v.due && !due) throw new Error('Please enter the date as DD/MM/YYYY.');
    must(await sb().from('todos').update({ title: f.v.title.trim(), note: f.v.note || null, due_on: due }).eq('id', t.id)); onSaved(); }, 'Saved'); };
  const del = () => run(async () => { must(await sb().from('todos').delete().eq('id', t.id)); onSaved(); }, 'Deleted');
  return (<Modal title="Edit task" onClose={onClose}><form className="ad-form" onSubmit={save}>
    <div className="full"><F form={f} k="title" label="Task" rule="sentence" required /></div><F form={f} k="due" label="Remind me on" type="date" />
    <div className="full"><F form={f} k="note" label="Note" type="textarea" rule="sentence" rows={3} /></div>
    <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn><Confirm onYes={del}>Delete</Confirm></div></form></Modal>);
}
