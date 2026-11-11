'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Modal, Btn, F, PhotoField, useForm, useAction, Confirm, fmtD, fmtDT, dmyToISO, isoToDMY, slugify, STATUS_TONE, download } from './kit';
import ImportCsv from './ImportCsv';
import { money, toCSV, rupeesToPaise } from '@/lib/accounting';
import { photo } from '@/lib/photo';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1)); const MINS = ['00', '15', '30', '45'];
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
function toISTParts(iso) {
  if (!iso) return { date: '', h: '10', m: '00', ap: 'AM' };
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  const h24 = +p.hour; const m = Math.round(+p.minute / 15) * 15 % 60;
  return { date: `${p.day}/${p.month}/${p.year}`, h: String(h24 % 12 || 12), m: String(m).padStart(2, '0'), ap: h24 >= 12 ? 'PM' : 'AM' };
}
function fromIST(date, h, m, ap) {
  const iso = dmyToISO(date); if (!iso) return null; let hh = (+h % 12) + (ap === 'PM' ? 12 : 0);
  return new Date(`${iso}T${String(hh).padStart(2, '0')}:${m}:00+05:30`).toISOString();
}

export default function Workshops() {
  const sp = useSearchParams(); const [edit, setEdit] = useState(null); const [att, setAtt] = useState(null); const [tab, setTab] = useState('up'); const [imp, setImp] = useState(false);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const ws = must(await c.from('workshops').select('*').order('starts_at', { ascending: false }));
    const b = must(await c.from('bookings').select('workshop_id,seats,status').in('status', ['paid']));
    const taken = {}; b.forEach((x) => (taken[x.workshop_id] = (taken[x.workshop_id] || 0) + x.seats)); return { ws, taken };
  });
  useEffect(() => { if (sp.get('new')) setEdit({}); }, [sp]);
  if (error) return <Page title="Workshops"><Err e={error} /></Page>; if (!data) return <Page title="Workshops"><Spin /></Page>;
  const now = Date.now(); const up = data.ws.filter((w) => new Date(w.starts_at) >= now && w.status !== 'draft'), drafts = data.ws.filter((w) => w.status === 'draft'), past = data.ws.filter((w) => new Date(w.starts_at) < now && w.status !== 'draft');
  const rows = tab === 'up' ? up.slice().reverse() : tab === 'draft' ? drafts : past;
  return (<Page title="Workshops" action={<><Btn variant="ghost" icon="filein" onClick={() => setImp(true)}>Import</Btn><Btn icon="plus" onClick={() => setEdit({})}>New workshop</Btn></>}>
    <div className="ad-tabsbar">{[['up', `Upcoming (${up.length})`], ['draft', `Drafts (${drafts.length})`], ['past', `Past (${past.length})`]].map(([k, t]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>)}</div>
    <Card tight>{rows.length ? <div className="ad-list">{rows.map((w) => (
      <div key={w.id} className="ad-row" style={{ cursor: 'default' }}>
        {w.image_path ? <img className="ad-thumb" src={photo(w.image_path)} alt="" /> : <div className="ad-thumb" />}
        <div className="main"><b>{w.title}</b><small>{fmtDT(w.starts_at)} · {w.venue_name || 'Venue not set'}</small><small>{data.taken[w.id] || 0} of {w.capacity} seats booked · {money(w.price_paise)}</small></div>
        <div className="end"><Badge tone={STATUS_TONE[w.status]}>{w.status}</Badge><span style={{ display: 'flex', gap: 6 }}><Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setAtt(w)}>Attendees</Btn><Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setEdit(w)}>Edit</Btn></span></div></div>))}</div>
      : <Empty>{tab === 'up' ? 'No upcoming workshops. Tap "New workshop" to add one.' : 'Nothing here.'}</Empty>}</Card>
    {imp && <ImportCsv kind="workshops" onClose={() => setImp(false)} onDone={reload} />}
    {edit && <WorkshopForm w={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    {att && <Attendees w={att} onClose={() => setAtt(null)} />}
  </Page>);
}

