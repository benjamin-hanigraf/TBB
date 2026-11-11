'use client';
import { useState } from 'react';
import Icon from '@/components/Icons';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Modal, Btn, F, useForm, useAction, Confirm, Sortable, slugify, dmyToISO, isoToDMY, download, useToast } from './kit';
import ImportCsv from './ImportCsv';
import { AddEnrol, EnrolModal } from './ManualEntry';
import { money, rupeesToPaise, toCSV } from '@/lib/accounting';
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Classes() {
  const toast = useToast(); const [edit, setEdit] = useState(null); const [imp, setImp] = useState(false); const [people, setPeople] = useState(null);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [l, e, t] = await Promise.all([c.from('class_levels').select('*').order('sort_order'), c.from('class_enrolments').select('class_id').eq('status', 'paid'), c.from('class_types').select('*').order('sort_order')]);
    const n = {}; must(e).forEach((x) => (n[x.class_id] = (n[x.class_id] || 0) + 1)); return { levels: must(l), n, types: must(t) };
  });
  if (error) return <Page title="Classes"><Err e={error} /></Page>; if (!data) return <Page title="Classes"><Spin /></Page>;
  const tone = (name) => Math.max(0, data.types.findIndex((t) => t.name === name)) % 4;
  const reorder = async (arr) => { try { for (let i = 0; i < arr.length; i++) if (arr[i].sort_order !== i + 1) must(await sb().from('class_levels').update({ sort_order: i + 1 }).eq('id', arr[i].id)); toast('Order saved'); reload(); } catch (e) { toast(e.message || 'Could not save the order.', 'err'); } };
  return (<Page title="Classes" action={<><Btn variant="ghost" icon="filein" onClick={() => setImp(true)}>Import</Btn><Btn icon="plus" onClick={() => setEdit({})}>Add level</Btn></>}>
    <Card tight>{data.levels.length ? <Sortable className="cls-list" items={data.levels} onReorder={reorder} render={(c, grip) => (
      <div className={`cls-box t${tone(c.track)}`}><span {...grip}><Icon n="grip" size={18} /></span>
        <button type="button" className="main cls-main" onClick={() => setEdit(c)}><b>{c.title}, {c.level}</b><small>{c.track} · {c.sessions} classes · {data.n[c.id] || 0} enrolled</small></button>
        <div className="end"><b>{money(c.price_paise)}</b>{!c.active && <Badge>Hidden</Badge>}<Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setPeople(c)}>Participants</Btn></div></div>)} /> : <Empty>No levels yet.</Empty>}</Card>
    {data.levels.length > 1 && <p className="ad-help" style={{ textAlign: 'center' }}>Drag the handle to change the order on the website.</p>}
    {imp && <ImportCsv kind="classes" onClose={() => setImp(false)} onDone={reload} />}
    {edit && <Form c={edit} types={data.types} count={data.levels.length} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    {people && <Participants level={people} onClose={() => setPeople(null)} onChanged={reload} />}
  </Page>);
}

