'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon from '@/components/Icons';
import { adminClient } from '@/lib/supabase-admin';
import { ToastProvider, Dots, clearCache, backStack } from './kit';
import PinGate from './PinGate';
import ErrorBoundary from './ErrorBoundary';
import { useAdminKeys } from './Keys';
import { pinApi, getToken, setToken, applySession, lockDevice } from '@/lib/adminApi';

export const NAV = [
  ['/manager', 'Home', 'home'], ['/manager/planner', 'Planner', 'calendardays'], ['/manager/workshops', 'Workshops', 'workshops'], ['/manager/classes', 'Classes', 'classes'], ['/manager/orders', 'Orders', 'box'],
  ['/manager/products', 'Store', 'bag'], ['/manager/money', 'Accounts', 'note'], ['/manager/invoices', 'Invoices', 'file'], ['/manager/inbox', 'Inbox', 'mail'], ['/manager/customers', 'Customers', 'user'], ['/manager/settings', 'Settings', 'gear'],
];
// On a phone only Home, Planner and Invoices stay on the bottom bar; everything else is inside More.
const TAB_PAGES = ['/manager', '/manager/planner', '/manager/invoices'];
export const MORE = NAV.filter(([h]) => !TAB_PAGES.includes(h));
const TABS = [...NAV.filter(([h]) => TAB_PAGES.includes(h)), ['/manager/more', 'More', 'menu']];
/** The page one level up. The bottom-bar pages (Home, Planner, Money, More) have none. */
export const parentOf = (p) => (p.startsWith('/manager/labels') ? '/manager/orders' : p.startsWith('/manager/calculator') ? '/manager' : ['/manager/workshops', '/manager/classes', '/manager/orders', '/manager/products', '/manager/money', '/manager/inbox', '/manager/customers', '/manager/settings'].some((x) => p.startsWith(x)) ? '/manager/more' : null);
const active = (p, h) => (h === '/manager' ? p === '/manager' : p.startsWith(h));
/** How many Inbox messages have not been opened yet (shown as "Inbox (2)"). */
export async function unreadCount() {
  const c = adminClient(); if (!c) return 0; let r = await c.from('enquiries').select('id', { count: 'exact', head: true }).is('read_at', null);
  if (r.error) r = await c.from('enquiries').select('id', { count: 'exact', head: true }).eq('handled', false);   // before database update v9
  return r.count || 0;
}
const withCount = (t, n) => (n ? `${t} (${n})` : t);
const setDefFlag = (v) => { try { sessionStorage.setItem('tbb-defpin', v ? '1' : ''); } catch {} };

