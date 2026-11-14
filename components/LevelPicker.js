'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icons';
import Btn from './Btn';
import { ruleProps } from '@/lib/rules';
import { RULES } from '@/lib/format';
import { payWithRazorpay, postJson, payError } from '@/lib/pay';
import { supabase } from '@/lib/supabase-browser';
import { rupees } from '@/lib/data';
import { gstLine } from '@/lib/gst';

export default function LevelPicker({ classes, phone, whatsapp }) {
  const router = useRouter(); const [sel, setSel] = useState(''); const [open, setOpen] = useState(false); const [group, setGroup] = useState('child');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [pre, setPre] = useState({});
  const chosen = classes.find((c) => c.slug === sel); const panel = useRef(null); const formRef = useRef(null);
    const showPay = () => requestAnimationFrame(() => setTimeout(() => { const b = panel.current?.querySelector('.btn'); if (!b) return; const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; const over = b.getBoundingClientRect().bottom - (window.innerHeight - 24); if (over > 0) window.scrollBy({ top: over, behavior: calm ? 'auto' : 'smooth' }); }, 60));
  const reveal = (el, block) => { if (!el) return; const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches; requestAnimationFrame(() => el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block })); };
  useEffect(() => { const sb = supabase(); if (!sb || !open) return; sb.auth.getSession().then(async ({ data }) => { const u = data.session?.user; if (!u) return; const { data: p } = await sb.from('profiles').select('full_name,phone').eq('id', u.id).single(); setPre({ name: p?.full_name || '', email: u.email || '', phone: p?.phone || '' }); }); }, [open]);
  const label = chosen ? `${chosen.title}, ${chosen.level}` : '';
  const shown = chosen ? `${chosen.title} (${chosen.level})` : '';      // the details line above the Pay button: level in brackets
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr(''); const f = Object.fromEntries(new FormData(e.target));
    const body = { level: sel, student_name: group === 'child' ? RULES.name.done(f.student) : RULES.name.done(f.name), group, age: group === 'child' ? Number(f.age) : undefined, name: RULES.name.done(f.name), email: RULES.email.done(f.email), phone: RULES.phone.done(f.phone) };
    try {
      const sb = supabase(); const token = sb ? (await sb.auth.getSession()).data.session?.access_token : null;
      const o = await postJson('/api/checkout/class', body, token); if (!o.ok) { setErr((o.error === 'too_young' || o.error === 'too_old') ? 'Children must be between 5 and 15 years old.' : payError(o.error)); setBusy(false); return; }
      const r = await payWithRazorpay(o, o.title);
      const v = await postJson('/api/payments/verify', r); if (!v.ok) { setErr('Your payment went through, but we could not confirm it just yet. Please do not pay again. We will email your receipt shortly, or contact us.'); setBusy(false); return; }
      router.push(`/invoice/${o.enrolment_id}?thanks=1`);
    } catch (x) { setErr(x.message === 'dismissed' ? 'Payment cancelled. You have not been charged.' : 'The payment did not complete. You have not been charged.'); setBusy(false); }
  }
  const wa = `${whatsapp}?text=${encodeURIComponent(chosen ? `Hi, I would like to join ${label} (${rupees(chosen.price)}).` : 'Hi, I would like to know more about the writing classes.')}`;
  return (<>
    <div className="levels" role="radiogroup" aria-label="Class level">{classes.map((c) => (
      <label key={c.slug} className={`level ${c.tone ? `tone${c.tone}` : ''} ${sel === c.slug ? 'sel' : ''}`}>
        <input type="radio" className="sr" name="level" value={c.slug} checked={sel === c.slug} onChange={() => { setSel(c.slug); setErr(''); showPay(); }} />
        <span className="tag">{c.level}</span>
        <h3>{c.title}</h3><p className="desc">{c.text}</p>
        <ul className="covers">{c.covers.map((x) => <li key={x}><Icon n="check" size={15} /><span>{x}</span></li>)}</ul>
        <p className="foot">{c.sessions || 8} classes</p>
</label>))}</div>
    <div className="enrol" aria-live="polite" ref={panel}>
      <p className="small center">{chosen ? <>You chose <b>{shown}</b>, {rupees(chosen.price)}{chosen.gstMode === 'add' ? ' + 18% GST' : chosen.gstMode === 'included' ? ' incl. GST' : ''} for {chosen.sessions || 8} classes.</> : 'Choose a level to continue.'}</p>
      {!open && <div className="row c"><Btn icon="wallet" className="fixw" disabled={!chosen} onClick={() => { setOpen(true); setTimeout(() => reveal(formRef.current, 'start'), 60); }}>{chosen ? `Pay ${rupees(gstLine(chosen.price, 1, chosen.gstMode).total)}` : 'Pay'}</Btn></div>}
      {open && chosen && (
        <form autoComplete="off" onSubmit={submit} className="form" style={{ marginTop: 20 }} ref={formRef}>
          <label><span>Who is attending? <i>*</i></span><select value={group} onChange={(e) => { setGroup(e.target.value); setErr(''); }}><option value="child">A child (age 5 to 15)</option><option value="adult">An adult</option></select></label>
          {group === 'child' ? <>
            <label><span>Participant's name <i>*</i></span><input name="student" required autoComplete="off" {...ruleProps('name')} /></label>
            <label><span>Participant's age <i>*</i></span><input name="age" required inputMode="numeric" pattern="([5-9]|1[0-5])" title="Age between 5 and 15" {...ruleProps('digits')} /></label>
            <label><span>Parent's name (C/o) <i>*</i></span><input name="name" required defaultValue={pre.name} key={'n' + pre.name} autoComplete="off" {...ruleProps('name')} /></label></>
          : <label><span>Your name <i>*</i></span><input name="name" required defaultValue={pre.name} key={'na' + pre.name} autoComplete="off" {...ruleProps('name')} /></label>}
          <label><span>Email <i>*</i></span><input name="email" type="email" required defaultValue={pre.email} key={'e' + pre.email} autoComplete="off" {...ruleProps('email')} /></label>
          <label><span>Phone <i>*</i></span><input name="phone" type="tel" required defaultValue={pre.phone} key={'p' + pre.phone} pattern="[0-9+\s\-]{10,16}" autoComplete="off" {...ruleProps('phone')} /></label>
          <button className="btn fixw" disabled={busy}><Icon n="wallet" size={17} /><span>{busy ? 'Please wait…' : `Pay ${rupees(gstLine(chosen.price, 1, chosen.gstMode).total)}`}</span></button>
          <button type="button" className="btn ghost" onClick={() => setOpen(false)}>Back</button>
          {err && <p className="notice err" role="alert">{err}</p>}
          <p className="small center">Secure payment by Razorpay. We will contact you with the class schedule after your payment.</p></form>)}
    </div></>);
}
