'use client';
// Photo gallery: a tidy wall of photos in their natural shapes, a "Show more" button, and a full-screen viewer with swipe, arrows and keyboard.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icons';
import Btn from './Btn';
const STEP = 12;
const src = (id) => `/img/${id}.webp`, small = (id) => `/img/${id}-640.webp`;

// How many columns fit: 3 on a wide screen, 2 on a tablet or phone.
const columnsFor = () => (typeof window !== 'undefined' && window.innerWidth <= 1000 ? 2 : 3);

/** One photo. Photos added by "Show more" start invisible and fade in once their picture has loaded. */
function WallItem({ p, i, fresh, onOpen }) {
  const [ready, setReady] = useState(!fresh); const img = useRef();
  useEffect(() => { if (fresh && img.current?.complete) setReady(true); }, [fresh]);       // already in the browser's memory
  return (<button type="button" className={`wall-item ${fresh ? 'fresh' : ''} ${ready ? 'ready' : ''}`} onClick={() => onOpen(i)} aria-label={`Open photo: ${p.alt}`}>
    <img ref={img} src={small(p.id)} srcSet={`${small(p.id)} 640w, ${src(p.id)} 1600w`} sizes="(max-width: 700px) 46vw, (max-width: 1100px) 31vw, 340px" alt={p.alt} width={p.w} height={p.h} loading={i < 6 ? 'eager' : 'lazy'} decoding="async" onLoad={() => setReady(true)} onError={() => setReady(true)} /></button>);
}

export default function PhotoWall({ photos }) {
  const [count, setCount] = useState(STEP); const [open, setOpen] = useState(null); const [cols, setCols] = useState(3); const [from, setFrom] = useState(null);
  useLayoutEffect(() => { const fit = () => setCols(columnsFor()); fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }, []);
  const list = photos; const shown = list.slice(0, count);
  // Each photo goes into the shortest column at the moment it is placed, in order. Adding more photos only ever adds to the bottoms of the columns:
  // a photo already on screen keeps its column and its place, so nothing above jumps or reorders.
  const columns = Array.from({ length: cols }, () => ({ h: 0, items: [] }));
  shown.forEach((p, i) => { const c = columns.reduce((a, b) => (b.h < a.h ? b : a)); c.items.push({ p, i }); c.h += (p.h || 1) / (p.w || 1); });
  return (<div className="wall">
    <div className="wall-grid">{columns.map((c, k) => (
      <div className="wall-col" key={k}>{c.items.map(({ p, i }) => <WallItem key={p.id} p={p} i={i} fresh={from !== null && i >= from} onOpen={setOpen} />)}</div>))}</div>
    {count < list.length && <div className="row c"><Btn variant="ghost" icon="plus" onClick={() => { setFrom(count); setCount((c) => c + STEP); }}>Show more</Btn></div>}
    {open !== null && <Viewer list={shown} start={open} onClose={() => setOpen(null)} />}
  </div>);
}

function Viewer({ list, start, onClose }) {
  const [i, setI] = useState(start); const [dx, setDx] = useState(0); const [drag, setDrag] = useState(false); const n = list.length; const box = useRef(); const st = useRef(null); const moved = useRef(false); const wheel = useRef({ sum: 0, last: 0, t: 0 });
  const go = useCallback((d) => { setI((c) => (c + d + n) % n); }, [n]);
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; box.current?.focus();
    const k = (e) => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'Home') setI(0); else if (e.key === 'End') setI(n - 1); };
    document.addEventListener('keydown', k); return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', k); };
  }, [go, onClose, n]);
  useEffect(() => { const before = document.activeElement; return () => { try { if (before?.isConnected) before.focus({ preventScroll: true }); } catch {} }; }, []);       // focus returns to the photo that was opened
  useEffect(() => { [1, -1].forEach((d) => { const p = list[(i + d + n) % n]; if (p) { const im = new Image(); im.src = src(p.id); } }); }, [i, list, n]);
  // two-finger swipe on a trackpad arrives as sideways wheel movement
  useEffect(() => {
    const el = box.current; if (!el) return;
    const onWheel = (e) => { if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; e.preventDefault(); const w = wheel.current; const now = Date.now(); if (now - w.t > 200) w.sum = 0; w.t = now; w.sum += e.deltaX; if (Math.abs(w.sum) > 70 && now - w.last > 450) { w.last = now; w.sum = 0; go(e.deltaX > 0 ? 1 : -1); } };
    el.addEventListener('wheel', onWheel, { passive: false }); return () => el.removeEventListener('wheel', onWheel);
  }, [go]);
  const down = (e) => { if (e.target.closest('button')) return; st.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId }; moved.current = false; };
  const move = (e) => { const s = st.current; if (!s || s.id !== e.pointerId) return; const x = e.clientX - s.x, y = e.clientY - s.y; if (!drag && Math.abs(x) > 8 && Math.abs(x) > Math.abs(y)) { setDrag(true); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} } if (Math.abs(x) > 6 || Math.abs(y) > 6) moved.current = true; if (drag || (Math.abs(x) > 8 && Math.abs(x) > Math.abs(y))) setDx(x); };
  const up = (e) => { const s = st.current; st.current = null; if (!s) return; const x = e.clientX - s.x, y = e.clientY - s.y, fast = Math.abs(x) / Math.max(1, Date.now() - s.t) > 0.45;
    setDrag(false); setDx(0); if (Math.abs(x) > 70 || (fast && Math.abs(x) > 24)) { if (Math.abs(x) > Math.abs(y)) go(x < 0 ? 1 : -1); } else if (y > 110 && Math.abs(y) > Math.abs(x) * 1.4) onClose(); };
  const p = list[i];
  return (<div className={`viewer ${drag ? 'dragging' : ''}`} role="dialog" aria-modal="true" aria-label="Photo viewer" tabIndex={-1} ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { st.current = null; setDrag(false); setDx(0); }}>
    <button className="v-close" onClick={onClose} aria-label="Close"><Icon n="close" size={22} /></button>
    <div className="v-stage" onClick={(e) => { if (!moved.current && !e.target.closest('.v-img')) onClose(); }}>
      <img key={p.id} src={src(p.id)} alt={p.alt} className="v-img" draggable={false} style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: drag ? 'none' : 'transform .2s ease' }} /></div>
    <p className="v-cap"><span>{p.alt}</span><b>{i + 1} / {n}</b></p>
    {n > 1 && <><button className="v-nav l" onClick={() => go(-1)} aria-label="Previous photo"><Icon n="left" size={22} /></button><button className="v-nav r" onClick={() => go(1)} aria-label="Next photo"><Icon n="right" size={22} /></button></>}
  </div>);
}
