'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { nb, Segs, useLoad, sb, must, every, Page, Card, Fold, Badge, Empty, Spin, Err, Modal, Btn, F, PhotoField, useForm, useAction, Confirm, useToast, fmtD, fmtDT, dmyToISO, isoToDMY, slugify } from './kit';
import { MessageModal, RefundModal, CancelWorkshop } from './WorkshopTools';
import { useClash } from './Clash';
import { slotFromStart } from '@/lib/clash';
import { GST_MODES } from '@/lib/gst';
import { AddSignup, BookingModal } from './ManualEntry';
import { money, rupeesToPaise } from '@/lib/accounting';
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
  const sp = useSearchParams(); const [edit, setEdit] = useState(null); const [att, setAtt] = useState(null);
  const { data, error, reload } = useLoad(async () => {
    const c = sb(); const [ws, b] = await Promise.all([every(() => c.from('workshops').select('*').order('starts_at', { ascending: false }).order('id')), every(() => c.from('bookings').select('workshop_id,seats,status').eq('status', 'paid').order('id'))]);
    const taken = {}; must(b).forEach((x) => (taken[x.workshop_id] = (taken[x.workshop_id] || 0) + x.seats)); return { ws: must(ws), taken };
  });
  useEffect(() => { if (sp.get('new')) setEdit({}); }, [sp]);
  useEffect(() => { const id = sp.get('people'); const w = id && data?.ws.find((x) => x.id === id); if (w) setAtt(w); }, [sp, data]);   // a link from Accounts opens that workshop's participants
  if (error) return <Page title="Workshops"><Err e={error} /></Page>; if (!data) return <Page title="Workshops"><Spin /></Page>;
  // Upcoming: not over yet, drafts last (a draft stays here even after its date). Past: over, or cancelled (a cancelled workshop is never shown on the website).
  const now = Date.now(); const endOf = (w) => new Date(w.kind === 'course' && w.ends_at ? w.ends_at : w.starts_at);
  const isPast = (w) => w.status === 'cancelled' || (w.status !== 'draft' && endOf(w) < now);
  const up = data.ws.filter((w) => !isPast(w)).sort((a, b) => (a.status === 'draft') - (b.status === 'draft') || new Date(a.starts_at) - new Date(b.starts_at));
  const past = data.ws.filter(isPast).sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));
  const line = (w) => (
    <div key={w.id} className="ws-row">
      {w.image_path ? <img className="ad-thumb" src={photo(w.image_path)} alt="" /> : <div className="ad-thumb" />}
      <div className="ws-text"><b>{nb(w.title)}</b><Segs items={[`${fmtDT(w.starts_at)}${w.kind === 'course' && w.ends_at ? ` to ${fmtD(w.ends_at)}` : ''}`, w.venue_name || 'Venue not set']} /><Segs items={[`${data.taken[w.id] || 0} of ${w.capacity} seats booked`, money(w.price_paise)]} /></div>
      <div className="ws-act"><Badge tone={w.status === 'published' ? 'ok' : w.status === 'cancelled' ? 'bad' : ''}>{w.status === 'published' ? 'Published' : w.status === 'cancelled' ? 'Cancelled' : 'Draft'}</Badge><Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setAtt(w)}>Participants</Btn><Btn variant="ghost" className="ad-btn ghost sm" onClick={() => setEdit(w)}>Edit</Btn></div></div>);
  return (<Page title="Workshops" action={<Btn icon="plus" onClick={() => setEdit({})}>New workshop</Btn>}>
    <Card title={`Upcoming (${up.length})`} tight>{up.length ? <div className="ad-list">{up.map(line)}</div> : <Empty>No upcoming workshops. Tap "New workshop" to add one.</Empty>}</Card>
    {past.length > 0 && <Fold title="Past"><div className="ad-list">{past.map(line)}</div></Fold>}
    {edit && <WorkshopForm key={edit.id || `new-${edit.title || ''}`} w={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    {att && <Attendees w={att} taken={data.taken[att.id] || 0} onClose={() => setAtt(null)} onChanged={reload} />}
  </Page>);
}

function WorkshopForm({ w, onClose, onSaved }) {
  const t = toISTParts(w.starts_at); const te = toISTParts(w.ends_at); const isNew = !w.id; const [run, busy] = useAction(); const [check, clashDialog] = useClash(); const [cancelling, setCancelling] = useState(false); const toast = useToast();
  const f = useForm({ title: w.title || '', kind: w.kind || 'workshop', summary: w.summary || '', description: w.description || '', venue_name: w.venue_name || '', venue_address: w.venue_address || '', map_link: w.map_link || '',
    date: t.date, endDate: w.kind === 'course' && w.ends_at ? te.date : '', h: t.h, m: t.m, ap: t.ap, price: w.price_paise != null ? String(w.price_paise / 100) : '', friend: w.friend_price_paise ? String(w.friend_price_paise / 100) : '',
    gst_mode: w.gst_mode || 'none', early: w.early_price_paise != null ? String(w.early_price_paise / 100) : '', earlyUntil: isoToDMY(w.early_until), capacity: String(w.capacity || 12),
    includes: (w.includes || []).join('\n'), learn: (w.learn || []).join('\n'), note: w.note || '', image: w.images?.length ? w.images : w.image_path ? [w.image_path] : [] });
  const status = w.status || 'draft';
  const save = (e, nextStatus) => { e?.preventDefault(); return run(async () => {
    const v = f.v; const starts = fromIST(v.date, v.h, v.m, v.ap); if (!starts) throw new Error('Please enter the date as DD/MM/YYYY.');
    let ends = null; if (v.kind === 'course') { const endISO = dmyToISO(v.endDate); if (!endISO) throw new Error('Please enter the end date as DD/MM/YYYY.'); if (endISO < dmyToISO(v.date)) throw new Error('The end date must be on or after the start date.'); ends = new Date(`${endISO}T20:00:00+05:30`).toISOString(); }
    const price = rupeesToPaise(v.price); if (!v.title.trim()) throw new Error('Please add a title.'); if (!(+v.capacity > 0)) throw new Error('Seats must be 1 or more.');
    if (!isNew) {       // seats cannot be set below what is already sold; people who paid must keep their place
      const paid = must(await sb().from('bookings').select('seats').eq('workshop_id', w.id).eq('status', 'paid')).reduce((t, x) => t + x.seats, 0);
      if (+v.capacity < paid) throw new Error(`${paid} seats are already booked, so seats cannot be less than ${paid}.`); }
    if ((nextStatus || status) === 'published' && new Date(starts) <= new Date()) throw new Error('This date has already passed. A workshop can only be published for a future date and time.');
    if (!!v.early !== !!v.earlyUntil) throw new Error('For an early-bird price, please fill in both the price and the date it ends.');
    let eu = null; if (v.early) { eu = dmyToISO(v.earlyUntil); if (!eu) throw new Error('Please enter the early-bird end date as DD/MM/YYYY.'); if (rupeesToPaise(v.early) >= price) throw new Error('The early-bird price should be lower than the normal price.'); }
    if ((nextStatus || status) !== 'draft') {       // a published workshop must not overlap something else planned (a draft is only a plan)
      const ist = new Date(new Date(starts).getTime() + 5.5 * 3600e3); const first = ist.toISOString().slice(0, 10); const last = ends ? new Date(new Date(ends).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10) : first; const dates = [first];
      for (let d = first; d < last && dates.length < 60;) { const n = new Date(`${d}T00:00:00Z`); n.setUTCDate(n.getUTCDate() + 1); d = n.toISOString().slice(0, 10); dates.push(d); }
      if (!(await check(dates.map((d) => ({ date: d, slot: slotFromStart(ist.getUTCHours() * 60 + ist.getUTCMinutes()), label: `Workshop: ${v.title}` })), { kind: 'workshop', id: w.id }))) return; }
    const row = { title: v.title, kind: v.kind, summary: v.summary || null, description: v.description || null, venue_name: v.venue_name || null, venue_address: v.venue_address || null, map_link: v.map_link || null, starts_at: starts, ends_at: ends,
      price_paise: price, friend_price_paise: v.friend ? rupeesToPaise(v.friend) : null, early_price_paise: v.early ? rupeesToPaise(v.early) : null, early_until: eu, gst_mode: v.gst_mode, capacity: +v.capacity, includes: lines(v.includes), learn: lines(v.learn), note: v.note || null, image_path: v.image[0] || null, images: v.image, status: nextStatus || status };
    if (isNew) { let slug = slugify(v.title); const tryInsert = async (s) => sb().from('workshops').insert({ ...row, slug: s });
      let r = await tryInsert(slug); if (r.error?.code === '23505') r = await tryInsert(`${slug}-${Math.random().toString(36).slice(2, 6)}`); must(r); }
    else {
      must(await sb().from('workshops').update(row).eq('id', w.id));
      const moved = new Date(w.starts_at).getTime() !== new Date(starts).getTime() || (w.venue_name || '') !== (row.venue_name || '');
      if (moved) { const { count } = await sb().from('bookings').select('id', { count: 'exact', head: true }).eq('workshop_id', w.id).eq('status', 'paid');
        if (count > 0) setTimeout(() => toast(`${count} ${count === 1 ? 'booking' : 'bookings'} paid for this workshop. Tell them about the change: Participants, then Message all.`, 'err'), 1800); }       // a changed date or venue is never silent
    }
    onSaved();
  }, nextStatus === 'published' ? 'Workshop published' : nextStatus === 'draft' && !isNew ? 'Workshop unpublished' : 'Workshop saved'); };
  const [blocked, setBlocked] = useState(0);
  const remove = () => run(async () => {
    const { count } = await sb().from('bookings').select('id', { count: 'exact', head: true }).eq('workshop_id', w.id).in('status', ['paid', 'pending', 'refunded', 'transferred']);
    if (count > 0) { setBlocked(count); return; }                                           // it has bookings: offer to hide it instead of failing
    must(await sb().from('workshops').delete().eq('id', w.id)); onSaved(); }, 'Workshop deleted');
  const hide = () => run(async () => { must(await sb().from('workshops').update({ status: 'draft' }).eq('id', w.id)); onSaved(); }, 'Workshop hidden from the website');
  const course = f.v.kind === 'course';
  return (<Modal title={isNew ? 'New workshop' : 'Edit workshop'} onClose={onClose} wide>
    <form onSubmit={(e) => save(e)} className="ad-form">
      <div className="full"><F form={f} k="title" label="Title" rule="title" required /></div>
      <F form={f} k="kind" label="Type" type="select" required options={[['workshop', 'One-day workshop'], ['course', 'Multi-day course']]} />
      <div className="ad-field"><span>Time <i> *</i></span><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <select aria-label="Hour" value={f.v.h} onChange={(e) => f.set('h', e.target.value)}>{HOURS.map((x) => <option key={x}>{x}</option>)}</select>
        <select aria-label="Minutes" value={f.v.m} onChange={(e) => f.set('m', e.target.value)}>{MINS.map((x) => <option key={x}>{x}</option>)}</select>
        <select aria-label="AM or PM" value={f.v.ap} onChange={(e) => f.set('ap', e.target.value)}><option>AM</option><option>PM</option></select></div></div>
      <F form={f} k="date" label={course ? 'Start date' : 'Date'} type="date" required />{course && <F form={f} k="endDate" label="End date" type="date" required />}
      <F form={f} k="venue_name" label="Venue" rule="text" required placeholder="e.g. Thin Black Brush Studio" />
      <F form={f} k="venue_address" label="Venue address" rule="text" />
      <F form={f} k="map_link" label="Google Maps link" type="url" />
      <F form={f} k="capacity" label="Seats" rule="digits" required inputMode="numeric" />
      <F form={f} k="price" label="Price per person (₹)" type="money" rule="money" required />
      <F form={f} k="friend" label="Bring-a-friend price per person (₹)" type="money" rule="money" hint="Applies when 2 or more seats are booked together" />
      <F form={f} k="gst_mode" label="GST" type="select" required options={GST_MODES} />
      <F form={f} k="early" label="Early-bird price per person (₹)" type="money" rule="money" hint="Optional. Lower than the normal price" />
      <F form={f} k="earlyUntil" label="Early-bird ends on" type="date" hint="Last day the early-bird price is offered" />
      <div className="full"><F form={f} k="summary" label="One-line summary" rule="sentence" /></div>
      <div className="full"><F form={f} k="description" label="About this workshop" type="textarea" rule="sentence" /></div>
      <F form={f} k="learn" label="What participants will learn" type="textarea" rule="sentence" hint="One point per line" />
      <F form={f} k="includes" label="What is included in the kit" type="textarea" rule="sentence" hint="One item per line" />
      <div className="full"><F form={f} k="note" label="Note" rule="sentence" /></div>
      <PhotoField label="Photos" paths={f.v.image} onChange={(p) => f.set('image', p)} folder="workshops" max={8} />
      <div className="ad-actions full"><Btn busy={busy} icon="check">{isNew ? 'Save draft' : 'Save'}</Btn>
        {status === 'published' ? <Btn type="button" variant="ghost" busy={busy} onClick={() => save(null, 'draft')}>Unpublish</Btn> : status === 'cancelled' ? <Btn type="button" variant="ghost" busy={busy} onClick={() => save(null, 'draft')}>Reopen as draft</Btn> : <Btn type="button" variant="ghost" busy={busy} onClick={() => save(null, 'published')}>Publish</Btn>}
        {!isNew && status !== 'cancelled' && <Btn type="button" variant="ghost" onClick={() => setCancelling(true)}>Cancel workshop</Btn>}
        {!isNew && <Confirm onYes={remove}>Delete</Confirm>}</div>
    </form>
    {cancelling && <CancelWorkshop w={w} onClose={() => setCancelling(false)} onDone={onSaved} />}
    {clashDialog}
    {blocked > 0 && <Modal title="This workshop cannot be deleted" onClose={() => setBlocked(0)}><p style={{ marginTop: 0 }}>It has <b>{blocked}</b> {blocked === 1 ? 'booking' : 'bookings'}, and your records and accounts need them. You can hide the workshop from the website instead. Nothing is lost.</p><div className="ad-actions full"><Btn busy={busy} onClick={hide}>Hide it</Btn><Btn variant="ghost" onClick={() => setBlocked(0)}>Keep it</Btn></div></Modal>}</Modal>);
}

function Attendees({ w, taken, onClose, onChanged }) {
  const [add, setAdd] = useState(false); const [one, setOne] = useState(null); const [msg, setMsg] = useState(null); const [refund, setRefund] = useState(false);
  const { data, error, reload } = useLoad(async () => must(await sb().from('bookings').select('*,workshops(title,starts_at)').eq('workshop_id', w.id).in('status', ['paid', 'pending', 'transferred']).order('created_at')), [w.id]);
  const rows = (data || []).filter((b) => b.status !== 'pending' || b.channel === 'manual'); const seats = rows.filter((b) => b.status === 'paid').reduce((s, b) => s + b.seats, 0); const left = Math.max(0, w.capacity - seats);
  const changed = () => { reload(); onChanged(); };
  return (<Modal title={`Participants · ${w.title}`} onClose={onClose} wide>
    {error && <Err e={error} />}{!data && !error && <Spin />}
    {data && <><p className="ad-help" style={{ marginTop: 0 }}>{seats} of {w.capacity} seats booked · {left} free · {fmtD(w.starts_at)}</p>
      {rows.length ? <div className="ad-list">{rows.map((b) => <button key={b.id} className="ad-row" onClick={() => setOne(b)}><div className="main"><b>{nb(b.name)}</b><Segs items={[b.phone, b.email]} /></div><div className="end"><b>{money(b.amount_paise)}</b><small className="nw">{b.seats} {b.seats > 1 ? 'seats' : 'seat'}</small><Badge tone={b.status === 'paid' ? 'ok' : b.status === 'pending' ? 'warn' : ''}>{b.status === 'pending' ? 'not paid' : b.status}</Badge></div></button>)}</div> : <Empty>No participants yet.</Empty>}
      <div className="ad-actions full"><Btn icon="plus" onClick={() => setAdd(true)}>Add sign-up</Btn>{rows.some((b) => b.status === 'paid') && <Btn variant="ghost" icon="mail" onClick={() => setMsg({ audience: 'workshop', id: w.id, title: w.title, people: rows.filter((b) => b.status === 'paid') })}>Message all</Btn>}
        {rows.some((b) => b.status === 'paid') && w.status !== 'cancelled' && <Btn variant="ghost" icon="wallet" className="ad-btn ghost danger-text wrapbtn" onClick={() => setRefund(true)}>Cancel and refund everyone</Btn>}</div></>}
    {msg && <MessageModal {...msg} onClose={() => setMsg(null)} />}
    {refund && <RefundModal workshop={w} bookings={rows} onClose={() => setRefund(false)} onDone={() => { changed(); }} />}
    {add && <AddSignup w={w} taken={seats} onClose={() => setAdd(false)} onSaved={() => { setAdd(false); changed(); }} />}
    {one && <BookingModal b={one} onClose={() => setOne(null)} onSaved={() => { setOne(null); changed(); }} />}
  </Modal>);
}
