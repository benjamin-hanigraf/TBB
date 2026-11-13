'use client';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { adminClient } from '@/lib/supabase-admin';
import { RULES } from '@/lib/format';
import Icon from '@/components/Icons';

export const sb = () => adminClient();
export const must = (r) => { if (r.error) throw r.error; return r.data; };
/** Reads every row, 1000 at a time (Supabase returns at most 1000 rows per request). make() must build the query fresh each time.
 *  Gives back the same { data, error } shape as a normal query, so it works with must(). Add an order so pages do not overlap. */
export async function every(make) {
  const out = [];
  for (let from = 0; ; from += 1000) { const r = await make().range(from, from + 999); if (r.error) return { data: null, error: r.error }; const d = r.data || []; out.push(...d); if (d.length < 1000) return { data: out, error: null }; }
}

/** Loads data and lets you reload it. fn must return a promise. The last result is kept in memory, so going back to a page shows it at once while fresh data loads. */
const CACHE = new Map();
export const clearCache = () => CACHE.clear();
export function useLoad(fn, deps = []) {
  const key = fn.toString() + JSON.stringify(deps);
  const [data, setData] = useState(() => (CACHE.has(key) ? CACHE.get(key) : null)); const [error, setError] = useState(null); const [tick, setTick] = useState(0); const [fresh, setFresh] = useState(false);
  useEffect(() => { let on = true; setError(null); setFresh(false); if (CACHE.has(key)) setData(CACHE.get(key)); else setData(null);
    Promise.resolve().then(fn).then((d) => { CACHE.set(key, d); if (on) { setData(d); setFresh(true); } }).catch((e) => on && setError(e)); return () => { on = false; }; /* eslint-disable-next-line */ }, [tick, key]);
  // fresh = the data just came from the database (not the remembered copy). A form that starts from the data should wait for it, or it would start from an old copy.
  return { data, error, fresh, loading: data === null && !error, reload: useCallback(() => setTick((t) => t + 1), []) };
}

// ---------- toasts ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [t, setT] = useState(null); const timer = useRef();
  const show = useCallback((msg, kind = 'ok') => { setT({ msg, kind }); clearTimeout(timer.current); timer.current = setTimeout(() => setT(null), 3500); }, []);
  return <ToastCtx.Provider value={show}>{children}{t && <div className={`ad-toast ${t.kind}`} role="status" aria-live="polite">{t.msg}</div>}</ToastCtx.Provider>;
}
export function useAction() {            // wraps a save/delete so errors become a toast and double clicks are blocked
  const toast = useToast(); const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn, okMsg) => { if (busy) return; setBusy(true); try { const r = await fn(); if (okMsg) toast(okMsg); return r ?? true; } catch (e) { console.error(e); toast(e?.message || 'Something went wrong.', 'err'); return false; } finally { setBusy(false); } }, [busy, toast]);
  return [run, busy];
}

// ---------- layout pieces ----------
export const Page = ({ title, action, actionClass = '', children, back }) => (
  <div className="ad-page"><header className="ad-head">{back && <a className="ad-back" href={back} aria-label="Back"><Icon n="left" /></a>}<h1>{title}</h1><div className={`ad-act ${actionClass}`}>{action}</div></header>{children}</div>);
