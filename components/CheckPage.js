'use client';
import { useEffect, useState } from 'react';
// A plain page that shows what this browser and the website can do. Safe to share a screenshot of.
export default function CheckPage() {
  const [rows, setRows] = useState([]); const [health, setHealth] = useState(null); const [msg, setMsg] = useState('');
  useEffect(() => {
    const r = []; const add = (label, ok, note = '') => r.push({ label, ok, note });
    const t = (fn) => { try { return fn(); } catch (e) { return false; } };
    add('This page loaded and its code runs', true, 'JavaScript works');
    add('Browser', null, navigator.userAgent);
    add('Can remember things on this device', t(() => { localStorage.setItem('tbb-check', '1'); const v = localStorage.getItem('tbb-check') === '1'; localStorage.removeItem('tbb-check'); return v; }), 'Needed to remember the PIN. Turn off Private Browsing if this says No.');
    add('Secure random IDs', t(() => typeof crypto.randomUUID === 'function'), 'Needs iOS or Safari 15.4 or newer. The app has a fallback.');
    add('Background services supported', t(() => 'serviceWorker' in navigator));
    add('Modern screen sizing', t(() => CSS.supports('height', '100dvh')), 'Older Safari shows the app slightly differently but it still works.');
    add('Offline storage lock', t(() => !!navigator.locks), 'Used by login. The app works without it.');
    setRows(r);
    fetch('/api/health').then((x) => x.json()).then(setHealth).catch(() => setHealth({ error: true }));
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (url && key) fetch(`${url}/rest/v1/settings?select=key&limit=1`, { headers: { apikey: key } }).then((x) => setRows((p) => [...p, { label: 'This browser can reach the database', ok: x.ok, note: `Answer ${x.status}` }])).catch(() => setRows((p) => [...p, { label: 'This browser can reach the database', ok: false, note: 'Blocked or offline. A content blocker or privacy setting may be stopping it.' }]));
    else setRows((p) => [...p, { label: 'Website knows its database address', ok: false, note: 'NEXT_PUBLIC_SUPABASE_URL is missing in Netlify.' }]);
  }, []);
  async function reset() {
    try { const regs = await navigator.serviceWorker?.getRegistrations?.(); for (const g of regs || []) await g.unregister(); const ks = await caches?.keys?.(); for (const k of ks || []) await caches.delete(k); } catch {}
    try { ['tbb-device-token', 'tbb-device-id', 'tbb-admin-auth'].forEach((k) => localStorage.removeItem(k)); sessionStorage.clear(); } catch {}
    setMsg('Done. The Manager app on this device is reset. Open /manager again.');
  }
  const mark = (ok) => (ok === null ? '•' : ok ? '✓' : '✗');
  return (<main style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 80px', fontFamily: '-apple-system, system-ui, sans-serif', color: '#1d1d1f', lineHeight: 1.5 }}>
    <h1 style={{ fontSize: 30, letterSpacing: '-.02em' }}>Setup check</h1><p style={{ color: '#6e6e73' }}>This shows what this browser and the website can do. It never shows passwords or keys.</p>
    <h2 style={{ fontSize: 19, margin: '28px 0 8px' }}>This browser</h2>
    {rows.map((x, i) => <p key={i} style={{ margin: '8px 0', display: 'flex', gap: 10 }}><b style={{ width: 18, color: x.ok === false ? '#b42318' : x.ok ? '#14532d' : '#6e6e73' }}>{mark(x.ok)}</b><span><b style={{ fontWeight: 600 }}>{x.label}</b>{x.note && <><br /><span style={{ color: '#6e6e73', fontSize: 14, wordBreak: 'break-word' }}>{x.note}</span></>}</span></p>)}
    <h2 style={{ fontSize: 19, margin: '28px 0 8px' }}>The website</h2>
    {!health && <p style={{ color: '#6e6e73' }}>Checking…</p>}
    {health?.error && <p style={{ color: '#b42318' }}>Could not reach the website's status report.</p>}
    {health && !health.error && <>
      <p><b>Manager app (PIN): </b><b style={{ color: health.managerApp.ready ? '#14532d' : '#b42318' }}>{health.managerApp.ready ? 'ready' : 'not ready'}</b></p>
      {[...health.managerApp.needs, ...health.laterSteps].map((n, i) => <p key={i} style={{ margin: '6px 0', color: health.managerApp.needs.includes(n) ? '#7a1f1f' : '#6e6e73', fontSize: 15 }}>{health.managerApp.needs.includes(n) ? 'To do now: ' : 'Later: '}{n}</p>)}
      <p style={{ color: '#6e6e73', fontSize: 14 }}>Database parts: {Object.entries(health.database).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v ? '✓' : '✗'}`).join(' · ')}<br />Payments {health.payments ? '✓' : '✗'} · Payment confirmations {health.webhook ? '✓' : '✗'} · Emails {health.emails ? '✓' : '✗'} · Google login {health.googleLogin ? '✓' : '✗'}</p></>}
    <h2 style={{ fontSize: 19, margin: '28px 0 8px' }}>Start the Manager app fresh on this device</h2>
    <p style={{ color: '#6e6e73', fontSize: 15 }}>If the Manager app ever looks stuck, this clears its saved settings on this device only.</p>
    <button onClick={reset} style={{ minHeight: 46, padding: '0 22px', borderRadius: 99, border: 0, background: '#1d1d1f', color: '#fff', fontSize: 16, cursor: 'pointer' }}>Reset the app on this device</button>
    {msg && <p role="status" style={{ marginTop: 14, color: '#14532d' }}>{msg}</p>}
    <p style={{ marginTop: 28 }}><a href="/manager" style={{ color: '#1d1d1f' }}>Open the Manager app</a></p></main>);
}
