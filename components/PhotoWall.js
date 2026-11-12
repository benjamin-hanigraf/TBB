'use client';
// Photo gallery: a tidy wall of photos in their natural shapes, a "Show more" button, and a full-screen viewer with swipe, arrows and keyboard.
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icons';
import Btn from './Btn';
const STEP = 12;
const src = (id) => `/img/${id}.webp`, small = (id) => `/img/${id}-640.webp`;

export default function PhotoWall({ photos }) {
  const [count, setCount] = useState(STEP); const [open, setOpen] = useState(null);
  const list = photos; const shown = list.slice(0, count);
  return (<div className="wall">
    <div className="wall-grid">{shown.map((p, i) => (
      <button key={p.id} type="button" className="wall-item" onClick={() => setOpen(i)} aria-label={`Open photo: ${p.alt}`}>
        <img src={small(p.id)} srcSet={`${small(p.id)} 640w, ${src(p.id)} 1600w`} sizes="(max-width: 700px) 46vw, (max-width: 1100px) 31vw, 340px" alt={p.alt} width={p.w} height={p.h} loading={i < 6 ? 'eager' : 'lazy'} decoding="async" /></button>))}</div>
    {count < list.length && <div className="row c"><Btn variant="ghost" icon="plus" onClick={() => setCount((c) => c + STEP)}>Show more</Btn></div>}
    {open !== null && <Viewer list={shown} start={open} onClose={() => setOpen(null)} />}
  </div>);
}

function Viewer({ list, start, onClose }) {
  const [i, setI] = useState(start); const n = list.length; const box = useRef(); const down = useRef(null);
  const go = useCallback((d) => setI((c) => (c + d + n) % n), [n]);
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; box.current?.focus();
    const k = (e) => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); };
    document.addEventListener('keydown', k); return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', k); };
  }, [go, onClose]);
  useEffect(() => { [1, -1].forEach((d) => { const p = list[(i + d + n) % n]; if (p) { const im = new Image(); im.src = src(p.id); } }); }, [i, list, n]);
  const p = list[i];
  return (<div className="viewer" role="dialog" aria-modal="true" aria-label="Photo viewer" tabIndex={-1} ref={box}
    onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY }; }}
    onPointerUp={(e) => { const s = down.current; down.current = null; if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1); else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) onClose(); }}>
    <button className="v-close" onClick={onClose} aria-label="Close"><Icon n="close" size={22} /></button>
    <div className="v-stage" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <img key={p.id} src={src(p.id)} alt={p.alt} className="v-img" draggable={false} /></div>
    <p className="v-cap"><span>{p.alt}</span><b>{i + 1} / {n}</b></p>
    {n > 1 && <><button className="v-nav l" onClick={() => go(-1)} aria-label="Previous photo"><Icon n="left" size={22} /></button><button className="v-nav r" onClick={() => go(1)} aria-label="Next photo"><Icon n="right" size={22} /></button></>}
  </div>);
}
