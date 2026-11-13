'use client';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icons';
import { nb, useLoad, sb, must, every, Page, Card, Badge, Empty, Spin, Err, Modal, ViewModal, Btn, F, useForm, useAction, Confirm, Sortable, slugify, useToast } from './kit';
import { GST_MODES } from '@/lib/gst';
import { AddEnrol, EnrolModal } from './ManualEntry';
import { OneOnOneModal } from './OneOnOne';
import { money, rupeesToPaise, todayISO } from '@/lib/accounting';
import { fmtDay } from '@/lib/dates';
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);

export default function Classes() {
  const toast = useToast(); const [edit, setEdit] = useState(null); const [view, setView] = useState(null); const [people, setPeople] = useState(null); const [autoOpen, setAutoOpen] = useState(null);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [l, e, t, s] = await Promise.all([c.from('class_levels').select('*').order('sort_order'), every(() => c.from('class_enrolments').select('id,class_id').in('status', ['paid', 'transferred']).order('id')),
      c.from('class_types').select('*').order('sort_order'), every(() => c.from('class_sessions').select('enrolment_id,status').neq('status', 'cancelled').order('id'))]);
    const scheduled = new Set(must(s).map((x) => x.enrolment_id)); const n = {}, loose = {};          // loose: students who paid but have no classes yet
    must(e).forEach((x) => { n[x.class_id] = (n[x.class_id] || 0) + 1; if (!scheduled.has(x.id)) loose[x.class_id] = (loose[x.class_id] || 0) + 1; });
    return { levels: must(l), n, loose, types: must(t) };
  });
  useEffect(() => {          // a link from Accounts (?people=<level>) or from Home (?student=<student>) opens that level's students, or that one student's classes
    let id = null, st = null; try { const q = new URLSearchParams(window.location.search); id = q.get('people'); st = q.get('student'); } catch {}
    if (id) { const l = data?.levels.find((x) => x.id === id); if (l) setPeople(l); }
    else if (st && data) sb().from('class_enrolments').select('class_id').eq('id', st).maybeSingle().then((r) => { const l = data.levels.find((x) => x.id === r.data?.class_id); if (l) { setAutoOpen(st); setPeople(l); } });
  }, [data]);
  if (error) return <Page title="Classes"><Err e={error} /></Page>; if (!data) return <Page title="Classes"><Spin /></Page>;
  const tone = (name) => Math.max(0, data.types.findIndex((t) => t.name === name)) % 4;
  const reorder = async (arr) => { try { for (let i = 0; i < arr.length; i++) if (arr[i].sort_order !== i + 1) must(await sb().from('class_levels').update({ sort_order: i + 1 }).eq('id', arr[i].id)); toast('Order saved'); reload(); } catch (e) { toast(e.message || 'Could not save the order.', 'err'); } };
  return (<Page title="Classes" action={<Btn icon="plus" onClick={() => setEdit({})}>Add Class</Btn>}>
    <Card tight>{data.levels.length ? <Sortable className="cls-list" items={data.levels} onReorder={reorder} render={(c, grip) => (
      <div className={`cls-box t${tone(c.track)}`}><span {...grip}><Icon n="grip" size={18} /></span>
        <button type="button" className="main cls-main" onClick={() => setView(c)}><b>{nb(c.title)} ({nb(c.level)})</b><small>{c.track}</small><small className="cls-n"><span className="seg">{c.sessions} classes · {data.n[c.id] || 0} {(data.n[c.id] || 0) === 1 ? 'student' : 'students'}</span></small></button>
        <div className="end"><span className="cls-tags">{!c.active && <Badge>Hidden</Badge>}{data.loose[c.id] > 0 && <Badge tone="warn">{data.loose[c.id]} to schedule</Badge>}</span><b className="cls-amt">{money(c.price_paise)}</b><Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setPeople(c)}>Students</Btn></div></div>)} /> : <Empty>No levels yet.</Empty>}</Card>
    {data.levels.length > 1 && <p className="ad-help" style={{ textAlign: 'center' }}>Drag the handle to change the order on the website. "To schedule" means students who paid but have no class dates yet: open Students, then Classes.</p>}
    {view && <ViewModal title={`${view.title} (${view.level})`} onClose={() => setView(null)} onEdit={() => { setEdit(view); setView(null); }}
      rows={[['Type', view.track], ['Price', `${money(view.price_paise)}${view.gst_mode === 'add' ? ' + GST' : view.gst_mode === 'included' ? ' incl. GST' : ''}`], ['Number of classes', String(view.sessions)], ['On the website', view.active ? 'Shown' : 'Hidden'], ['Description', view.description], ['What it covers', (view.covers || []).join('\n')]]} />}
    {edit && <Form c={edit} types={data.types} count={data.levels.length} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    {people && <Participants level={people} autoOpen={autoOpen} onClose={() => { setPeople(null); setAutoOpen(null); }} onChanged={reload} />}
  </Page>);
}

