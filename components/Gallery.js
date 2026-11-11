'use client';
import { useRef, useState } from 'react';
import Icon from './Icons';
import Pic from './Pic';
export default function Gallery({ images, alt }) {
  const [i, setI] = useState(0); const n = images.length;
  const go = (d) => setI((i + d + n) % n);
  const start = useRef(null);
  const down = (e) => { start.current = { x: e.clientX, y: e.clientY }; };
  const up = (e) => { const s = start.current; start.current = null; if (!s || n < 2) return; const dx = e.clientX - s.x, dy = e.clientY - s.y; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(dx < 0 ? 1 : -1); };
  return (
    <div className="gallery" aria-roledescription="carousel" aria-label={`${alt} photos`}>
      <div className="main" onPointerDown={down} onPointerUp={up} onPointerCancel={() => { start.current = null; }} onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); }} tabIndex={0}>
        <Pic src={images[i]} alt={`${alt}, photo ${i + 1} of ${n}`} eager sizes="(max-width: 860px) 92vw, 520px" />
        {n > 1 && <>
          <button className="nb l" onClick={() => go(-1)} aria-label="Previous photo"><Icon n="left" size={15} /></button>
          <button className="nb r" onClick={() => go(1)} aria-label="Next photo"><Icon n="right" size={15} /></button>
          <span className="count">{i + 1} / {n}</span></>}
      </div>
      {n > 1 && <div className="thumbs">{images.map((s, k) => (
        <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Show photo ${k + 1}`}><Pic src={s} alt="" w={56} h={56} sizes="56px" /></button>))}</div>}
    </div>);
}
