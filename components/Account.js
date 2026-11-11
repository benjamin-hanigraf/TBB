'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';
import Icon from './Icons';
import { rupees, fmtDate } from '@/lib/data';

const GoogleMark = () => (<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.500c3.540 0 6.710 1.220 9.210 3.600l6.850-6.850C35.900 2.380 30.470 0 24 0 14.620 0 6.510 5.380 2.560 13.220l7.980 6.190C12.430 13.720 17.740 9.500 24 9.500z"/><path fill="#4285F4" d="M46.980 24.550c0-1.570-.15-3.090-.38-4.550H24v9.020h12.940c-.58 2.960-2.260 5.480-4.780 7.180l7.730 6c4.510-4.180 7.090-10.360 7.090-17.650z"/><path fill="#FBBC05" d="M10.530 28.590A14.500 14.500 0 0 1 9.500 24c0-1.590.28-3.140.76-4.590l-7.980-6.190A23.990 23.990 0 0 0 0 24c0 3.770.9 7.350 2.560 10.780l7.970-6.190z"/><path fill="#34A853" d="M24 48c6.480 0 11.930-2.130 15.890-5.810l-7.730-6c-2.150 1.450-4.920 2.300-8.160 2.300-6.260 0-11.570-4.220-13.470-9.910l-7.980 6.190C6.510 42.620 14.620 48 24 48z"/></svg>);

function Login({ sb }) {
  const [step, setStep] = useState('email'); const [email, setEmail] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function sendCode(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false); if (error) setMsg('We could not send the code. Please check the email address and try again.'); else setStep('code');
  }
  async function verify(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    const token = new FormData(e.target).get('code').toString().trim();
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token, type: 'email' });
    setBusy(false); if (error) setMsg('That code is not right, or it has expired. Please try again.');
  }
  async function google() {
    await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/account` } });
  }
  return (
    <div className="form" style={{ marginTop: 40 }}>
      <button type="button" className="btn ghost" onClick={google}><GoogleMark /><span>Continue with Google</span></button>
      <p className="small center" style={{ margin: '2px 0' }}>or use your email</p>
      {step === 'email' ? (
        <form onSubmit={sendCode} className="form" style={{ margin: 0 }}>
          <label><span>Email <i>*</i></span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <button className="btn" disabled={busy}><Icon n="mail" size={17} /><span>{busy ? 'Sending…' : 'Email me a code'}</span></button>
        </form>) : (
        <form onSubmit={verify} className="form" style={{ margin: 0 }}>
          <p className="notice" style={{ margin: 0 }}>We sent a code to {email}. It can take a minute to arrive.</p>
          <label><span>Code <i>*</i></span><input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} placeholder="6-digit code" /></label>
          <button className="btn" disabled={busy}><Icon n="check" size={17} /><span>{busy ? 'Checking…' : 'Log in'}</span></button>
          <button type="button" className="btn ghost" onClick={() => { setStep('email'); setMsg(''); }}>Use a different email</button>
        </form>)}
      {msg && <p className="notice err" role="alert">{msg}</p>}
      <p className="small center">New here? Just enter your email and we will create your account.</p>
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
    <form onSubmit={save} className="form" style={{ margin: '24px auto 0' }}>
      <label><span>Name <i>*</i></span><input name="name" required defaultValue={p.full_name || ''} autoComplete="name" /></label>
      <label><span>Phone <i>*</i></span><input name="phone" type="tel" required defaultValue={p.phone || ''} pattern="[0-9+\s\-]{10,16}" inputMode="tel" autoComplete="tel" /></label>
      <label className="check"><input type="checkbox" name="opt" defaultChecked={p.marketing_opt_in} /><span>Send me news about new workshops and products</span></label>
      <button className="btn"><Icon n="check" size={17} /><span>Save</span></button>
      {saved === 'ok' && <p className="notice ok">Saved.</p>}{saved === 'error' && <p className="notice err">Could not save. Please try again.</p>}
    </form>);
}

function Addresses({ sb, user }) {
  const [rows, setRows] = useState([]); const [adding, setAdding] = useState(false);
  const load = useCallback(() => sb.from('addresses').select('*').eq('user_id', user.id).order('created_at').then(({ data }) => setRows(data || [])), [sb, user.id]);
  useEffect(() => { load(); }, [load]);
  async function add(e) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    await sb.from('addresses').insert({ user_id: user.id, label: f.label, recipient: f.recipient, phone: f.phone, line1: f.line1, line2: f.line2 || null, city: f.city, state: f.state, pincode: f.pincode });
    setAdding(false); load();
  }
  async function del(id) { await sb.from('addresses').delete().eq('id', id); load(); }
  return (<div className="acct-list">
    {rows.map((a) => (<div key={a.id} className="acct-row"><div><b>{a.label}</b><p className="small">{a.recipient}{a.phone ? ` · ${a.phone}` : ''}</p><p className="small">{[a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ')}</p></div><button className="link" onClick={() => del(a.id)}>Remove</button></div>))}
    {!rows.length && !adding && <p className="small center">No saved addresses yet.</p>}
    {adding ? (
      <form onSubmit={add} className="form" style={{ margin: '16px auto 0' }}>
        <label><span>Label <i>*</i></span><select name="label" required defaultValue=""><option value="" disabled>Select</option><option>Home</option><option>Work</option><option>Other</option></select></label>
        <label><span>Recipient name <i>*</i></span><input name="recipient" required /></label>
        <label><span>Phone <i>*</i></span><input name="phone" type="tel" required pattern="[0-9+\s\-]{10,16}" /></label>
        <label><span>Address line 1 <i>*</i></span><input name="line1" required /></label>
        <label><span>Address line 2 <em>(optional)</em></span><input name="line2" /></label>
        <label><span>City <i>*</i></span><input name="city" required /></label>
        <label><span>State <i>*</i></span><input name="state" required /></label>
        <label><span>Pincode <i>*</i></span><input name="pincode" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} title="6-digit pincode" /></label>
        <button className="btn"><Icon n="check" size={17} /><span>Save address</span></button>
        <button type="button" className="btn ghost" onClick={() => setAdding(false)}>Cancel</button>
      </form>) : <div className="row c"><button className="btn ghost" onClick={() => setAdding(true)}><Icon n="pin" size={17} /><span>Add address</span></button></div>}
  </div>);
}

function History({ sb, user }) {
  const [b, setB] = useState(null); const [o, setO] = useState(null);
  useEffect(() => {
    sb.from('bookings').select('id,seats,amount_paise,status,created_at,workshops(title,starts_at)').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setB(data || []));
    sb.from('orders').select('id,total_paise,status,created_at,order_items(title,qty)').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setO(data || []));
  }, [sb, user.id]);
  const label = (s) => ({ paid: 'Confirmed', pending: 'Awaiting payment', cancelled: 'Cancelled', refunded: 'Refunded', transferred: 'Transferred', packed: 'Packed', shipped: 'Shipped', delivered: 'Delivered' }[s] || s);
  return (<div className="acct-list">
    <h3 className="center" style={{ marginBottom: 8 }}>Workshop bookings</h3>
    {b && !b.length && <p className="small center">No bookings yet.</p>}
    {(b || []).map((x) => (<div key={x.id} className="acct-row"><div><b>{x.workshops?.title}</b><p className="small">{x.workshops && fmtDate(x.workshops.starts_at)} · {x.seats} {x.seats > 1 ? 'seats' : 'seat'}</p></div><div className="end"><span>{rupees(x.amount_paise / 100)}</span><p className="small">{label(x.status)}</p></div></div>))}
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
    <div className="acct-sec"><h2>Saved addresses</h2><Addresses sb={sb} user={user} /></div>
    <div className="acct-sec"><h2>Your bookings and orders</h2><History sb={sb} user={user} /></div>
  </>);
}
