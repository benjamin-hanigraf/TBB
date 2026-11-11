'use client';
import { useEffect, useState, useCallback } from 'react';
import { pinApi, setToken, applySession } from '@/lib/adminApi';
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
export default function PinGate({ onDone, notConfigured }) {
  const [pin, setPin] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [shake, setShake] = useState(false);
  const submit = useCallback(async (p) => {
    setBusy(true); setMsg('');
    const r = await pinApi({ action: 'verify', pin: p });
    if (r.ok) { try { setToken(r.token); await applySession(r.session); onDone(r.defaultPin); } catch { setBusy(false); setPin(''); setMsg('Could not open the app. Please try again.'); } return; }
    setBusy(false); setPin(''); setShake(true); setTimeout(() => setShake(false), 400);
    setMsg(r.status === 429 ? `Too many wrong tries. Please wait ${r.retry_minutes || 15} minutes and try again.` : r.status === 401 ? 'That PIN is not right.' : r.status === 503 ? 'PIN protection is not set up yet.' : 'Something went wrong. Please try again.');
  }, [onDone]);
  const press = useCallback((k) => {
    if (busy) return; if (k === '⌫') return setPin((p) => p.slice(0, -1));
    if (!/^\d$/.test(k)) return; setPin((p) => { if (p.length >= 4) return p; const n = p + k; if (n.length === 4) setTimeout(() => submit(n), 120); return n; });
  }, [busy, submit]);
  useEffect(() => { const h = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [press]);
  return (<div className="ad-center"><div className="ad-pin">
    <img src="/icons/icon-192.png" alt="Thin Black Brush" width="64" height="64" />
    <h1>Enter your PIN</h1><p className="ad-help" style={{ margin: '4px 0 0' }}>Manager access. This device will be remembered after you enter it once.</p>
    {notConfigured && <p className="ad-err" style={{ marginTop: 16, textAlign: 'left', fontSize: 14 }}><b>Almost ready.</b> The website still needs one setting before the PIN can work. Open the <a href="/check" style={{ textDecoration: 'underline' }}>setup check</a> to see exactly what to add.</p>}
      <div className={`ad-dots ${shake ? 'shake' : ''}`} role="status" aria-label={`${pin.length} of 4 digits entered`}>{[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}</div>
      <div className="ad-keys" style={notConfigured ? { opacity: .45 } : undefined}>{KEYS.map((k, i) => k === '' ? <span key={i} /> : <button key={i} type="button" aria-label={k === '⌫' ? 'Delete' : k} onClick={() => press(k)} disabled={busy}>{k}</button>)}</div>
      <p className="ad-pin-msg" role="alert">{msg}</p>
    <a className="ad-linkbtn" href="/">Back to the website</a></div></div>);
}