export const Card = ({ title, children, action, tight }) => (<section className={`ad-card ${tight ? 'tight' : ''}`}>{(title || action) && <div className="ad-card-h"><h2>{title}</h2>{action}</div>}{children}</section>);
/** A card whose title is a button with a down arrow: tap to open or close. The contents stay on the page while closed, so a form keeps what was typed. */
export function Fold({ title, children, open: start = false, tight = true, big = false }) {
  const [open, setOpen] = useState(start);
  return (<section className={`ad-fold ${open ? 'open' : ''} ${big ? 'big' : ''}`}>
    <button type="button" className="ad-fold-h" aria-expanded={open} onClick={() => setOpen(!open)}><h2>{title}</h2><Icon n="chevdown" size={18} /></button>
    <div className={`ad-fold-b ${tight ? '' : 'pad'}`} hidden={!open}>{children}</div></section>);
}
export const Stat = ({ label, value, sub, tone }) => (<div className={`ad-stat ${tone || ''}`}><span>{label}</span><b>{value}</b>{sub && <em>{sub}</em>}</div>);
/** Keeps hyphenated words whole in lists ("pre-order" never splits across two lines) by using a hyphen that does not allow a break. */
export const nb = (s) => (typeof s === 'string' ? s.replace(/(\p{L})-(?=\p{L})/gu, '$1\u2011') : s);
/** The small detail line under a list item. Each detail is kept whole: when the line is too narrow, a whole detail moves to the next line instead of splitting ("3 in" / "stock"). */
export function Segs({ items, className = '' }) {
  const parts = items.filter((x) => x !== null && x !== undefined && x !== false && x !== '');
  if (!parts.length) return null;
  return <small className={`segs ${className}`}>{parts.map((t, i) => <span key={i} className={`seg ${String(t).length > 26 ? 'w' : ''}`}>{typeof t === 'string' && !/[@/]/.test(t) ? nb(t) : t}</span>)}</small>;
}
export const Badge = ({ children, tone = '' }) => <span className={`ad-badge ${tone}`}>{children}</span>;
export const Empty = ({ children }) => <p className="ad-empty">{children}</p>;
export const Dots = () => <span className="ad-dotsload" role="status" aria-label="Loading"><i /><i /><i /></span>;
export const Spin = () => <div className="ad-empty"><Dots /></div>;
export const Err = ({ e }) => <p className="ad-err" role="alert">{e?.message || 'Could not load. Please check your connection and try again.'}</p>;
// Buttons that sit together all carry an icon: a button with a common label gets its icon automatically (pass icon={null} for none).
const ICON_FOR = { cancel: 'close', close: 'close', 'keep it': 'close', clear: 'close', 'keep separate': 'close', back: 'left', done: 'check', save: 'check', 'save draft': 'check', 'save payment': 'check', 'save settings': 'check', confirm: 'check', 'confirm paid': 'check', 'confirm shipped': 'check', merge: 'check', edit: 'edit', delete: 'trash', remove: 'trash', add: 'plus', 'add payment': 'plus', 'add item': 'plus', 'add label': 'plus', 'add product': 'plus', 'add level': 'plus', 'add class': 'plus', 'add student': 'plus', 'add sign-up': 'plus', 'add order': 'plus', 'add customer': 'plus', 'add photo': 'plus', new: 'plus', publish: 'send', unpublish: 'circle', 'hide it': 'circle', 'cancel workshop': 'close', 'cancel order': 'close', 'reopen as draft': 'edit', 'select all': 'listcheck', today: 'calendar', print: 'print', email: 'mail', 'send reminder': 'mail', 'message all': 'mail', refund: 'wallet', 'undo shipped': 'left', 'not paid': 'circle', shipped: 'box', 'mark as paid': 'check', 'reload': 'arrow', 'try again': 'arrow', transfer: 'send', receipt: 'file', pdf: 'file', whatsapp: 'whatsapp', attended: 'circlecheck', restore: 'left', undo: 'left', move: 'send', 'choose photo': 'upload', 'download pdf': 'download', send: 'send', participants: 'user', 'cancel and refund': 'wallet', 'cancel without refunds': 'close', 'add anyway': 'plus', 'go back': 'left' };
const autoIcon = (children) => (typeof children === 'string' ? ICON_FOR[children.trim().toLowerCase()] : undefined);
export const Btn = ({ icon, children, variant = '', busy, ...p }) => { const ic = icon === undefined ? autoIcon(children) : icon; return (<button className={`ad-btn ${variant}`} disabled={busy || p.disabled} {...p}>{ic && <Icon n={ic} size={16} />}<span>{children}</span></button>); };

