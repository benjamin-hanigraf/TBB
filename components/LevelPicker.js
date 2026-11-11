'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icons';
import Btn from './Btn';
import { ruleProps } from '@/lib/rules';
import { RULES } from '@/lib/format';
import { payWithRazorpay, postJson, payError } from '@/lib/pay';
import { supabase } from '@/lib/supabase-browser';
import { rupees } from '@/lib/data';

export default function LevelPicker({ classes, phone, whatsapp }) {
  const router = useRouter(); const [sel, setSel] = useState(''); const [open, setOpen] = useState(false); const [group, setGroup] = useState('child');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [pre, setPre] = useState({});
  const chosen = classes.find((c) => c.slug === sel);
  useEffect(() => { const sb = supabase(); if (!sb || !open) return; sb.auth.getSession().then(async ({ data }) => { const u = data.session?.user; if (!u) return; const { data: p } = await sb.from('profiles').select('full_name,phone').eq('id', u.id).single(); setPre({ name: p?.full_name || '', email: u.email || '', phone: p?.phone || '' }); }); }, [open]);
  const label = chosen ? `${chosen.title}, ${chosen.level}` : '';
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr(''); const f = Object.fromEntries(new FormData(e.target));
    const body = { level: sel, student_name: RULES.name.done(f.student), group, age: group === 'child' ? Number(f.age) : undefined, name: RULES.name.done(f.name), email: RULES.email.done(f.email), phone: RULES.phone.done(f.phone) };
    try {
      const sb = supabase(); const token = sb ? (await sb.auth.getSession()).data.session?.access_token : null;
      const o = await postJson('/api/checkout/class', body, token); if (!o.ok) { setErr(o.error === 'too_young' ? 'Classes are for ages 5 and above.' : payError(o.error)); setBusy(false); return; }
      const r = await payWithRazorpay(o, o.title);
      const v = await postJson('/api/payments/verify', r); if (!v.ok) { setErr('Your payment went through, but we could not confirm it just yet. Please do not pay again. We will email your receipt shortly, or contact us.'); setBusy(false); return; }
      router.push(`/invoice/${o.enrolment_id}?thanks=1`);
    } catch (x) { setErr(x.message === 'dismissed' ? 'Payment cancelled. You have not been charged.' : 'The payment did not complete. You have not been charged.'); setBusy(false); }
  }
  const wa = `${whatsapp}?text=${encodeURIComponent(chosen ? `Hi, I would like to join ${label} (${rupees(chosen.price)}).` : 'Hi, I would like to know more about the writing classes.')}`;
  return (<>
    <div className="levels" role="radiogroup" aria-label="Class level">{classes.map((c) => (
      <label key={c.slug} className={`level ${c.track === 'Calligraphy' ? 'cal' : ''} ${sel === c.slug ? 'sel' : ''}`}>
        <input type="radio" className="sr" name="level" value={c.slug} checked={sel === c.slug} onChange={() => { setSel(c.slug); setErr(''); }} />
        <span className="tag">{c.track === 'Calligraphy' ? 'Handwriting + Calligraphy' : 'Handwriting'}</span>
        <h3>{c.title}</h3><p className="small lv">{c.level}</p><p className="desc">{c.text}</p>
        <ul className="covers">{c.covers.map((x) => <li key={x}><Icon n="check" size={15} /><span>{x}</span></li>)}</ul>
        <p className="foot">{rupees(c.price)}<span> · {c.sessions || 8} classes</span></p>
        <span className="pick" aria-hidden="true">{sel === c.slug ? 'Selected' : 'Select'}</span></label>))}</div>
    <div className="enrol" aria-live="polite">
      <p className="small center">{chosen ? <>You chose <b>{label}</b>, {rupees(chosen.price)} for {chosen.sessions || 8} classes.</> : 'Choose a level to continue.'}</p>
      {!open && <div className="row c"><Btn icon="ticket" disabled={!chosen} onClick={() => setOpen(true)}>{chosen ? `Enrol and pay ${rupees(chosen.price)}` : 'Enrol and pay'}</Btn>
        <Btn href={`tel:${phone.replace(/\s/g, '')}`} variant="ghost" icon="phone">Call</Btn><Btn href={wa} variant="ghost" icon="chat" target="_blank" rel="noopener noreferrer">WhatsApp</Btn></div>}
      {open && chosen && (
        <form onSubmit={submit} className="form" style={{ marginTop: 20 }}>
          <label><span>Student's name <i>*</i></span><input name="student" required autoComplete="off" {...ruleProps('name')} /></label>
          <label><span>The student is <i>*</i></span><select value={group} onChange={(e) => setGroup(e.target.value)}><option value="child">A child (age 5 and above)</option><option value="adult">An adult</option></select></label>
          {group === 'child' && <label><span>Age <i>*</i></span><input name="age" required inputMode="numeric" pattern="([5-9]|1[0-7])" title="Age between 5 and 17" {...ruleProps('digits')} /></label>}
          <label><span>Your name <i>*</i></span><input name="name" required defaultValue={pre.name} key={'n' + pre.name} autoComplete="name" {...ruleProps('name')} /></label>
          <label><span>Email <i>*</i></span><input name="email" type="email" required defaultValue={pre.email} key={'e' + pre.email} autoComplete="email" {...ruleProps('email')} /></label>
          <label><span>Phone <i>*</i></span><input name="phone" type="tel" required defaultValue={pre.phone} key={'p' + pre.phone} pattern="[0-9+\s\-]{10,16}" autoComplete="tel" {...ruleProps('phone')} /></label>
          <button className="btn" disabled={busy}><Icon n="ticket" size={17} /><span>{busy ? 'Please wait…' : `Pay ${rupees(chosen.price)}`}</span></button>
          <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Back</button>
          {err && <p className="notice err" role="alert">{err}</p>}
          <p className="small center">Secure payment by Razorpay. We will contact you with the class schedule after your payment.</p></form>)}
    </div></>);
}
