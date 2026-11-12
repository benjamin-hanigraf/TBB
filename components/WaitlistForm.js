'use client';
import { useState } from 'react';
import Icon from './Icons';
import { ruleProps } from '@/lib/rules';
import { RULES } from '@/lib/format';
// For a sold-out workshop: leave a name and email to be told first if a seat opens up.
export default function WaitlistForm({ slug }) {
  const [open, setOpen] = useState(false); const [state, setState] = useState('idle');
  async function submit(e) {
    e.preventDefault(); setState('sending'); const f = Object.fromEntries(new FormData(e.target));
    try { const r = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, name: RULES.name.done(f.name), email: RULES.email.done(f.email), phone: f.phone ? RULES.phone.done(f.phone) : '', seats: Number(f.seats) || 1, website: f.website }) }); setState(r.ok ? 'done' : 'error'); }
    catch { setState('error'); }
  }
  if (state === 'done') return <div className="notice ok" role="status"><Icon n="check" size={20} /> You are on the waitlist. We will contact you first if a seat opens up.</div>;
  if (!open) return <button className="btn fixw" onClick={() => setOpen(true)}><Icon n="calendar" size={17} /><span>Join waitlist</span></button>;
  return (<form autoComplete="off" onSubmit={submit} className="form" style={{ margin: '8px 0 0', maxWidth: 420 }}>
    <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
    <label><span>Name <i>*</i></span><input name="name" required autoComplete="off" {...ruleProps('name')} /></label>
    <label><span>Email <i>*</i></span><input name="email" type="email" required autoComplete="off" {...ruleProps('email')} /></label>
    <label><span>Phone <em>(optional)</em></span><input name="phone" type="tel" pattern="[0-9+\s\-]{10,16}" autoComplete="off" {...ruleProps('phone')} /></label>
    <label><span>Seats you would like <i>*</i></span><select name="seats" defaultValue="1">{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label>
    <button className="btn" disabled={state === 'sending'}><Icon n="check" size={17} /><span>{state === 'sending' ? 'Sending…' : 'Join waitlist'}</span></button>
    <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
    {state === 'error' && <p className="notice err" role="alert">We could not add you. Please try again.</p>}
  </form>);
}
