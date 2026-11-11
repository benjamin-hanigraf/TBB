'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icons';
import { Login } from '@/components/Account';
import { supabase } from '@/lib/supabase-browser';
import { ToastProvider } from './kit';

export const NAV = [
  ['/admin', 'Home', 'home'], ['/admin/orders', 'Orders', 'bag'], ['/admin/workshops', 'Workshops', 'calendar'], ['/admin/products', 'Store', 'tag'],
  ['/admin/customers', 'Customers', 'user'], ['/admin/inbox', 'Inbox', 'mail'], ['/admin/money', 'Money', 'coin'], ['/admin/tools', 'Tools', 'tool'],
  ['/admin/photos', 'Photos', 'image'], ['/admin/settings', 'Settings', 'gear'],
];
const TABS = [['/admin', 'Home', 'home'], ['/admin/orders', 'Orders', 'bag'], ['/admin/workshops', 'Workshops', 'calendar'], ['/admin/money', 'Money', 'coin'], ['/admin/more', 'More', 'menu']];
const active = (p, h) => (h === '/admin' ? p === '/admin' : p.startsWith(h));

export default function AdminShell({ children }) {
  const sb = supabase(); const path = usePathname(); const [state, setState] = useState('loading'); const [user, setUser] = useState(null);
  useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin' }).catch(() => {}); }, []);
  useEffect(() => {
    if (!sb) { setState('nodb'); return; }
    let on = true;
    const check = async (session) => {
      if (!session) { if (on) { setUser(null); setState('login'); } return; }
      const { data } = await sb.from('profiles').select('role,full_name').eq('id', session.user.id).single();
      if (!on) return; setUser({ ...session.user, name: data?.full_name }); setState(data?.role === 'admin' ? 'ok' : 'denied');
    };
    sb.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => check(s));
    return () => { on = false; sub.subscription.unsubscribe(); };
  }, [sb]);

  if (state === 'loading') return <div className="ad-center"><p>Loading…</p></div>;
  if (state === 'nodb') return <div className="ad-center"><p>The app is not connected to its database yet.</p></div>;
  if (state === 'login') return (<div className="ad-center"><div className="ad-login"><img src="/icons/icon-192.png" alt="Thin Black Brush" width="72" height="72" /><h1>TBB Studio</h1><p>Sign in to manage your business.</p><Login sb={sb} /></div></div>);
  if (state === 'denied') return (<div className="ad-center"><div className="ad-login"><h1>No access</h1><p>{user?.email} is not an owner account. Please sign in with the owner email.</p><button className="ad-btn" onClick={() => sb.auth.signOut()}>Sign out</button></div></div>);
  return (
    <ToastProvider><div className="ad-app">
      <aside className="ad-side"><Link href="/admin" className="ad-brand"><img src="/img/logo.png" alt="Thin Black Brush" height="40" /><span>Studio</span></Link>
        <nav aria-label="Main">{NAV.map(([h, t, ic]) => <Link key={h} href={h} className={active(path, h) ? 'on' : ''}><AIcon n={ic} />{t}</Link>)}</nav>
        <div className="ad-side-f"><a href="/" target="_blank" rel="noopener">View website ↗</a><button onClick={() => sb.auth.signOut()}>Sign out</button></div></aside>
      <main className="ad-main" id="main">{children}</main>
      <nav className="ad-tabs" aria-label="Main">{TABS.map(([h, t, ic]) => <Link key={h} href={h} className={active(path, h) || (h === '/admin/more' && !TABS.slice(0, 4).some(([x]) => active(path, x))) ? 'on' : ''}><AIcon n={ic} /><span>{t}</span></Link>)}</nav>
    </div></ToastProvider>);
}
export function AIcon({ n }) { return <Icon n={n} size={20} />; }
