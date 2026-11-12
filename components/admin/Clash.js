'use client';
// "Something is already planned then": before a class, workshop, event or rent-out is saved, check what else is on the same day at the same time.
// If something overlaps, show it and ask whether to add anyway. If the check itself cannot run, saving is never blocked.
import { useState } from 'react';
import { sb, every, Modal, Btn } from './kit';
import { findClashes, parseSlot, slotFromStart, describeSlot } from '@/lib/clash';
import { fmtDay, addDays } from '@/lib/dates';

const ist = (iso) => { const d = new Date(new Date(iso).getTime() + 5.5 * 3600e3); return { date: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() }; };
const days = (a, b) => { const out = []; for (let d = a, n = 0; d <= b && n < 120; d = addDays(d, 1), n++) out.push(d); return out; };

/** Everything already planned on the given days: [{ kind, id, date, slot, label }]. */
export async function itemsOn(dates) {
  const from = dates[0], to = dates[dates.length - 1]; const back = addDays(from, -60); const c = sb(); const want = new Set(dates); const out = [];
  const [w, s, e, r] = await Promise.all([
    every(() => c.from('workshops').select('id,title,kind,starts_at,ends_at').neq('status', 'cancelled').gte('starts_at', `${back}T00:00:00+05:30`).lte('starts_at', `${to}T23:59:59+05:30`).order('id')),
    every(() => c.from('class_sessions').select('id,on_date,time_text,class_enrolments(student_name)').gte('on_date', from).lte('on_date', to).neq('status', 'cancelled').order('id')),
    every(() => c.from('events').select('id,title,on_date,end_date,time_text').gte('on_date', back).lte('on_date', to).order('id')),
    every(() => c.from('rentouts').select('id,name,on_date,end_date,time_text').gte('on_date', back).lte('on_date', to).order('id'))]);
  for (const x of w.data || []) { const st = ist(x.starts_at); const last = x.kind === 'course' && x.ends_at ? ist(x.ends_at).date : st.date; for (const d of days(st.date, last)) if (want.has(d)) out.push({ kind: 'workshop', id: x.id, date: d, slot: slotFromStart(st.min), label: `Workshop: ${x.title}` }); }
  for (const x of s.data || []) out.push({ kind: 'class', id: x.id, date: x.on_date, slot: parseSlot(x.time_text), label: `Class: ${x.class_enrolments?.student_name || 'student'}` });
  for (const x of e.data || []) for (const d of days(x.on_date, x.end_date && x.end_date > x.on_date ? x.end_date : x.on_date)) if (want.has(d)) out.push({ kind: 'event', id: x.id, date: d, slot: parseSlot(x.time_text), label: `Event: ${x.title}` });
  for (const x of r.data || []) for (const d of days(x.on_date, x.end_date && x.end_date > x.on_date ? x.end_date : x.on_date)) if (want.has(d)) out.push({ kind: 'rentout', id: x.id, date: d, slot: parseSlot(x.time_text) || { start: 0, end: 1440 }, label: `Rent-out: ${x.name}` });
  return out;
}

/** const [check, dialog] = useClash();  ...  if (!(await check([{ date, slot, label }], { kind, id }))) return;  ...  render {dialog}
 *  check() resolves true when there is no clash or the owner chose "Add anyway"; false when they chose to go back. `ignore` skips the item being edited. */
export function useClash() {
  const [ask, setAsk] = useState(null);
  const check = async (cands, ignore = {}) => {
    const list = (cands || []).filter((x) => x.date && x.slot); if (!list.length) return true;
    let others = []; try { others = await itemsOn([...new Set(list.map((x) => x.date))].sort()); } catch { return true; }
    others = others.filter((o) => !(ignore.kind === o.kind && ignore.id === o.id));
    const hits = []; for (const cand of list) for (const o of findClashes(cand, others)) hits.push({ cand, o });
    if (!hits.length) return true;
    return new Promise((resolve) => setAsk({ hits, resolve }));
  };
  const done = (yes) => { ask.resolve(yes); setAsk(null); };
  const dialog = ask ? (<Modal title="Already something then" onClose={() => done(false)}>
    <p style={{ marginTop: 0 }}>{ask.hits[0].cand.label ? <b>{ask.hits[0].cand.label}</b> : 'This'} falls at the same time as:</p>
    <div className="ad-list">{ask.hits.slice(0, 6).map((h, i) => <div key={i} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{h.o.label}</b><small>{fmtDay(h.o.date)} · {describeSlot(h.o.slot)}</small></div></div>)}</div>
    {ask.hits.length > 6 && <p className="ad-help">…and {ask.hits.length - 6} more.</p>}
    <div className="ad-actions full"><Btn onClick={() => done(true)}>Add anyway</Btn><Btn variant="ghost" onClick={() => done(false)}>Go back</Btn></div></Modal>) : null;
  return [check, dialog];
}