function Form({ c, types, count, onClose, onSaved }) {
  const isNew = !c.id; const [run, busy] = useAction(); const [newType, setNewType] = useState(false); const [typeName, setTypeName] = useState(''); const [extra, setExtra] = useState([]);
  const names = [...new Set([...types.map((t) => t.name), ...extra, ...(c.track && !types.some((t) => t.name === c.track) ? [c.track] : [])])];
  const f = useForm({ title: c.title || '', level: c.level || '', track: c.track || names[0] || '', description: c.description || '', covers: (c.covers || []).join('\n'), price: c.price_paise != null ? String(c.price_paise / 100) : '', sessions: String(c.sessions || 8), active: c.active ?? true, gst_mode: c.gst_mode || 'none' });
  const addType = () => run(async () => { const n = typeName.trim().replace(/\s+/g, ' '); if (!n) throw new Error('Please type a name for the type.'); const name = n[0].toUpperCase() + n.slice(1);
    if (!names.some((x) => x.toLowerCase() === name.toLowerCase())) must(await sb().from('class_types').insert({ name, sort_order: types.length + extra.length + 1 })); setExtra((a) => [...a, name]); f.set('track', name); setNewType(false); setTypeName(''); }, 'Type added');
  const save = (e) => { e.preventDefault(); return run(async () => {
    const v = f.v; if (!v.title.trim() || !v.level.trim()) throw new Error('Please add a course name and a level.'); if (!v.price) throw new Error('Please add a price.'); if (!v.track) throw new Error('Please choose a type.');
    const row = { title: v.title, level: v.level, track: v.track, description: v.description || null, covers: lines(v.covers), price_paise: rupeesToPaise(v.price), sessions: Math.max(1, parseInt(v.sessions || '8', 10)), active: v.active, gst_mode: v.gst_mode };
    if (isNew) { const base = slugify(`${v.track}-${v.level}-${v.title}`); const r1 = await sb().from('class_levels').insert({ ...row, sort_order: count + 1, slug: base }); let r = r1; if (r.error?.code === '23505') r = await sb().from('class_levels').insert({ ...row, sort_order: count + 1, slug: `${base}-${Math.random().toString(36).slice(2, 5)}` }); must(r); }
    else must(await sb().from('class_levels').update(row).eq('id', c.id)); onSaved();
  }, 'Saved'); };
  const [blocked, setBlocked] = useState(0);
  const del = () => run(async () => {
    const { count } = await sb().from('class_enrolments').select('id', { count: 'exact', head: true }).eq('class_id', c.id); if (count > 0) { setBlocked(count); return; }
    must(await sb().from('class_levels').delete().eq('id', c.id)); onSaved(); }, 'Deleted');
  const hide = () => run(async () => { must(await sb().from('class_levels').update({ active: false }).eq('id', c.id)); onSaved(); }, 'Hidden from the website');
  return (<Modal title={isNew ? 'Add level' : 'Edit level'} onClose={onClose} wide>
    <form onSubmit={save} className="ad-form">
      <F form={f} k="title" label="Course name" rule="title" required /><F form={f} k="level" label="Level" rule="title" required placeholder="e.g. Level 1" />
      <label className="ad-field"><span>Type <i> *</i></span><select value={f.v.track} required onChange={(e) => { if (e.target.value === '__new') setNewType(true); else f.set('track', e.target.value); }}>{names.map((n) => <option key={n} value={n}>{n}</option>)}<option value="__new">+ Add type…</option></select></label>
      {newType && <div className="ad-field full"><span>New type name</span><div style={{ display: 'flex', gap: 8 }}><input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="e.g. Brush Lettering" autoFocus autoComplete="off" /><Btn type="button" busy={busy} onClick={addType}>Add</Btn><Btn type="button" variant="ghost" onClick={() => setNewType(false)}>Cancel</Btn></div></div>}
      <F form={f} k="price" label="Price (₹)" type="money" rule="money" required /><F form={f} k="sessions" label="Number of classes" rule="digits" required inputMode="numeric" />
      <F form={f} k="gst_mode" label="GST" type="select" required options={GST_MODES} />
      <div className="full"><F form={f} k="description" label="Short description" type="textarea" rule="sentence" rows={3} /></div>
      <div className="full"><F form={f} k="covers" label="What it covers" type="textarea" rule="sentence" hint="One point per line" /></div>
      <div className="full"><F form={f} k="active" label="Show on the website" type="check" /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Confirm onYes={del}>Delete</Confirm>}</div></form>
    {blocked > 0 && <Modal title="This level cannot be deleted" onClose={() => setBlocked(0)}><p style={{ marginTop: 0 }}>It has <b>{blocked}</b> {blocked === 1 ? 'student' : 'students'} on record, and your records and accounts need them. You can hide the level from the website instead. Nothing is lost.</p><div className="ad-actions full"><Btn busy={busy} onClick={hide}>Hide it</Btn><Btn variant="ghost" onClick={() => setBlocked(0)}>Keep it</Btn></div></Modal>}</Modal>);
}

