'use client';
import { useState } from 'react';
import Icon from './Icons';
import Pic from './Pic';
export default function Gallery({ images, alt }) {
  const [i, setI] = useState(0); const n = images.length;
  const go = (d) => setI((i + d + n) % n);
  return (
    <div className="gallery" aria-roledescription="carousel" aria-label={`${alt} photos`}>
      <div className="main" onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); }} tabIndex={0}>
        <Pic src={images[i]} alt={`${alt}, photo ${i + 1} of ${n}`} eager sizes="(max-width: 860px) 92vw, 520px" />
        {n > 1 && <>
          <button className="nb l" onClick={() => go(-1)} aria-label="Previous photo"><Icon n="left" /></button>
          <button className="nb r" onClick={() => go(1)} aria-label="Next photo"><Icon n="right" /></button>
          <span className="count">{i + 1} / {n}</span></>}
      </div>
      {n > 1 && <div className="thumbs">{images.map((s, k) => (
        <button key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Show photo ${k + 1}`}><Pic src={s} alt="" w={56} h={56} sizes="56px" /></button>))}</div>}
    </div>);
}