// Several windows can be open at once (a window can open another one, or close its parent). The page behind is frozen while at least one is open,
// and freed again only when the last one closes, in whatever order they close.
let locks = 0;
const lockPage = () => { if (locks++ === 0) document.documentElement.classList.add('ad-lock'); };
const unlockPage = () => { locks = Math.max(0, locks - 1); if (locks === 0) document.documentElement.classList.remove('ad-lock'); };
// Swipe back (left to right) closes the top-most window first, then goes up one level. Windows and views register here.
export const backStack = [];
export function useBack(fn) { const f = useRef(fn); f.current = fn; useEffect(() => { const h = { close: () => f.current() }; backStack.push(h); return () => { const i = backStack.indexOf(h); if (i >= 0) backStack.splice(i, 1); }; }, []); }
export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(); useBack(onClose);
  useEffect(() => { lockPage(); ref.current?.focus(); return unlockPage; }, []);
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);
  return (<div className="ad-modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`ad-modal ${wide ? 'ad-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
      <div className="ad-modal-h"><h2>{title}</h2><button className="ad-x" onClick={onClose} aria-label="Close">✕</button></div><div className="ad-modal-b">{children}</div></div></div>);
}
export function Confirm({ children, onYes, label, icon: iconProp, className = '', ...p }) {
  const icon = iconProp === undefined ? autoIcon(children) : iconProp;
  const [ask, setAsk] = useState(false); const t = useRef();
  useEffect(() => () => clearTimeout(t.current), []);
  return <button type="button" className={`ad-btn ghost danger-text ${ask ? 'asking' : ''} ${className}`} onClick={() => { if (ask) { clearTimeout(t.current); setAsk(false); onYes(); } else { setAsk(true); t.current = setTimeout(() => setAsk(false), 4000); } }} {...p}>{icon && <Icon n={icon} size={16} />}<span>{ask ? 'Sure? Tap again' : children}</span></button>;
}

