'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { images } from '@/lib/data';
import Icon from './Icons';
const links = [['/workshops', 'Workshops'], ['/writing-classes', 'Classes'], ['/store', 'Store'], ['/custom-invitations', 'Invitations'], ['/services', 'Services'], ['/collaborations', 'Collaborations'], ['/contact', 'Contact']];
export default function Nav() {
  const p = usePathname(); const [open, setOpen] = useState(false);
  return (
    <nav className="nav"><div className="wrap">
      <Link href="/" className="logo" aria-label="Thin Black Brush home"><img src={images.logo} alt="Thin Black Brush" /></Link>
      <ul className={open ? 'open' : ''} onClick={() => setOpen(false)}>
        {links.map(([h, t]) => <li key={h}><Link href={h} className={p.startsWith(h) ? 'on' : ''}>{t}</Link></li>)}
      </ul>
      <div className="tools"><Link href="/account" className="hide-m"><Icon n="user" size={16} />Log in</Link>
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button></div>
    </div></nav>);
}
