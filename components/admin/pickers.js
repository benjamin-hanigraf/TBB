'use client';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { sb, must, every, useLoad, Modal, Btn, useAction } from './kit';
import { RULES } from '@/lib/format';

export const digits10 = (s) => String(s || '').replace(/\D/g, '').slice(-10);
export const FIELDS = ['name', 'email', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'pincode'];

export const useCustomers = () => useLoad(async () => must(await every(() => sb().from('customers').select('id,name,email,phone,address_line1,address_line2,city,state,pincode,created_at').order('name').order('id'))));

/** Finds this person by email or phone and fills any empty details; adds them as a new customer if they are not in the list yet. */
const nameKey = (n) => String(n || '').toLowerCase().replace(/\s+/g, ' ').trim();
/** Two records are the same person when the names match and neither email nor phone contradicts the other (a name-only record is completed by the fuller one). */
const sameName = (a, b) => { if (!nameKey(a.name) || nameKey(a.name) !== nameKey(b.name)) return false; const ea = (a.email || '').toLowerCase(), eb = (b.email || '').toLowerCase(); const pa = digits10(a.phone), pb = digits10(b.phone);
  return !(ea && eb && ea !== eb) && !(pa.length === 10 && pb.length === 10 && pa !== pb); };
export async function ensureCustomer(c, source = 'manual') {
  const name = RULES.name.done(c.name || ''); const email = RULES.email.done(c.email || '') || null; const ph = digits10(c.phone); if (!name && !email && ph.length < 10) return null;
  const all = must(await every(() => sb().from('customers').select('*').order('id')));
  const found = all.find((x) => email && x.email === email) || all.find((x) => ph.length === 10 && digits10(x.phone) === ph) || all.find((x) => sameName(x, { name, email, phone: c.phone }));       // the same name with no contradicting contact is the same person
  const extra = Object.fromEntries(FIELDS.slice(3).map((k) => [k, c[k] || null]));
  if (found) { const patch = {}; for (const k of [...FIELDS.slice(1), ...FIELDS.slice(3)]) { const v = k === 'email' ? email : k === 'phone' ? c.phone : extra[k]; if (v && !found[k]) patch[k] = v; } if (Object.keys(patch).length) must(await sb().from('customers').update(patch).eq('id', found.id)); return found; }
  return must(await sb().from('customers').insert({ name: name || email || c.phone, email, phone: c.phone || null, ...extra, source }).select().single());
}

/** Name box that suggests customers while you type. onPick fills the other fields; onAddNew saves the typed name as a new customer.
 *  Keyboard: Down / Up move through the suggestions, Enter picks the highlighted one, Esc closes the list, Tab leaves the box.
 *  The list is placed with fixed coordinates (opening upwards when there is no room below), so no card, fold or pop-up can clip it. */
export function CustomerSuggest({ label = 'Customer name', value, onType, onPick, onAddNew, required, customers }) {
  const [open, setOpen] = useState(false); const [act, setAct] = useState(-1); const [pos, setPos] = useState(null); const box = useRef(); const inp = useRef(); const list = useRef(); const uid = useId();
  const q = (value || '').trim().toLowerCase();
  const hits = useMemo(() => (q.length < 1 ? [] : (customers || []).filter((c) => `${c.name} ${c.email || ''} ${c.phone || ''}`.toLowerCase().includes(q)).slice(0, 6)), [q, customers]);
  const exact = (customers || []).some((c) => c.name.toLowerCase() === q);
  const items = [...hits.map((c) => ({ c })), ...(!exact && onAddNew && q ? [{ add: true }] : [])];
  const show = open && !!q && items.length > 0;
  const place = () => { const r = inp.current?.getBoundingClientRect(); if (!r) return; const below = window.innerHeight - r.bottom, above = r.top; const up = below < 230 && above > below;
    setPos({ left: r.left, width: r.width, ...(up ? { bottom: window.innerHeight - r.top + 4, maxHeight: Math.max(120, Math.min(300, above - 12)) } : { top: r.bottom + 4, maxHeight: Math.max(120, Math.min(300, below - 12)) }) }); };
  useLayoutEffect(() => { if (!show) return; place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true); return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); }; /* eslint-disable-next-line */ }, [show, value]);
  useEffect(() => { const h = (e) => { if (box.current && !box.current.contains(e.target) && !list.current?.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); document.addEventListener('touchstart', h); return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); }; }, []);
  useEffect(() => { if (show && act >= 0) document.getElementById(`${uid}-${act}`)?.scrollIntoView({ block: 'nearest' }); }, [act, show, uid]);
  const choose = (i) => { const it = items[i]; if (!it) return; if (it.add) onAddNew(value.trim()); else onPick(it.c); setOpen(false); setAct(-1); };
  const key = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!items.length || !q) return; e.preventDefault(); if (!show) { setOpen(true); setAct(e.key === 'ArrowDown' ? 0 : items.length - 1); return; } const d = e.key === 'ArrowDown' ? 1 : -1; setAct((a) => (a < 0 ? (d > 0 ? 0 : items.length - 1) : (a + d + items.length) % items.length)); }
    else if (e.key === 'Enter' && show && act >= 0) { e.preventDefault(); e.stopPropagation(); choose(act); }          // picks the highlighted suggestion instead of submitting the form
    else if (e.key === 'Escape' && show) { e.preventDefault(); e.stopPropagation(); setOpen(false); setAct(-1); }       // closes the list only, not the window behind it
    else if (e.key === 'Tab') setOpen(false);
  };
  return (<div className="ad-field suggest" ref={box}><span>{label}{required ? <i> *</i> : <em> (optional)</em>}</span>
    <input ref={inp} value={value} required={required} autoComplete="off" data-lpignore="true" role="combobox" aria-autocomplete="list" aria-expanded={show} aria-controls={`${uid}-list`} aria-activedescendant={show && act >= 0 ? `${uid}-${act}` : undefined}
      onFocus={() => setOpen(true)} onKeyDown={key} onChange={(e) => { onType(RULES.name.typing(e.target.value)); setOpen(true); setAct(-1); }} onBlur={(e) => onType(RULES.name.done(e.target.value))} />
    {show && pos && <div className="suggest-list" id={`${uid}-list`} role="listbox" ref={list} style={pos}>
      {items.map((it, i) => it.add
        ? <button type="button" key="add" id={`${uid}-${i}`} role="option" aria-selected={act === i} tabIndex={-1} className={`addnew ${act === i ? 'on' : ''}`} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setAct(i)} onClick={() => choose(i)}>+ Add “{value.trim()}” as a new customer</button>
        : <button type="button" key={it.c.id} id={`${uid}-${i}`} role="option" aria-selected={act === i} tabIndex={-1} className={act === i ? 'on' : ''} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setAct(i)} onClick={() => choose(i)}><b>{it.c.name}</b><small>{[it.c.phone, it.c.email].filter(Boolean).join(' · ')}</small></button>)}</div>}
  </div>);
}

