'use client';
import { useState } from 'react';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Modal, Btn, F, useForm, useAction, Confirm, slugify } from './kit';
import ImportCsv from './ImportCsv';
import { money, rupeesToPaise } from '@/lib/accounting';
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
export default function Classes() {
  const [edit, setEdit] = useState(null); const [imp, setImp] = useState(false);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [l, e] = await Promise.all([c.from('class_levels').select('*').order('sort_order'), c.from('class_enrolments').select('class_id').eq('status', 'paid')]);
    const n = {}; must(e).forEach((x) => (n[x.class_id] = (n[x.class_id] || 0) + 1)); return { levels: must(l), n };
  });
  if (error) return <Page title="Classes"><Err e={error} /></Page>; if (!data) return <Page title="Classes"><Spin /></Page>;
  return (<Page title="Classes" action={<><Btn variant="ghost" icon="filein" onClick={() => setImp(true)}>Import</Btn><Btn icon="plus" onClick={() => setEdit({})}>Add level</Btn></>}>
    <p className="ad-help" style={{ marginTop: 0, marginBottom: 14 }}>These are the levels people can pay for on the Writing Classes page. Change a price here and the website updates within a minute.</p>
    <Card tight>{data.levels.length ? <div className="ad-list">{data.levels.map((c) => (
      <button key={c.id} className="ad-row" onClick={() => setEdit(c)}><div className="main"><b>{c.title}, {c.level}</b><small>{c.track === 'calligraphy' ? 'Handwriting + Calligraphy' : 'Handwriting'} · {c.sessions} classes · {data.n[c.id] || 0} enrolled</small></div>
        <div className="end"><b>{money(c.price_paise)}</b>{!c.active && <Badge>Hidden</Badge>}</div></button>))}</div> : <Empty>No levels yet.</Empty>}</Card>
    {imp && <ImportCsv kind="classes" onClose={() => setImp(false)} onDone={reload} />}
    {edit && <Form c={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
  </Page>);
}
function Form({ c, onClose, onSaved }) {
  const isNew = !c.id; const [run, busy] = useAction();
  const f = useForm({ title: c.title || '', level: c.level || '', track: c.track || 'handwriting', description: c.description || '', covers: (c.covers || []).join('\n'), price: c.price_paise != null ? String(c.price_paise / 100) : '', sessions: String(c.sessions || 8), active: c.active ?? true, sort: String(c.sort_order ?? 10) });
  const save = (e) => { e.preventDefault(); return run(async () => {
    const v = f.v; if (!v.title.trim() || !v.level.trim()) throw new Error('Please add a title and a level.'); if (!v.price) throw new Error('Please add a price.');
    const row = { title: v.title, level: v.level, track: v.track, description: v.description || null, covers: lines(v.covers), price_paise: rupeesToPaise(v.price), sessions: Math.max(1, parseInt(v.sessions || '8', 10)), active: v.active, sort_order: parseInt(v.sort || '0', 10) };
    if (isNew) { const base = slugify(`${v.track}-${v.level}`); let r = await sb().from('class_levels').insert({ ...row, slug: base }); if (r.error?.code === '23505') r = await sb().from('class_levels').insert({ ...row, slug: `${base}-${Math.random().toString(36).slice(2, 5)}` }); must(r); }
    else must(await sb().from('class_levels').update(row).eq('id', c.id)); onSaved();
  }, 'Saved'); };
  const del = () => run(async () => { must(await sb().from('class_levels').delete().eq('id', c.id)); onSaved(); }, 'Deleted');
  return (<Modal title={isNew ? 'Add level' : 'Edit level'} onClose={onClose} wide>
    <form onSubmit={save} className="ad-form">
      <F form={f} k="title" label="Course name" rule="title" required /><F form={f} k="level" label="Level" rule="title" required placeholder="e.g. Level 1" />
      <F form={f} k="track" label="Type" type="select" required options={[['handwriting', 'Handwriting'], ['calligraphy', 'Handwriting + Calligraphy']]} />
      <F form={f} k="price" label="Price (₹)" type="money" rule="money" required /><F form={f} k="sessions" label="Number of classes" rule="digits" required inputMode="numeric" /><F form={f} k="sort" label="Order on the page" rule="digits" inputMode="numeric" hint="Smaller numbers come first" />
      <div className="full"><F form={f} k="description" label="Short description" type="textarea" rule="sentence" rows={3} /></div>
      <div className="full"><F form={f} k="covers" label="What it covers" type="textarea" rule="sentence" hint="One point per line" /></div>
      <div className="full"><F form={f} k="active" label="Show on the website" type="check" /></div>
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Confirm onYes={del}>Delete</Confirm>}</div></form></Modal>);
}