// ---------- drag to reorder (works with mouse and touch) ----------
export function Sortable({ items, getId = (x) => x.id, onReorder, render, className, ...rest }) {
  const [list, setList] = useState(items); const [drag, setDrag] = useState(null); const ref = useRef(); const cur = useRef(items); const live = useRef(false);
  const prev = useRef(new Map()); const st = useRef(null);
  useEffect(() => { if (!live.current) { setList(items); cur.current = items; } }, [items]);
  const kids = () => [...(ref.current?.children || [])].filter((el) => el.dataset?.sid !== undefined);
  const offsets = () => new Map(kids().map((el) => [el.dataset.sid, { x: el.offsetLeft, y: el.offsetTop }]));      // layout positions (they ignore the sliding itself)
  const place = (el, s) => { const dx = s.px - s.sx + (s.ox - el.offsetLeft), dy = s.py - s.sy + (s.oy - el.offsetTop); el.style.transform = `translate(${dx}px,${dy}px) scale(1.02)`; return [dx, dy]; };
  // After the order changes, the other items glide from where they were to their new places, and the dragged one stays under the finger.
  useLayoutEffect(() => {
    if (!ref.current) return; const before = prev.current; const s = st.current;
    kids().forEach((el) => {
      const id = el.dataset.sid; if (s && id === s.id) { place(el, s); return; }
      const o = before.get(id); if (!o) return; const dx = o.x - el.offsetLeft, dy = o.y - el.offsetTop;
      if (dx || dy) el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
    prev.current = offsets();
  }, [list]);
  const grip = (id) => ({ className: 'ad-grip', 'aria-label': 'Drag to reorder', style: { touchAction: 'none', cursor: 'grab' }, onPointerDown: (e) => {
    if (e.button > 0) return; const el = e.currentTarget.closest('[data-sid]'); if (!el || !ref.current?.contains(el)) return; e.preventDefault();
    live.current = true; setDrag(String(id)); prev.current = offsets(); let changed = false;
    const s = { id: String(id), sx: e.clientX, sy: e.clientY, px: e.clientX, py: e.clientY, ox: el.offsetLeft, oy: el.offsetTop, el }; st.current = s; place(el, s);
    const move = (ev) => {
      s.px = ev.clientX; s.py = ev.clientY; place(el, s);                                 // the item follows the finger or cursor
      const cx = s.ox + (s.px - s.sx) + el.offsetWidth / 2, cy = s.oy + (s.py - s.sy) + el.offsetHeight / 2;            // where the middle of the item is, in layout space
      const over = kids().find((o) => o !== el && cx > o.offsetLeft && cx < o.offsetLeft + o.offsetWidth && cy > o.offsetTop && cy < o.offsetTop + o.offsetHeight); if (!over) return;
      const a = cur.current.findIndex((x) => String(getId(x)) === s.id), b = cur.current.findIndex((x) => String(getId(x)) === over.dataset.sid); if (a < 0 || b < 0 || a === b) return;
      const n = [...cur.current]; const [m] = n.splice(a, 1); n.splice(b, 0, m); cur.current = n; changed = true; setList(n);
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      const [dx, dy] = place(el, s); el.style.transform = ''; el.style.position = 'relative'; el.style.zIndex = '60';          // slide into the final place, still on top
      const a = el.animate([{ transform: `translate(${dx}px,${dy}px) scale(1.02)` }, { transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' });
      a.onfinish = a.oncancel = () => { el.style.position = ''; el.style.zIndex = ''; };
      st.current = null; live.current = false; setDrag(null); if (changed) onReorder(cur.current);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); } });
  return <div ref={ref} className={className} {...rest}>{list.map((x, i) => { const id = getId(x); return <div key={id} data-sid={id} className={`ad-sortable ${drag === String(id) ? 'dragging' : ''}`}>{render(x, grip(id), i)}</div>; })}</div>;
}

// ---------- forms ----------
/** A window that shows an item to read. The Edit button opens the editing window. rows: [[label, value]]; empty values are left out. */
export function ViewModal({ title, rows = [], children, onEdit, actions, onClose, wide }) {
  const shown = rows.filter((r) => r && r[1] !== undefined && r[1] !== null && r[1] !== '' && r[1] !== false);
  return (<Modal title={title} onClose={onClose} wide={wide}>
    {shown.length > 0 && <dl className="ad-view">{shown.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
    {children}
    {(onEdit || actions) && <div className="ad-actions full">{onEdit && <Btn icon="edit" onClick={onEdit}>Edit</Btn>}{actions}</div>}
  </Modal>);
}
export function useForm(init) {
  const [v, setV] = useState(init);
  return { v, set: (k, val) => setV((c) => ({ ...c, [k]: val })), reset: (n) => setV(n ?? init), setAll: setV };
}
/** One field. rule = typing/finishing rule from lib/format (name, email, phone, money, text, sentence, title, ...) */
export function F({ form, k, label, type = 'text', rule, required, options, hint, rows = 4, grow, ...rest }) {
  const r = rule && RULES[rule]; const val = form.v[k] ?? ''; const ta = useRef();
  // grow: a text box that is always as tall as its text, so it never scrolls inside
  useEffect(() => { const el = ta.current; if (!grow || !el) return; const fit = () => { if (!el.offsetParent) return; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }; fit(); const io = new IntersectionObserver(fit); io.observe(el); window.addEventListener('resize', fit); return () => { io.disconnect(); window.removeEventListener('resize', fit); }; }, [grow, val]);
  const common = { id: `f-${k}`, name: k, required, value: val, autoComplete: 'off', 'data-lpignore': 'true', 'data-1p-ignore': 'true', ...(r ? { autoCapitalize: r.cap, spellCheck: r.spell } : {}), ...rest };
  const onChange = (e) => form.set(k, r ? r.typing(e.target.value) : e.target.value);
  const onBlur = r ? (e) => form.set(k, r.done(e.target.value)) : undefined;
  let el;
  if (type === 'check') return (<label className="ad-check"><input type="checkbox" checked={!!val} onChange={(e) => form.set(k, e.target.checked)} /><span>{label}</span></label>);
  if (type === 'textarea') el = <textarea {...common} ref={ta} rows={rows} className={grow ? 'grow' : undefined} onChange={onChange} onBlur={onBlur} />;
  else if (type === 'select') el = <select {...common} onChange={onChange}>{required && <option value="" disabled>Select</option>}{options.map((o) => { const [value, text] = Array.isArray(o) ? o : [o, o]; return <option key={value} value={value}>{text}</option>; })}</select>;
  else if (type === 'date') el = <input {...common} type="text" inputMode="numeric" placeholder="DD/MM/YYYY" maxLength={10} pattern="(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/20[0-9]{2}" onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 8); form.set(k, d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d); }} />;
  else el = <input {...common} type={type === 'money' ? 'text' : type} inputMode={type === 'money' ? 'decimal' : rest.inputMode} onChange={onChange} onBlur={onBlur} />;
  return (<label className="ad-field"><span>{label}{required ? <i> *</i> : <em> (optional)</em>}</span>{el}{hint && <small>{hint}</small>}</label>);
}

// ---------- date helpers (people type DD/MM/YYYY) ----------
export const dmyToISO = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || ''); if (!m) return null; const [, d, mo, y] = m; const dt = new Date(`${y}-${mo}-${d}T00:00:00`); return dt.getMonth() + 1 === +mo && dt.getDate() === +d ? `${y}-${mo}-${d}` : null; };
export const isoToDMY = (iso) => { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
export const fmtDT = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '';
export const fmtD = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
export const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
export function download(name, text, type = 'text/csv') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([(type === 'text/csv' ? '﻿' : '') + text], { type: type + ';charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
export const STATUS_TONE = { paid: 'ok', pending: 'warn', cancelled: 'bad', refunded: 'bad', transferred: '', packed: 'info', shipped: 'info', delivered: 'ok', draft: '', published: 'ok', sent: 'info' };

// ---------- photos ----------
import { uploadPhoto, removePhoto } from '@/lib/upload';
import { photo as photoUrl } from '@/lib/photo';
export function PhotoField({ label, paths, onChange, folder, max = 1 }) {
  const toast = useToast(); const [busy, setBusy] = useState(false); const input = useRef();
  const list = (paths || []).filter(Boolean);
  async function pick(e) {
    const files = [...e.target.files].slice(0, max - list.length); e.target.value = ''; if (!files.length) return; setBusy(true);
    try { const added = []; for (const f of files) added.push(await uploadPhoto(f, folder)); onChange(max === 1 ? added : [...list, ...added]); toast(added.length > 1 ? 'Photos added' : 'Photo added'); }
    catch (err) { toast(err.message || 'Upload failed. Please try again.', 'err'); } finally { setBusy(false); }
  }
  const tile = (p, grip) => (<div className="it"><img src={photoUrl(p)} alt="" draggable={false} {...(max > 1 ? grip : {})} /><button type="button" className="rm" aria-label="Remove photo" onClick={(e) => { e.preventDefault(); onChange(list.filter((x) => x !== p)); }}><Icon n="close" size={11} /></button></div>);
  return (<div className="ad-field full"><span>{label}{max > 1 && <em> (drag to reorder, the first is the cover)</em>}</span>
    {max > 1 ? <Sortable className="ad-imgs" items={list.map((p) => ({ id: p, p }))} onReorder={(a) => onChange(a.map((x) => x.p))} render={(x, grip) => tile(x.p, grip)} />
      : <div className="ad-imgs">{list.map((p) => <div key={p}>{tile(p)}</div>)}</div>}
    {list.length < max && <div><input ref={input} type="file" accept="image/*" multiple={max > 1} hidden onChange={pick} /><button type="button" className="ad-btn ghost sm" disabled={busy} onClick={() => input.current.click()}><Icon n="upload" size={15} /><span>{busy ? 'Uploading…' : list.length ? 'Add photo' : 'Choose photo'}</span></button></div>}
  </div>);
}