function WorkshopForm({ w, onClose, onSaved }) {
  const t = toISTParts(w.starts_at); const isNew = !w.id; const [run, busy] = useAction();
  const f = useForm({ title: w.title || '', kind: w.kind || 'workshop', summary: w.summary || '', description: w.description || '', venue_name: w.venue_name || '', venue_address: w.venue_address || '', map_link: w.map_link || '',
    date: t.date, h: t.h, m: t.m, ap: t.ap, price: w.price_paise != null ? String(w.price_paise / 100) : '', friend: w.friend_price_paise ? String(w.friend_price_paise / 100) : '', capacity: String(w.capacity || 12),
    includes: (w.includes || []).join('\n'), learn: (w.learn || []).join('\n'), note: w.note || '', status: w.status || 'draft', image: w.image_path ? [w.image_path] : [] });
  const save = (e, status) => { e?.preventDefault(); return run(async () => {
    const v = f.v; const starts = fromIST(v.date, v.h, v.m, v.ap); if (!starts) throw new Error('Please enter the date as DD/MM/YYYY.');
    const price = rupeesToPaise(v.price); if (!v.title.trim()) throw new Error('Please add a title.'); if (!(+v.capacity > 0)) throw new Error('Seats must be 1 or more.');
    const row = { title: v.title, kind: v.kind, summary: v.summary || null, description: v.description || null, venue_name: v.venue_name || null, venue_address: v.venue_address || null, map_link: v.map_link || null, starts_at: starts,
      price_paise: price, friend_price_paise: v.friend ? rupeesToPaise(v.friend) : null, capacity: +v.capacity, includes: lines(v.includes), learn: lines(v.learn), note: v.note || null, image_path: v.image[0] || null, status: status || v.status };
    if (isNew) { let slug = slugify(v.title); const tryInsert = async (s) => sb().from('workshops').insert({ ...row, slug: s });
      let r = await tryInsert(slug); if (r.error?.code === '23505') r = await tryInsert(`${slug}-${Math.random().toString(36).slice(2, 6)}`); must(r); }
    else must(await sb().from('workshops').update(row).eq('id', w.id));
    onSaved();
  }, 'Workshop saved'); };
  const remove = () => run(async () => { must(await sb().from('workshops').delete().eq('id', w.id)); onSaved(); }, 'Workshop deleted');
  return (<Modal title={isNew ? 'New workshop' : 'Edit workshop'} onClose={onClose} wide>
    <form onSubmit={(e) => save(e)} className="ad-form">
      <div className="full"><F form={f} k="title" label="Title" rule="title" required /></div>
      <F form={f} k="kind" label="Type" type="select" required options={[['workshop', 'One-day workshop'], ['course', 'Multi-day course']]} />
      <F form={f} k="status" label="Status" type="select" required options={[['draft', 'Draft (hidden)'], ['published', 'Published'], ['cancelled', 'Cancelled']]} />
      <F form={f} k="date" label="Date" type="date" required />
      <div className="ad-field"><span>Time <i> *</i></span><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <select aria-label="Hour" value={f.v.h} onChange={(e) => f.set('h', e.target.value)}>{HOURS.map((x) => <option key={x}>{x}</option>)}</select>
        <select aria-label="Minutes" value={f.v.m} onChange={(e) => f.set('m', e.target.value)}>{MINS.map((x) => <option key={x}>{x}</option>)}</select>
        <select aria-label="AM or PM" value={f.v.ap} onChange={(e) => f.set('ap', e.target.value)}><option>AM</option><option>PM</option></select></div></div>
      <F form={f} k="venue_name" label="Venue" rule="text" required placeholder="e.g. Thin Black Brush Studio" />
      <F form={f} k="venue_address" label="Venue address" rule="text" />
      <F form={f} k="map_link" label="Google Maps link" type="url" />
      <F form={f} k="capacity" label="Seats" rule="digits" required inputMode="numeric" />
      <F form={f} k="price" label="Price per person (₹)" type="money" rule="money" required />
      <F form={f} k="friend" label="Bring-a-friend price per person (₹)" type="money" rule="money" hint="Applies when 2 or more seats are booked together" />
      <div className="full"><F form={f} k="summary" label="One-line summary" rule="sentence" /></div>
      <div className="full"><F form={f} k="description" label="About this workshop" type="textarea" rule="sentence" /></div>
      <F form={f} k="learn" label="What students will learn" type="textarea" rule="sentence" hint="One point per line" />
      <F form={f} k="includes" label="What is included in the kit" type="textarea" rule="sentence" hint="One item per line" />
      <div className="full"><F form={f} k="note" label="Note" rule="sentence" /></div>
      <PhotoField label="Photo" paths={f.v.image} onChange={(p) => f.set('image', p)} folder="workshops" />
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{f.v.status === 'draft' && <Btn type="button" variant="ghost" busy={busy} onClick={() => save(null, 'published')}>Publish</Btn>}
        {!isNew && <Confirm onYes={remove}>Delete</Confirm>}</div>
    </form></Modal>);
}

function Attendees({ w, onClose }) {
  const { data, error } = useLoad(async () => must(await sb().from('bookings').select('*').eq('workshop_id', w.id).eq('status', 'paid').order('created_at')), [w.id]);
  const seats = (data || []).reduce((s, b) => s + b.seats, 0);
  return (<Modal title={`Attendees · ${w.title}`} onClose={onClose} wide>
    {error && <Err e={error} />}{!data && !error && <Spin />}
    {data && <><p className="ad-help" style={{ marginTop: 0 }}>{seats} of {w.capacity} seats booked · {fmtD(w.starts_at)}</p>
      {data.length ? <div className="ad-scroll"><table className="ad-table"><thead><tr><th>Name</th><th>Phone</th><th className="r">Seats</th><th className="r">Paid</th></tr></thead><tbody>{data.map((b) => <tr key={b.id}><td>{b.name}<br /><small className="ad-help">{b.email}</small></td><td><a href={`tel:${b.phone}`}>{b.phone}</a></td><td className="r">{b.seats}</td><td className="r">{money(b.amount_paise)}</td></tr>)}</tbody></table></div> : <Empty>No confirmed bookings yet.</Empty>}
      {data.length > 0 && <div className="ad-actions"><Btn variant="ghost" icon="fileout" onClick={() => download(`${w.slug}-attendees.csv`, toCSV(data, [{ label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Seats', key: 'seats' }, { label: 'Paid', get: (b) => b.amount_paise / 100 }]))}>Export list</Btn></div>}</>}
  </Modal>);
}
