'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { images } from '@/lib/data';
import Icon from './Icons';
import { supabase } from '@/lib/supabase-browser';
import { useCart } from './Cart';
const links = [['/', 'Home'], ['/workshops', 'Workshops'], ['/writing-classes', 'Classes'], ['/store', 'Store'], ['/custom-invitations', 'Invitations'], ['/services', 'Services'], ['/collaborations', 'Collaborations'], ['/contact', 'Contact']];
export default function Nav() {
  const p = usePathname(); const [open, setOpen] = useState(false); const [signedIn, setSignedIn] = useState(false); const { count } = useCart();
  useEffect(() => { const sb = supabase(); if (!sb) return; sb.auth.getSession().then(({ data }) => setSignedIn(!!data.session)); const { data } = sb.auth.onAuthStateChange((_e, s) => setSignedIn(!!s)); return () => data.subscription.unsubscribe(); }, []);
  return (
    <nav className="nav"><div className="wrap">
      <Link href="/" className="logo" aria-label="Thin Black Brush home"><img src={images.logo} alt="Thin Black Brush" width="119" height="46" /></Link>
      <ul className={open ? 'open' : ''} onClick={() => setOpen(false)}>
        {links.map(([h, t]) => <li key={h}><Link href={h} className={(h === '/' ? p === '/' : p.startsWith(h)) ? 'on' : ''}>{t}</Link></li>)}
      </ul>
      <div className="tools"><Link href="/cart" className="cartlink" aria-label={`Cart, ${count} items`}><Icon n="paperbag" size={22} />{count > 0 && <span className="badge">{count}</span>}</Link><Link href="/account" className="hide-m"><Icon n="user" size={16} />{signedIn ? 'Account' : 'Log in'}</Link>
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button></div>
    </div></nav>);
}
