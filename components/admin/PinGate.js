'use client';
import { useEffect, useState, useCallback } from 'react';
import { pinApi, setToken } from '@/lib/adminApi';
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
export default function PinGate({ email, onDone, onSignOut, notConfigured }) {
  const [pin, setPin] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [shake, setShake] = useState(false);
  const submit = useCallback(async (p) => {
    setBusy(true); setMsg('');
    const r = await pinApi({ action: 'verify', pin: p });
    if (r.ok) { setToken(r.token); onDone(r.defaultPin); return; }
    setBusy(false); setPin(''); setShake(true); setTimeout(() => setShake(false), 400);
    setMsg(r.status === 429 ? 'Too many wrong tries. Please wait 15 minutes and try again.' : r.status === 401 ? 'That PIN is not right.' : r.status === 503 ? 'PIN protection is not set up yet.' : 'Something went wrong. Please try again.');
  }, [onDone]);
  const press = useCallback((k) => {
    if (busy) return; if (k === '⌫') return setPin((p) => p.slice(0, -1));
    if (!/^\d$/.test(k)) return; setPin((p) => { if (p.length >= 4) return p; const n = p + k; if (n.length === 4) setTimeout(() => submit(n), 120); return n; });
  }, [busy, submit]);
  useEffect(() => { const h = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [press]);
  return (<div className="ad-center"><div className="ad-pin">
    <img src="/icons/icon-192.png" alt="Thin Black Brush" width="64" height="64" />
    <h1>Enter your PIN</h1><p className="ad-help" style={{ margin: '4px 0 0' }}>This is a new device for {email}. You only need to do this once.</p>
    {notConfigured ? <p className="ad-err" style={{ marginTop: 18 }}>PIN protection needs one setting added to the website (SUPABASE_SECRET_KEY). Please add it in Netlify, then reload.</p> : <>
      <div className={`ad-dots ${shake ? 'shake' : ''}`} role="status" aria-label={`${pin.length} of 4 digits entered`}>{[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}</div>
      <div className="ad-keys">{KEYS.map((k, i) => k === '' ? <span key={i} /> : <button key={i} type="button" aria-label={k === '⌫' ? 'Delete' : k} onClick={() => press(k)} disabled={busy}>{k}</button>)}</div>
      <p className="ad-pin-msg" role="alert">{msg}</p></>}
    <button className="ad-linkbtn" onClick={onSignOut}>Sign out</button></div></div>);
}