/** The students of one level: payment and details on tap, their class dates on the Classes button. */
function Participants({ level, autoOpen, onClose, onChanged }) {
  const [add, setAdd] = useState(false); const [one, setOne] = useState(null); const [sched, setSched] = useState(null);
  const { data, error, reload } = useLoad(async () => {
    const rows = must(await every(() => sb().from('class_enrolments').select('*,class_levels(title,level)').eq('class_id', level.id).in('status', ['paid', 'pending', 'transferred']).order('created_at').order('id')));
    const sess = must(await every(() => sb().from('class_sessions').select('enrolment_id,on_date,status,time_text,class_enrolments!inner(class_id)').eq('class_enrolments.class_id', level.id).order('on_date').order('id')));
    return { rows, sess };
  }, [level.id]);
  useEffect(() => { if (!autoOpen || !data) return; const x = data.rows.find((r) => r.id === autoOpen); if (x) setSched(x); }, [autoOpen, data]);
  const today = todayISO(); const changed = () => { reload(); onChanged(); };
  const rows = (data?.rows || []).filter((x) => x.status !== 'pending' || x.channel === 'manual');
  const summary = (x) => { const mine = data.sess.filter((s) => s.enrolment_id === x.id && s.status !== 'cancelled'); const done = mine.filter((s) => s.status === 'done').length; const next = mine.find((s) => s.status === 'scheduled' && s.on_date >= today);
    if (!mine.length) return 'No classes scheduled yet'; return `${done} attended${next ? ` · next ${fmtDay(next.on_date)}${next.time_text ? `, ${next.time_text}` : ''}` : mine.every((s) => s.status === 'done') ? ' · all done' : ''}`; };
  return (<Modal title={`Students · ${level.title} (${level.level})`} onClose={onClose} wide>
    {error && <Err e={error} />}{!data && !error && <Spin />}
    {data && <>{rows.length ? <div className="ad-list">{rows.map((x) => <div key={x.id} className="ad-row" style={{ cursor: 'default' }}>
      <button type="button" className="main cls-main" onClick={() => setOne(x)}><b>{nb(x.student_name)}</b><Segs items={[x.student_group === 'child' ? `Child, age ${x.student_age}` : 'Adult', x.student_group === 'child' ? `parent ${x.name}` : '', x.phone]} /><Segs items={['paid', 'transferred'].includes(x.status) ? summary(x) : ['Not paid yet']} /></button>
      <div className="end"><b>{money(x.amount_paise)}</b>{['paid', 'transferred'].includes(x.status) && <Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setSched(x)}>Classes</Btn>}</div></div>)}</div> : <Empty>No students yet.</Empty>}
      <div className="row-actions" style={{ marginTop: 16 }}><Btn icon="plus" onClick={() => setAdd(true)}>Add student</Btn></div></>}
    {add && <AddEnrol level={level} onClose={() => setAdd(false)} onSaved={() => { setAdd(false); changed(); }} />}
    {one && <EnrolModal e={one} onClose={() => setOne(null)} onSaved={() => { setOne(null); changed(); }} />}
    {sched && <OneOnOneModal e={sched} level={level} onClose={() => setSched(null)} onChanged={changed} />}
  </Modal>);
}
