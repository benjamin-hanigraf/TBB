'use client';
import { useEffect, useRef, useState } from 'react';
import { pinApi, setToken, applySession } from '@/lib/adminApi';
import { Dots } from './kit';
export default function PinGate({ onDone, notConfigured }) {
  const [pin, setPin] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [shake, setShake] = useState(false); const input = useRef();
  useEffect(() => { input.current?.focus(); }, []);
  async function submit(p) {
    if (busy || p.length !== 4) return; setBusy(true); setMsg('');
    const r = await pinApi({ action: 'verify', pin: p });
    if (r.ok) { try { setToken(r.token); await applySession(r.session); onDone(r.defaultPin); } catch { setBusy(false); setPin(''); setMsg('Could not open the app. Please try again.'); } return; }
    setBusy(false); setPin(''); setShake(true); setTimeout(() => { setShake(false); input.current?.focus(); }, 400);
    setMsg(r.status === 429 ? `Too many wrong tries. Please wait ${r.retry_minutes || 15} minutes and try again.` : r.status === 401 ? 'That PIN is not right.' : r.status === 503 ? 'PIN protection is not set up yet.' : 'Something went wrong. Please try again.');
  }
  return (<div className="ad-center"><form className="ad-pin" onSubmit={(e) => { e.preventDefault(); submit(pin); }}>
    <img src="/icons/icon-192.png" alt="Thin Black Brush" width="64" height="64" />
    <h1>Enter your PIN</h1><p className="ad-help" style={{ margin: '4px 0 0' }}>Manager access. This device will be remembered after you enter it once.</p>
    {notConfigured && <p className="ad-err" style={{ marginTop: 16, textAlign: 'left', fontSize: 14 }}><b>Almost ready.</b> The website still needs one setting before the PIN can work. Open the <a href="/check" style={{ textDecoration: 'underline' }}>setup check</a> to see exactly what to add.</p>}
    <input ref={input} className={`ad-pininput ${shake ? 'shake' : ''}`} type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="off" aria-label="4-digit PIN" placeholder="••••" disabled={busy}
      value={pin} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setPin(v); if (v.length === 4) setTimeout(() => submit(v), 80); }} />
    <div style={{ height: 24, marginTop: 14 }}>{busy && <Dots />}</div>
    <p className="ad-pin-msg" role="alert">{msg}</p>
    <a className="ad-linkbtn" href="/">Back to the website</a></form></div>);
}
