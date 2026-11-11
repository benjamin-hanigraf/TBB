'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { images } from '@/lib/data';
const links = [['/', 'Home'], ['/workshops', 'Workshops'], ['/writing-classes', 'Writing Classes'], ['/store', 'Store'], ['/custom-invitations', 'Invitations'], ['/collaborations', 'Collaborations'], ['/contact', 'Contact']];
export default function Nav() {
  const p = usePathname(); const [open, setOpen] = useState(false);
  return (
    <nav className="nav"><div className="wrap">
      <Link href="/" className="logo" aria-label="Thin Black Brush home"><img src={images.wordmark} alt="Thin Black Brush" /></Link>
      <ul className={open ? 'open' : ''} onClick={() => setOpen(false)}>
        {links.map(([h, t]) => <li key={h}><Link href={h} className={p === h ? 'on' : ''}>{t}</Link></li>)}
      </ul>
      <div className="tools"><Link href="/account" className="hide-m">Log in</Link>
        <button className="burger" aria-label="Menu" onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button></div>
    </div></nav>
  );
}
