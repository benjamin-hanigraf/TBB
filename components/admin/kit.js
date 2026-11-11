'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { adminClient } from '@/lib/supabase-admin';
import { RULES } from '@/lib/format';
import Icon from '@/components/Icons';

export const sb = () => adminClient();
export const must = (r) => { if (r.error) throw r.error; return r.data; };

/** Loads data and lets you reload it. fn must return a promise. */
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null); const [error, setError] = useState(null); const [tick, setTick] = useState(0);
  useEffect(() => { let on = true; setError(null); Promise.resolve().then(fn).then((d) => on && setData(d)).catch((e) => on && setError(e)); return () => { on = false; }; /* eslint-disable-next-line */ }, [tick, ...deps]);
  return { data, error, loading: data === null && !error, reload: useCallback(() => setTick((t) => t + 1), []) };
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
export const Page = ({ title, action, children, back }) => (
  <div className="ad-page"><header className="ad-head">{back && <a className="ad-back" href={back} aria-label="Back"><Icon n="left" /></a>}<h1>{title}</h1><div className="ad-act">{action}</div></header>{children}</div>);
export const Card = ({ title, children, action, tight }) => (<section className={`ad-card ${tight ? 'tight' : ''}`}>{(title || action) && <div className="ad-card-h"><h2>{title}</h2>{action}</div>}{children}</section>);
export const Stat = ({ label, value, sub, tone }) => (<div className={`ad-stat ${tone || ''}`}><span>{label}</span><b>{value}</b>{sub && <em>{sub}</em>}</div>);
export const Badge = ({ children, tone = '' }) => <span className={`ad-badge ${tone}`}>{children}</span>;
export const Empty = ({ children }) => <p className="ad-empty">{children}</p>;
export const Spin = () => <p className="ad-empty" role="status">Loading…</p>;
export const Err = ({ e }) => <p className="ad-err" role="alert">{e?.message || 'Could not load. Please check your connection and try again.'}</p>;
export const Btn = ({ icon, children, variant = '', busy, ...p }) => (<button className={`ad-btn ${variant}`} disabled={busy || p.disabled} {...p}>{icon && <Icon n={icon} size={16} />}<span>{children}</span></button>);

export function Modal({ title, onClose, children, wide }) {
  const ref = useRef();
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', k); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; ref.current?.focus(); return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev; }; }, [onClose]);
  return (<div className="ad-modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`ad-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
      <div className="ad-modal-h"><h2>{title}</h2><button className="ad-x" onClick={onClose} aria-label="Close">✕</button></div><div className="ad-modal-b">{children}</div></div></div>);
}
export function Confirm({ children, onYes, label = 'Delete', ...p }) {
  const [ask, setAsk] = useState(false);
  return ask ? <span className="ad-confirm">Sure? <button className="ad-btn danger sm" onClick={() => { setAsk(false); onYes(); }}>{label}</button><button className="ad-btn ghost sm" onClick={() => setAsk(false)}>No</button></span>
    : <button className="ad-btn ghost sm danger-text" onClick={() => setAsk(true)} {...p}>{children}</button>;
}

// ---------- forms ----------
export function useForm(init) {
  const [v, setV] = useState(init);
  return { v, set: (k, val) => setV((c) => ({ ...c, [k]: val })), reset: (n) => setV(n ?? init), setAll: setV };
}
/** One field. rule = typing/finishing rule from lib/format (name, email, phone, money, text, sentence, title, ...) */
export function F({ form, k, label, type = 'text', rule, required, options, hint, rows = 4, ...rest }) {
  const r = rule && RULES[rule]; const val = form.v[k] ?? '';
  const common = { id: `f-${k}`, name: k, required, value: val, ...(r ? { autoCapitalize: r.cap, spellCheck: r.spell } : {}), ...rest };
  const onChange = (e) => form.set(k, r ? r.typing(e.target.value) : e.target.value);
  const onBlur = r ? (e) => form.set(k, r.done(e.target.value)) : undefined;
  let el;
  if (type === 'check') return (<label className="ad-check"><input type="checkbox" checked={!!val} onChange={(e) => form.set(k, e.target.checked)} /><span>{label}</span></label>);
  if (type === 'textarea') el = <textarea {...common} rows={rows} onChange={onChange} onBlur={onBlur} />;
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
export function download(name, text, type = 'text/csv') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: type + ';charset=utf-8' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
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
  const move = (i, d) => { const a = [...list]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (<div className="ad-field full"><span>{label}{max > 1 && <em> (the first photo is the cover)</em>}</span>
    <div className="ad-imgs">{list.map((p, i) => (<div className="it" key={p}><img src={photoUrl(p)} alt="" />
      <button aria-label="Remove photo" onClick={(e) => { e.preventDefault(); onChange(list.filter((x) => x !== p)); }}>✕</button>
      {max > 1 && i > 0 && <button className="mv" aria-label="Move earlier" onClick={(e) => { e.preventDefault(); move(i, -1); }}>‹</button>}
      {max > 1 && i < list.length - 1 && <button className="mv" style={{ left: 22 }} aria-label="Move later" onClick={(e) => { e.preventDefault(); move(i, 1); }}>›</button>}</div>))}</div>
    {list.length < max && <div><input ref={input} type="file" accept="image/*" multiple={max > 1} hidden onChange={pick} /><button type="button" className="ad-btn ghost sm" disabled={busy} onClick={() => input.current.click()}><Icon n="upload" size={15} /><span>{busy ? 'Uploading…' : list.length ? 'Add photo' : 'Choose photo'}</span></button></div>}
  </div>);
}