function Form({ c, types, count, onClose, onSaved }) {
  const isNew = !c.id; const [run, busy] = useAction(); const [newType, setNewType] = useState(false); const [typeName, setTypeName] = useState(''); const [extra, setExtra] = useState([]);
  const names = [...new Set([...types.map((t) => t.name), ...extra, ...(c.track && !types.some((t) => t.name === c.track) ? [c.track] : [])])];
  const f = useForm({ title: c.title || '', level: c.level || '', track: c.track || names[0] || '', description: c.description || '', covers: (c.covers || []).join('\n'), price: c.price_paise != null ? String(c.price_paise / 100) : '', sessions: String(c.sessions || 8), active: c.active ?? true,
    starts_on: isoToDMY(c.starts_on), days: c.days || [], time_text: c.time_text || '' });
  const toggleDay = (d) => f.set('days', f.v.days.includes(d) ? f.v.days.filter((x) => x !== d) : [...f.v.days, d].sort());
  const addType = () => run(async () => { const n = typeName.trim().replace(/\s+/g, ' '); if (!n) throw new Error('Please type a name for the type.'); const name = n[0].toUpperCase() + n.slice(1);
    if (!names.some((x) => x.toLowerCase() === name.toLowerCase())) must(await sb().from('class_types').insert({ name, sort_order: types.length + extra.length + 1 })); setExtra((a) => [...a, name]); f.set('track', name); setNewType(false); setTypeName(''); }, 'Type added');
  const save = (e) => { e.preventDefault(); return run(async () => {
    const v = f.v; if (!v.title.trim() || !v.level.trim()) throw new Error('Please add a course name and a level.'); if (!v.price) throw new Error('Please add a price.'); if (!v.track) throw new Error('Please choose a type.');
    const start = v.starts_on ? dmyToISO(v.starts_on) : null; if (v.starts_on && !start) throw new Error('Please enter the start date as DD/MM/YYYY.');
    const row = { title: v.title, level: v.level, track: v.track, description: v.description || null, covers: lines(v.covers), price_paise: rupeesToPaise(v.price), sessions: Math.max(1, parseInt(v.sessions || '8', 10)), active: v.active, starts_on: start, days: v.days, time_text: v.time_text || null };
    if (isNew) { const base = slugify(`${v.track}-${v.level}-${v.title}`); const r1 = await sb().from('class_levels').insert({ ...row, sort_order: count + 1, slug: base }); let r = r1; if (r.error?.code === '23505') r = await sb().from('class_levels').insert({ ...row, sort_order: count + 1, slug: `${base}-${Math.random().toString(36).slice(2, 5)}` }); must(r); }
    else must(await sb().from('class_levels').update(row).eq('id', c.id)); onSaved();
  }, 'Saved'); };
  const del = () => run(async () => { must(await sb().from('class_levels').delete().eq('id', c.id)); onSaved(); }, 'Deleted');
  return (<Modal title={isNew ? 'Add level' : 'Edit level'} onClose={onClose} wide>
    <form onSubmit={save} className="ad-form">
      <F form={f} k="title" label="Course name" rule="title" required /><F form={f} k="level" label="Level" rule="title" required placeholder="e.g. Level 1" />
      <label className="ad-field"><span>Type <i> *</i></span><select value={f.v.track} required onChange={(e) => { if (e.target.value === '__new') setNewType(true); else f.set('track', e.target.value); }}>{names.map((n) => <option key={n} value={n}>{n}</option>)}<option value="__new">+ Add type…</option></select></label>
      {newType && <div className="ad-field full"><span>New type name</span><div style={{ display: 'flex', gap: 8 }}><input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="e.g. Brush Lettering" autoFocus autoComplete="off" /><Btn type="button" busy={busy} onClick={addType}>Add</Btn><Btn type="button" variant="ghost" onClick={() => setNewType(false)}>Cancel</Btn></div></div>}
      <F form={f} k="price" label="Price (₹)" type="money" rule="money" required /><F form={f} k="sessions" label="Number of classes" rule="digits" required inputMode="numeric" />
      <div className="full"><p className="ad-section-t">Schedule (shown in your calendar)</p></div>
      <F form={f} k="starts_on" label="First class on" type="date" /><F form={f} k="time_text" label="Time" rule="text" placeholder="e.g. 4:30 pm to 5:30 pm" />
      <div className="ad-field full"><span>Days <em> (optional)</em></span><div className="daypick">{DAY_NAMES.map((n, d) => <label key={n} className={f.v.days.includes(d) ? 'on' : ''}><input type="checkbox" checked={f.v.days.includes(d)} onChange={() => toggleDay(d)} /><span>{n}</span></label>)}</div></div>
      <div className="full"><F form={f} k="description" label="Short description" type="textarea" rule="sentence" rows={3} /></div>
      <div className="full"><F form={f} k="covers" label="What it covers" type="textarea" rule="sentence" hint="One point per line" /></div>
      <div className="full"><F form={f} k="active" label="Show on the website" type="check" /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Confirm onYes={del}>Delete</Confirm>}</div></form></Modal>);
}

function Participants({ level, onClose, onChanged }) {
  const [add, setAdd] = useState(false); const [one, setOne] = useState(null);
  const { data, error, reload } = useLoad(async () => must(await sb().from('class_enrolments').select('*,class_levels(title,level)').eq('class_id', level.id).in('status', ['paid', 'pending', 'transferred']).order('created_at')), [level.id]);
  const rows = (data || []).filter((x) => x.status !== 'pending' || x.channel === 'manual'); const changed = () => { reload(); onChanged(); };
  return (<Modal title={`Participants · ${level.title}, ${level.level}`} onClose={onClose} wide>
    {error && <Err e={error} />}{!data && !error && <Spin />}
    {data && <>{rows.length ? <div className="ad-list">{rows.map((x) => <button key={x.id} className="ad-row" onClick={() => setOne(x)}><div className="main"><b>{x.student_name}</b><small>{x.student_group === 'child' ? `Child, age ${x.student_age} · parent ${x.name}` : 'Adult'} · {x.phone}</small></div><div className="end"><b>{money(x.amount_paise)}</b><Badge tone={x.status === 'paid' ? 'ok' : x.status === 'pending' ? 'warn' : ''}>{x.status === 'pending' ? 'not paid' : x.status}</Badge></div></button>)}</div> : <Empty>No participants yet.</Empty>}
      <div className="ad-actions full"><Btn icon="plus" onClick={() => setAdd(true)}>Add enrolment</Btn>
        {rows.length > 0 && <Btn variant="ghost" icon="fileout" onClick={() => download(`${level.slug}-participants.csv`, toCSV(rows, [{ label: 'Participant', key: 'student_name' }, { label: 'Group', key: 'student_group' }, { label: 'Age', key: 'student_age' }, { label: 'Contact name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Status', key: 'status' }, { label: 'Paid', get: (x) => x.amount_paise / 100 }]))}>Export</Btn>}</div></>}
    {add && <AddEnrol level={level} onClose={() => setAdd(false)} onSaved={() => { setAdd(false); changed(); }} />}
    {one && <EnrolModal e={one} onClose={() => setOne(null)} onSaved={() => { setOne(null); changed(); }} />}
  </Modal>);
}
