'use client';
import { useEffect, useRef, useState } from 'react';
import { pinApi, setToken, applySession } from '@/lib/adminApi';
import { Dots } from './kit';
// The sign-in screen: one card, four PIN boxes. A single invisible input sits on top of the boxes, so the phone's number pad opens,
// paste works, and screen readers still find one normal "PIN" field.
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
  return (<div className="ad-center pinpage"><form className="pin-card" onSubmit={(e) => { e.preventDefault(); submit(pin); }}>
    <img className="pin-logo" src="/brand/logo-stacked-light.svg" alt="Thin Black Brush" />
    <h1>Welcome back</h1>
    <p className="pin-sub">Enter your 4-digit PIN to open the Manager.</p>
    <div className={`pin-boxes ${shake ? 'shake' : ''} ${msg && !busy ? 'bad' : ''}`} onClick={() => input.current?.focus()}>
      {[0, 1, 2, 3].map((i) => <span key={i} className={`pin-box ${i < pin.length ? 'on' : ''} ${i === pin.length && !busy ? 'cur' : ''}`} aria-hidden="true">{i < pin.length && <i />}</span>)}
      <input ref={input} className="pin-input" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="off" aria-label="4-digit PIN" disabled={busy}
        value={pin} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setPin(v); setMsg(''); if (v.length === 4) setTimeout(() => submit(v), 80); }} />
    </div>
    <div className="pin-status" role="alert" aria-live="polite">{busy ? <Dots /> : msg ? <span className="pin-err">{msg}</span> : <span>This device will be remembered after you enter it once.</span>}</div>
    {notConfigured && <p className="pin-note"><b>Almost ready.</b> The website still needs one setting before the PIN can work. Please add the <b>SUPABASE_SECRET_KEY</b> setting in your hosting dashboard, then reload.</p>}
    <a className="pin-back" href="/">Back to the website</a>
  </form></div>);
}
