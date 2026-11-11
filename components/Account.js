'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';
import Icon from './Icons';
import { ruleProps } from '@/lib/rules';
import { cleanEmail, RULES } from '@/lib/format';
import { rupees, fmtDate } from '@/lib/data';

const GoogleMark = () => (<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.500c3.540 0 6.710 1.220 9.210 3.600l6.850-6.850C35.900 2.380 30.470 0 24 0 14.620 0 6.510 5.380 2.560 13.220l7.980 6.190C12.430 13.720 17.740 9.500 24 9.500z"/><path fill="#4285F4" d="M46.980 24.550c0-1.570-.15-3.090-.38-4.550H24v9.020h12.940c-.58 2.960-2.260 5.480-4.780 7.180l7.730 6c4.510-4.180 7.090-10.360 7.090-17.650z"/><path fill="#FBBC05" d="M10.530 28.590A14.500 14.500 0 0 1 9.500 24c0-1.590.28-3.140.76-4.590l-7.980-6.190A23.990 23.990 0 0 0 0 24c0 3.770.9 7.350 2.560 10.780l7.970-6.190z"/><path fill="#34A853" d="M24 48c6.480 0 11.930-2.130 15.890-5.810l-7.730-6c-2.150 1.450-4.920 2.300-8.160 2.300-6.260 0-11.570-4.220-13.470-9.910l-7.980 6.190C6.510 42.620 14.620 48 24 48z"/></svg>);

export function Login({ sb }) {
  const [step, setStep] = useState('email'); const [email, setEmail] = useState(''); const [mode, setMode] = useState('login'); const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function sendLink(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: mode === 'signup', ...(mode === 'signup' ? { data: { full_name: RULES.name.done(name), phone: RULES.phone.done(phone) } } : {}), emailRedirectTo: `${window.location.origin}/account` } });
    setBusy(false); if (error) setMsg(mode === 'login' ? 'We could not find an account with that email. New here? Choose Sign up.' : 'We could not send the link. Please check your details and try again.'); else setStep('sent');
  }
  async function google() {
    await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/account` } });
  }
  return (
    <div className="form" style={{ marginTop: 40 }}>
      {process.env.NEXT_PUBLIC_GOOGLE_LOGIN === '1' && <><button type="button" className="btn ghost" onClick={google}><GoogleMark /><span>Google</span></button>
      <p className="small center" style={{ margin: '2px 0' }}>or use your email</p></>}
      {step === 'email' ? (
        <form autoComplete="off" onSubmit={sendLink} className="form" style={{ margin: 0 }}>
          {mode === 'signup' && <><label><span>Name <i>*</i></span><input required value={name} onChange={(e) => setName(RULES.name.typing(e.target.value))} onBlur={(e) => setName(RULES.name.done(e.target.value))} autoComplete="off" autoCapitalize="words" /></label>
          <label><span>Phone <i>*</i></span><input type="tel" required inputMode="tel" pattern="[0-9+\s\-]{10,16}" value={phone} onChange={(e) => setPhone(RULES.phone.typing(e.target.value))} autoComplete="off" /></label></>}
          <label><span>Email <i>*</i></span><input type="email" required value={email} onChange={(e) => setEmail(cleanEmail(e.target.value))} autoComplete="off" autoCapitalize="none" spellCheck={false} /></label>
          <button className="btn" disabled={busy}><Icon n="mail" size={17} /><span>{busy ? 'Sending…' : 'Send link'}</span></button>
          <button type="button" className="link center" style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--mute)', font: 'inherit' }} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(''); }}>{mode === 'login' ? 'New here? Sign up' : 'Have an account? Log in'}</button>
        </form>) : (
        <div className="form" style={{ margin: 0 }}>
          <p className="notice ok" style={{ margin: 0 }}><Icon n="mail" size={20} /> We emailed a sign-in link to {email}. Open it on this device to log in.</p>
          <p className="small center" style={{ margin: 0 }}>It can take a minute to arrive. Please check your spam folder too.</p>
          <button type="button" className="btn ghost" onClick={() => { setStep('email'); setMsg(''); }}>Use a different email</button>
        </div>)}
      {msg && <p className="notice err" role="alert">{msg}</p>}
      
    </div>);
}

function Profile({ sb, user }) {
  const [p, setP] = useState(null); const [saved, setSaved] = useState('');
  useEffect(() => { sb.from('profiles').select('full_name,phone,marketing_opt_in').eq('id', user.id).single().then(({ data }) => setP(data || {})); }, [sb, user.id]);
  async function save(e) {
    e.preventDefault(); const f = new FormData(e.target);
    const { error } = await sb.from('profiles').update({ full_name: f.get('name'), phone: f.get('phone'), marketing_opt_in: f.get('opt') === 'on' }).eq('id', user.id);
    setSaved(error ? 'error' : 'ok');
  }
  if (!p) return null;
  return (
    <form autoComplete="off" onSubmit={save} className="form" style={{ margin: '24px auto 0' }}>
      <label><span>Name <i>*</i></span><input name="name" required defaultValue={p.full_name || ''} autoComplete="off" {...ruleProps('name')} /></label>
      <label><span>Phone <i>*</i></span><input name="phone" type="tel" required defaultValue={p.phone || ''} pattern="[0-9+\s\-]{10,16}" inputMode="tel" autoComplete="off" {...ruleProps('phone')} /></label>
      <label className="check"><input type="checkbox" name="opt" defaultChecked={p.marketing_opt_in} /><span>Send me news about new workshops and products</span></label>
      <button className="btn"><Icon n="check" size={17} /><span>Save</span></button>
      {saved === 'ok' && <p className="notice ok">Saved.</p>}{saved === 'error' && <p className="notice err">Could not save. Please try again.</p>}
    </form>);
}

function History({ sb, user }) {
  const [b, setB] = useState(null); const [o, setO] = useState(null); const [cl, setCl] = useState(null);
  useEffect(() => {
    sb.from('bookings').select('id,seats,amount_paise,status,created_at,workshops(title,starts_at)').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setB(data || []));
    sb.from('orders').select('id,total_paise,status,created_at,order_items(title,qty)').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setO(data || []));
    sb.from('class_enrolments').select('id,amount_paise,status,created_at,student_name,class_levels(title,level)').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setCl(data || []));
  }, [sb, user.id]);
  const label = (s) => ({ paid: 'Confirmed', pending: 'Awaiting payment', cancelled: 'Cancelled', refunded: 'Refunded', transferred: 'Transferred', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered' }[s] || s);
  return (<div className="acct-list">
    <h3 className="center" style={{ marginBottom: 8 }}>Workshop bookings</h3>
    {b && !b.length && <p className="small center">No bookings yet.</p>}
    {(b || []).map((x) => (<div key={x.id} className="acct-row"><div><b>{x.workshops?.title}</b><p className="small">{x.workshops && fmtDate(x.workshops.starts_at)} · {x.seats} {x.seats > 1 ? 'seats' : 'seat'}</p></div><div className="end"><span>{rupees(x.amount_paise / 100)}</span><p className="small">{label(x.status)}</p></div></div>))}
    <h3 className="center" style={{ margin: '40px 0 8px' }}>Writing classes</h3>
    {cl && !cl.length && <p className="small center">No class enrolments yet.</p>}
    {(cl || []).map((x) => (<div key={x.id} className="acct-row"><div><b>{x.class_levels?.title}, {x.class_levels?.level}</b><p className="small">For {x.student_name} · {fmtDate(x.created_at)}</p></div><div className="end"><span>{rupees(x.amount_paise / 100)}</span><p className="small">{label(x.status)}</p></div></div>))}
    <h3 className="center" style={{ margin: '40px 0 8px' }}>Orders</h3>
    {o && !o.length && <p className="small center">No orders yet.</p>}
    {(o || []).map((x) => (<div key={x.id} className="acct-row"><div><b>{(x.order_items || []).map((i) => `${i.title} × ${i.qty}`).join(', ')}</b><p className="small">{fmtDate(x.created_at)}</p></div><div className="end"><span>{rupees(x.total_paise / 100)}</span><p className="small">{label(x.status)}</p></div></div>))}
  </div>);
}

export default function Account() {
  const sb = supabase(); const [session, setSession] = useState(undefined);
  useEffect(() => {
    if (!sb) { setSession(null); return; }
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s)); return () => sub.subscription.unsubscribe();
  }, [sb]);
  if (!sb) return <p className="notice err">Login is not available right now. Please try again later.</p>;
  if (session === undefined) return <p className="small center">Loading…</p>;
  if (!session) return <Login sb={sb} />;
  const user = session.user;
  return (<>
    <p className="lead" style={{ marginTop: 0 }}>Signed in as {user.email}</p>
    <div className="row c"><button className="btn ghost" onClick={() => sb.auth.signOut()}><Icon n="user" size={17} /><span>Log out</span></button></div>
    <div className="acct-sec"><h2>Your details</h2><Profile sb={sb} user={user} /></div>
    <div className="acct-sec"><h2>Your bookings and orders</h2><History sb={sb} user={user} /></div>
  </>);
}