export default function AdminShell({ children }) {
  return <ErrorBoundary><Inner>{children}</Inner></ErrorBoundary>;
}
function Inner({ children }) {
  const path = usePathname(); const router = useRouter(); const here = useRef(path); const [state, setState] = useState('loading'); const [unread, setUnread] = useState(0); const [why, setWhy] = useState('');
  useAdminKeys();
  useEffect(() => { here.current = path; }, [path]);
  // Swipe left to right = go up one level (close the window on top, or go to the page that holds this one), never to the page visited before.
  // On phones and tablets the app never adds pages to the browser history (every move replaces the current entry). With nothing to go back to, the
  // device's own back-swipe (and its sliding picture, which carried the bottom bar along) has nothing to do, and the swipe below does the job.
  useEffect(() => {
    const touchy = window.matchMedia?.('(pointer: coarse)').matches;
    const up = () => { if (backStack.length) { backStack[backStack.length - 1].close(); return; } const par = parentOf(here.current); if (par) router.replace(par); };
    let g = null;
    const start = (e) => {
      g = null; if (e.touches.length !== 1) return; const t = e.touches[0], el = e.target;
      if (el.closest?.('input,textarea,select,[contenteditable="true"],.ad-grip,.ad-imgs,.ad-scroll,.ad-tabsbar,.cal-grid,.ad-sortable.dragging')) return;
      for (let a = el; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if ((o === 'auto' || o === 'scroll') && a.scrollWidth > a.clientWidth + 2) return; }
      g = { x: t.clientX, y: t.clientY, at: Date.now() };
    };
    const end = (e) => { if (!g) return; const t = e.changedTouches[0]; const dx = t.clientX - g.x, dy = t.clientY - g.y; const fast = Date.now() - g.at < 900; g = null; if (fast && dx > 80 && Math.abs(dy) < 70 && dx > 1.6 * Math.abs(dy)) up(); };
    const click = (e) => {                      // moving between pages: replace the history entry instead of adding one
      if (!touchy || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href]'); if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      let u; try { u = new URL(a.href, window.location.href); } catch { return; } if (u.origin !== window.location.origin || !u.pathname.startsWith('/manager')) return;
      e.preventDefault(); e.stopPropagation(); if (u.pathname + u.search === window.location.pathname + window.location.search) return; router.replace(u.pathname + u.search + u.hash);
    };
    // Where history does exist (a computer's browser buttons, or a page opened from elsewhere), going back still lands on the enclosing page.
    const pop = () => { const left = here.current; const closed = backStack.length ? (backStack[backStack.length - 1].close(), true) : false; const par = parentOf(left); const to = closed ? left : par || left; if (to !== window.location.pathname) router.replace(to); };
    document.addEventListener('touchstart', start, { passive: true }); document.addEventListener('touchend', end, { passive: true }); document.addEventListener('click', click, true); window.addEventListener('popstate', pop);
    return () => { document.removeEventListener('touchstart', start); document.removeEventListener('touchend', end); document.removeEventListener('click', click, true); window.removeEventListener('popstate', pop); };
  }, [router]);
  useEffect(() => { if (state === 'ok') unreadCount().then(setUnread).catch(() => {}); }, [state, path]);
  // Behave like an app: no pinch zoom (iPhones ignore the viewport rule, so the gesture itself is stopped), no long-press menus, no photo dragging.
  // Input boxes keep their normal behaviour so typing, selecting and pasting still work.
  useEffect(() => {
    const stop = (e) => e.preventDefault(); const inField = (e) => !!e.target?.closest?.('input,textarea,select,[contenteditable="true"]');
    const menu = (e) => { if (!inField(e)) e.preventDefault(); }; const drag = (e) => { if (e.target?.tagName === 'IMG') e.preventDefault(); };
    const ev = ['gesturestart', 'gesturechange', 'gestureend']; ev.forEach((n) => document.addEventListener(n, stop));
    document.addEventListener('contextmenu', menu); document.addEventListener('dragstart', drag);       // (no touchmove or wheel listeners: they stop the browser from scrolling smoothly. Pinch is blocked by the page's touch-action rule.)
    return () => { ev.forEach((n) => document.removeEventListener(n, stop)); document.removeEventListener('contextmenu', menu); document.removeEventListener('dragstart', drag); };
  }, []);
  useEffect(() => { const free = () => { if (!document.querySelector('.ad-modal-bg')) document.documentElement.classList.remove('ad-lock'); }; free();       // a leftover freeze from a closed pop-up is always lifted
    document.addEventListener('visibilitychange', free); window.addEventListener('pageshow', free); return () => { document.removeEventListener('visibilitychange', free); window.removeEventListener('pageshow', free); }; }, [path]);
  useEffect(() => { window.__adminReady = true; const t = setTimeout(() => setState((s) => (s === 'loading' ? 'error' : s)), 10000); return () => clearTimeout(t); }, []);
  useEffect(() => { const h = (e) => { e.preventDefault(); window.__bip = e; }; window.addEventListener('beforeinstallprompt', h); return () => window.removeEventListener('beforeinstallprompt', h); }, []);
  useEffect(() => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/manager/sw.js', { scope: '/manager' }).catch(() => {}); }, []);
  useEffect(() => {
    let on = true;
    (async () => {
      if (!adminClient()) { setState('nodb'); return; }
      try {
        const first = await Promise.race([adminClient().auth.getSession(), new Promise((res) => setTimeout(() => res({ data: {} }), 4000))]);       // Safari can leave this waiting: do not wait for ever                  // a trusted device with a saved sign-in opens straight away; the check below runs in the background
        if (getToken() && first.data.session && on) setState('ok');
        const r = await pinApi({ action: 'status' });                       // is this device already trusted?
        if (!on) return; if (r.status === 503) { setState('pin-setup'); return; }
        setDefFlag(r.defaultPin);
        if (r.trusted) {
          const { data } = await Promise.race([adminClient().auth.getSession(), new Promise((res) => setTimeout(() => res({ data: {} }), 4000))]);
          if (!data.session) { const s = await pinApi({ action: 'session' }); if (!s.ok) { setToken(''); setState('pin'); return; } await applySession(s.session); }
          if (on) setState('ok'); return;
        }
        setToken(''); clearCache(); await adminClient().auth.signOut({ scope: 'local' }).catch(() => {}); if (on) setState('pin');
      } catch (e) { console.error(e); if (on) { setWhy(String(e?.message || e).slice(0, 160)); setState('error'); } }
    })();
    return () => { on = false; };
  }, []);

  if (state === 'loading') return <div className="ad-center"><Dots /></div>;
  if (state === 'nodb') return <div className="ad-center"><p>The app is not connected to its database yet.</p></div>;
  if (state === 'error') return <div className="ad-center"><div className="ad-login"><h1>Could not open the app</h1><p>Please check your internet connection and try again.</p>{why && <p className="ad-help">{why}</p>}<button className="ad-btn" onClick={() => location.reload()}>Try again</button></div></div>;
  if (state === 'pin' || state === 'pin-setup') return <PinGate notConfigured={state === 'pin-setup'} onDone={(def) => { setDefFlag(def); setState('ok'); }} />;
  return (
    <ToastProvider><a className="ad-skip" href="#main" onClick={(e) => { e.preventDefault(); const m = document.getElementById("main"); m?.setAttribute("tabindex", "-1"); m?.focus(); }}>Skip to content</a><div className="ad-app">
      <aside className="ad-side"><Link href="/manager" className="ad-brand"><img src="/brand/logo-stacked-light.svg" alt="Thin Black Brush" height="40" /><span>Manager</span></Link>
        <nav aria-label="Main">{NAV.map(([h, t, ic]) => <Link key={h} href={h} className={active(path, h) ? 'on' : ''}><AIcon n={ic} />{h === '/manager/inbox' ? withCount(t, unread) : t}</Link>)}</nav>
        <div className="ad-side-f"><a href="/" target="_blank" rel="noopener">View website ↗</a><button onClick={async () => { await lockDevice(); clearCache(); location.reload(); }}><Icon n="logout" size={15} /> Log out</button></div></aside>
      <main className="ad-main" id="main"><ErrorBoundary key={path} screen>{children}</ErrorBoundary></main>
      <nav className="ad-tabs" aria-label="Main">{TABS.map(([h, t, ic]) => <Link key={h} href={h} className={active(path, h) || (h === '/manager/more' && !TABS.slice(0, 3).some(([x]) => active(path, x))) ? 'on' : ''}><AIcon n={ic} /><span>{h === '/manager/more' ? withCount(t, unread) : t}</span></Link>)}</nav>
    </div></ToastProvider>);
}
export function AIcon({ n }) { return <Icon n={n} size={20} />; }
