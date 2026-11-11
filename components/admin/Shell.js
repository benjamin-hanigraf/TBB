'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icons';
import { adminClient } from '@/lib/supabase-admin';
import { ToastProvider } from './kit';
import PinGate from './PinGate';
import ErrorBoundary from './ErrorBoundary';
import { pinApi, getToken, setToken, applySession, lockDevice } from '@/lib/adminApi';

export const NAV = [
  ['/admin', 'Home', 'home'], ['/admin/orders', 'Orders', 'bag'], ['/admin/workshops', 'Workshops', 'calendar'], ['/admin/classes', 'Classes', 'ticket'], ['/admin/products', 'Store', 'tag'],
  ['/admin/customers', 'Customers', 'user'], ['/admin/inbox', 'Inbox', 'mail'], ['/admin/money', 'Money', 'coin'], ['/admin/tools', 'Tools', 'tool'],
  ['/admin/photos', 'Photos', 'image'], ['/admin/settings', 'Settings', 'gear'],
];
const TABS = [['/admin', 'Home', 'home'], ['/admin/orders', 'Orders', 'bag'], ['/admin/workshops', 'Workshops', 'calendar'], ['/admin/money', 'Money', 'coin'], ['/admin/more', 'More', 'menu']];
const active = (p, h) => (h === '/admin' ? p === '/admin' : p.startsWith(h));
const setDefFlag = (v) => { try { sessionStorage.setItem('tbb-defpin', v ? '1' : ''); } catch {} };

export default function AdminShell({ children }) {
  return <ErrorBoundary><Inner>{children}</Inner></ErrorBoundary>;
}
function Inner({ children }) {
  const path = usePathname(); const [state, setState] = useState('loading');
  useEffect(() => { const h = (e) => { e.preventDefault(); window.__bip = e; }; window.addEventListener('beforeinstallprompt', h); return () => window.removeEventListener('beforeinstallprompt', h); }, []);
  useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin' }).catch(() => {}); }, []);
  useEffect(() => {
    let on = true;
    (async () => {
      if (!adminClient()) { setState('nodb'); return; }
      try {
        const r = await pinApi({ action: 'status' });                       // is this device already trusted?
        if (!on) return; if (r.status === 503) { setState('pin-setup'); return; }
        setDefFlag(r.defaultPin);
        if (r.trusted) {
          const { data } = await adminClient().auth.getSession();
          if (!data.session) { const s = await pinApi({ action: 'session' }); if (!s.ok) { setToken(''); setState('pin'); return; } await applySession(s.session); }
          if (on) setState('ok'); return;
        }
        setToken(''); await adminClient().auth.signOut().catch(() => {}); if (on) setState('pin');
      } catch (e) { console.error(e); if (on) setState('error'); }
    })();
    return () => { on = false; };
  }, []);

  if (state === 'loading') return <div className="ad-center"><p role="status">Loading…</p></div>;
  if (state === 'nodb') return <div className="ad-center"><p>The app is not connected to its database yet.</p></div>;
  if (state === 'error') return <div className="ad-center"><div className="ad-login"><h1>Could not open the app</h1><p>Please check your internet connection and try again.</p><button className="ad-btn" onClick={() => location.reload()}>Try again</button></div></div>;
  if (state === 'pin' || state === 'pin-setup') return <PinGate notConfigured={state === 'pin-setup'} onDone={(def) => { setDefFlag(def); setState('ok'); }} />;
  return (
    <ToastProvider><div className="ad-app">
      <aside className="ad-side"><Link href="/admin" className="ad-brand"><img src="/img/logo.png" alt="Thin Black Brush" height="40" /><span>Studio</span></Link>
        <nav aria-label="Main">{NAV.map(([h, t, ic]) => <Link key={h} href={h} className={active(path, h) ? 'on' : ''}><AIcon n={ic} />{t}</Link>)}</nav>
        <div className="ad-side-f"><a href="/" target="_blank" rel="noopener">View website ↗</a><button onClick={async () => { await lockDevice(); location.reload(); }}>Lock this device</button></div></aside>
      <main className="ad-main" id="main">{children}</main>
      <nav className="ad-tabs" aria-label="Main">{TABS.map(([h, t, ic]) => <Link key={h} href={h} className={active(path, h) || (h === '/admin/more' && !TABS.slice(0, 4).some(([x]) => active(path, x))) ? 'on' : ''}><AIcon n={ic} /><span>{t}</span></Link>)}</nav>
    </div></ToastProvider>);
}
export function AIcon({ n }) { return <Icon n={n} size={20} />; }
