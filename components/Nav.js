'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { images } from '@/lib/data';
import Icon from './Icons';
import { supabase } from '@/lib/supabase-browser';
import { useCart } from './Cart';
const links = [['/', 'Home'], ['/workshops', 'Workshops'], ['/writing-classes', 'Classes'], ['/store', 'Store'], ['/custom-invitations', 'Invitations'], ['/collaborations', 'Collaborations'], ['/contact', 'Contact']];
// The name of the page you are on, shown in the middle of the top bar when the menu collapses.
const TITLES = [[/^\/$/, 'Home'], [/^\/workshops/, 'Workshops'], [/^\/writing-classes/, 'Classes'], [/^\/store/, 'Store'], [/^\/bag/, 'Bag'], [/^\/checkout/, 'Checkout'], [/^\/custom-invitations/, 'Invitations'], [/^\/collaborations/, 'Collaborations'], [/^\/contact/, 'Contact'], [/^\/account/, 'Account'], [/^\/policies/, 'Policies'], [/^\/invoice/, 'Receipt']];
const titleFor = (path) => (TITLES.find(([re]) => re.test(path)) || [0, 'Menu'])[1];
export default function Nav() {
  const p = usePathname(); const [open, setOpen] = useState(false); const [signedIn, setSignedIn] = useState(false); const { count } = useCart();
  useEffect(() => { const sb = supabase(); if (!sb) return; sb.auth.getSession().then(({ data }) => setSignedIn(!!data.session)); const { data } = sb.auth.onAuthStateChange((_e, s) => setSignedIn(!!s)); return () => data.subscription.unsubscribe(); }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  useEffect(() => { setOpen(false); }, [p]);
  return (
    <nav className="nav"><div className="wrap">
      <Link href="/" className="logo" aria-label="Thin Black Brush home"><img src={images.logo} alt="Thin Black Brush" width="122" height="46" /></Link>
      <button type="button" className="pagetitle" aria-label={`${titleFor(p)}. ${open ? 'Close' : 'Open'} menu`} aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>{titleFor(p)}</button>
      <ul id="site-menu" className={open ? 'open' : ''} onClick={() => setOpen(false)}>
        {links.map(([h, t]) => <li key={h}><Link href={h} className={(h === '/' ? p === '/' : p.startsWith(h)) ? 'on' : ''}>{t}</Link></li>)}
      </ul>
      <div className="tools"><Link href="/bag" className="cartlink" aria-label={`Bag, ${count} items`}><Icon n="bag" size={22} />{count > 0 && <span className="badge">{count}</span>}</Link><Link href="/account" className="loginlink" aria-label={signedIn ? 'Account' : 'Log in'}><Icon n="user" size={20} /><span className="lt">{signedIn ? 'Account' : 'Log in'}</span></Link>
        <button className="burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">{open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}</svg></button></div>
    </div></nav>);
}