/** Merge several customer rows into one. Used from the Customers page and when a duplicate is noticed. */
export async function mergeCustomers(rows) {
  const sorted = [...rows].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')); const [keep, ...rest] = sorted; const patch = {};
  for (const k of [...FIELDS, 'gstin', 'user_id']) { const v = [keep, ...rest].map((x) => x[k]).find(Boolean); if (v && v !== keep[k]) patch[k] = v; }
  if ([keep, ...rest].some((x) => x.marketing_opt_in) && !keep.marketing_opt_in) patch.marketing_opt_in = true;
  const notes = [...new Set([keep, ...rest].map((x) => x.notes).filter(Boolean))].join('\n'); if (notes && notes !== keep.notes) patch.notes = notes;
  for (const r of rest) must(await sb().from('customers').delete().eq('id', r.id));          // remove the copies first so a shared email can move onto the kept row
  if (Object.keys(patch).length) must(await sb().from('customers').update(patch).eq('id', keep.id));
  return keep;
}
export function findDuplicates(rows) {
  const parent = new Map(rows.map((r) => [r.id, r.id])); const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
  const link = (a, b) => parent.set(find(a), find(b)); const byE = new Map(), byP = new Map();
  for (const r of rows) { const e = (r.email || '').toLowerCase(); if (e) { if (byE.has(e)) link(r.id, byE.get(e)); else byE.set(e, r.id); } const p = digits10(r.phone); if (p.length === 10) { if (byP.has(p)) link(r.id, byP.get(p)); else byP.set(p, r.id); } }
  const byN = new Map(); for (const r of rows) { const k = nameKey(r.name); if (!k) continue; for (const o of byN.get(k) || []) if (sameName(r, o)) link(r.id, o.id); (byN.get(k) || byN.set(k, []).get(k)).push(r); }       // same name, nothing contradicting
  const groups = new Map(); for (const r of rows) { const g = find(r.id); (groups.get(g) || groups.set(g, []).get(g)).push(r); }
  return [...groups.values()].filter((g) => g.length > 1);
}
export function MergeModal({ groups, onClose, onDone }) {
  const [run, busy] = useAction(); const [ask, setAsk] = useState(null);
  return (<Modal title="Possible duplicates" onClose={onClose}>
    <p className="ad-help" style={{ marginTop: 0 }}>These customers share a name, an email address or a phone number. Merging keeps one customer with all the details.</p>
    {groups.map((g, i) => <div key={i} className="ad-card" style={{ background: '#f5f5f7' }}>{g.map((c) => <p key={c.id} style={{ margin: '4px 0' }}><b>{c.name}</b><br /><small className="ad-help">{[c.phone, c.email].filter(Boolean).join(' · ')}</small></p>)}
      <Btn variant="ghost" icon="user" onClick={() => setAsk(g)}>Merge these {g.length}</Btn></div>)}
    {!groups.length && <p className="ad-empty">No duplicates found.</p>}
    {ask && <Modal title="Merge customers?" onClose={() => setAsk(null)}><p style={{ marginTop: 0 }}>{ask.length} customers will become one: <b>{[...ask].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))[0].name}</b>. The others are removed and their details are kept. This cannot be undone.</p>
      <div className="ad-actions full"><Btn busy={busy} onClick={() => run(async () => { await mergeCustomers(ask); setAsk(null); onDone(); }, 'Merged')}>Merge</Btn><Btn variant="ghost" onClick={() => setAsk(null)}>Cancel</Btn></div></Modal>}
  </Modal>);
}
