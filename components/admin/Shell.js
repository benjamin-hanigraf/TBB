'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icons';
import { adminClient } from '@/lib/supabase-admin';
import { ToastProvider, Dots, clearCache } from './kit';
import PinGate from './PinGate';
import ErrorBoundary from './ErrorBoundary';
import { pinApi, getToken, setToken, applySession, lockDevice } from '@/lib/adminApi';

export const NAV = [
  ['/manager', 'Home', 'home'], ['/manager/planner', 'Planner', 'calendardays'], ['/manager/orders', 'Orders', 'box'], ['/manager/programs', 'Programs', 'calendar'], ['/manager/products', 'Store', 'bag'],
  ['/manager/customers', 'Customers', 'user'], ['/manager/money', 'Money', 'note'], ['/manager/inbox', 'Inbox', 'mail'], ['/manager/settings', 'Settings', 'gear'],
];
const TABS = [['/manager', 'Home', 'home'], ['/manager/orders', 'Orders', 'box'], ['/manager/programs', 'Programs', 'calendar'], ['/manager/money', 'Money', 'note'], ['/manager/more', 'More', 'menu']];
const active = (p, h) => (h === '/manager' ? p === '/manager' : p.startsWith(h));
const setDefFlag = (v) => { try { sessionStorage.setItem('tbb-defpin', v ? '1' : ''); } catch {} };

export default function AdminShell({ children }) {
  return <ErrorBoundary><Inner>{children}</Inner></ErrorBoundary>;
}
function Inner({ children }) {
  const path = usePathname(); const [state, setState] = useState('loading');
  useEffect(() => { window.__adminReady = true; const t = setTimeout(() => setState((s) => (s === 'loading' ? 'error' : s)), 10000); return () => clearTimeout(t); }, []);
  useEffect(() => { const h = (e) => { e.preventDefault(); window.__bip = e; }; window.addEventListener('beforeinstallprompt', h); return () => window.removeEventListener('beforeinstallprompt', h); }, []);
  useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/manager/sw.js', { scope: '/manager' }).catch(() => {}); }, []);
  useEffect(() => {
    let on = true;
    (async () => {
      if (!adminClient()) { setState('nodb'); return; }
      try {
        const first = await adminClient().auth.getSession();                  // a trusted device with a saved sign-in opens straight away; the check below runs in the background
        if (getToken() && first.data.session && on) setState('ok');
        const r = await pinApi({ action: 'status' });                       // is this device already trusted?
        if (!on) return; if (r.status === 503) { setState('pin-setup'); return; }
        setDefFlag(r.defaultPin);
        if (r.trusted) {
          const { data } = await adminClient().auth.getSession();
          if (!data.session) { const s = await pinApi({ action: 'session' }); if (!s.ok) { setToken(''); setState('pin'); return; } await applySession(s.session); }
          if (on) setState('ok'); return;
        }
        setToken(''); clearCache(); await adminClient().auth.signOut().catch(() => {}); if (on) setState('pin');
      } catch (e) { console.error(e); if (on) setState('error'); }
    })();
    return () => { on = false; };
  }, []);

  if (state === 'loading') return <div className="ad-center"><Dots /></div>;
  if (state === 'nodb') return <div className="ad-center"><p>The app is not connected to its database yet.</p></div>;
  if (state === 'error') return <div className="ad-center"><div className="ad-login"><h1>Could not open the app</h1><p>Please check your internet connection and try again.</p><button className="ad-btn" onClick={() => location.reload()}>Try again</button></div></div>;
  if (state === 'pin' || state === 'pin-setup') return <PinGate notConfigured={state === 'pin-setup'} onDone={(def) => { setDefFlag(def); setState('ok'); }} />;
  return (
    <ToastProvider><div className="ad-app">
      <aside className="ad-side"><Link href="/manager" className="ad-brand"><img src="/brand/logo-stacked-light.svg" alt="Thin Black Brush" height="40" /><span>Manager</span></Link>
        <nav aria-label="Main">{NAV.map(([h, t, ic]) => <Link key={h} href={h} className={active(path, h) ? 'on' : ''}><AIcon n={ic} />{t}</Link>)}</nav>
        <div className="ad-side-f"><a href="/" target="_blank" rel="noopener">View website ↗</a><button onClick={async () => { await lockDevice(); clearCache(); location.reload(); }}><Icon n="logout" size={15} /> Log out</button></div></aside>
      <main className="ad-main" id="main">{children}</main>
      <nav className="ad-tabs" aria-label="Main">{TABS.map(([h, t, ic]) => <Link key={h} href={h} className={active(path, h) || (h === '/manager/more' && !TABS.slice(0, 4).some(([x]) => active(path, x))) ? 'on' : ''}><AIcon n={ic} /><span>{t}</span></Link>)}</nav>
    </div></ToastProvider>);
}
export function AIcon({ n }) { return <Icon n={n} size={20} />; }
