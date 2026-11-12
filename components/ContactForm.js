'use client';
// The one form for every kind of message. The "What is this about?" choice decides which extra questions appear.
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Icon from './Icons';
import { ruleProps, ruleFor } from '@/lib/rules';
import { RULES } from '@/lib/format';

export const TOPICS = {
  service: { label: 'A custom service', kind: 'service', phone: true, ask: 'What would you like us to customise?', submit: 'Send', done: 'Thanks for submitting. We will call you soon.' },
  invitation: { label: 'A custom invitation', kind: 'invitation', phone: true, ask: 'What do you have in mind?', submit: 'Send', done: 'Thank you for getting in touch. We will get back to you at the earliest.' },
  collaboration: { label: 'A collaboration', kind: 'collaboration', phone: false, ask: 'Your idea', submit: 'Send', done: 'Thank you for reaching out. We will be in touch soon.' },
  hiring: { label: 'An employment enquiry', kind: 'hiring', phone: true, ask: 'Experience', submit: 'Apply', done: 'Thank you for getting in touch. We will be in touch soon.' },
};
const HEADS = {
  '': ['How can we help?', 'Choose what this is about and we will ask only what we need.'],
  invitation: ['Let us design your invitation.', 'Tell us about the occasion and we will send you an estimate.'],
  service: ['Tell us what you need.', 'Describe what you would like made and we will call you.'],
  collaboration: ['Let us make something together.', 'Share your idea and we will be in touch.'],
  hiring: ['Come and work with us.', 'Love art and teaching? Tell us about your experience.'],
};
function Head({ topic }) { const [h, p] = HEADS[topic] || HEADS['']; return <div className="head"><p className="eyebrow">Write to us</p><h2>{h}</h2><p className="lead">{p}</p></div>; }
const EVENTS = ['Wedding', 'Corporate event', 'Birthday', 'Other'];
const CUSTOMISE = ['Invitations', 'Stationery', 'Calligraphy artwork', 'Gifts', 'Something else'];

function Inner() {
  const sp = useSearchParams(); const fromUrl = sp.get('topic'); const pre = sp.get('for') || '';
  const [topic, setTopic] = useState(TOPICS[fromUrl] ? fromUrl : 'service'); const [state, setState] = useState('idle'); const ref = useRef();
  useEffect(() => { if (TOPICS[fromUrl]) setTopic(fromUrl); }, [fromUrl]);
  const t = TOPICS[topic];
  async function onSubmit(e) {
    e.preventDefault(); if (!t) return; setState('sending');
    const data = Object.fromEntries(new FormData(e.target)); delete data.topic;
    for (const k of Object.keys(data)) { const r = RULES[ruleFor(k)]; if (r && data[k]) data[k] = r.done(String(data[k])); }
    try {
      const r = await fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: t.kind, ...data }) });
      setState(r.ok ? 'done' : 'error'); if (r.ok) e.target.reset();
    } catch { setState('error'); }
  }
  if (state === 'done') return <><Head topic={topic} /><div className="notice ok" role="status"><Icon n="check" size={20} /> {t.done}</div></>;
  const text = (name, label, { required, type = 'text', ...rest } = {}) => <label key={name}><span>{label}{required ? <i aria-hidden="true"> *</i> : <em> (optional)</em>}</span>
    <input name={name} type={type} required={required} maxLength={200} autoComplete="off" data-lpignore="true" data-1p-ignore="true"
      {...(type === 'tel' ? { pattern: '[0-9+\\s\\-]{10,16}', title: 'Enter a valid phone number', inputMode: 'tel' } : {})} {...ruleProps(ruleFor(name))} {...rest} /></label>;
  const select = (name, label, options, required = true) => <label key={name}><span>{label}{required ? <i aria-hidden="true"> *</i> : <em> (optional)</em>}</span>
    <select name={name} required={required} defaultValue={options.includes(pre) ? pre : ''} autoComplete="off"><option value="" disabled>Select</option>{options.map((o) => <option key={o}>{o}</option>)}</select></label>;
  return (<>
    <Head topic={topic} />
    <form ref={ref} autoComplete="off" onSubmit={onSubmit} className="form">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      <label><span>What is this about? <i aria-hidden="true"> *</i></span>
        <select name="topic" required value={topic} onChange={(e) => { setTopic(e.target.value); setState('idle'); }}>{Object.entries(TOPICS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
      {t && <>
        {text('name', 'Name', { required: true })}
        {topic === 'collaboration' && text('organisation', 'Organisation')}
        {text('email', 'Email', { required: true, type: 'email' })}
        {text('phone', 'Phone', { required: t.phone, type: 'tel' })}
        {topic === 'invitation' && select('event', 'Event type', EVENTS)}
        {topic === 'invitation' && <label><span>Event date <em>(optional)</em></span><input name="date" type="text" inputMode="numeric" placeholder="DD/MM/YYYY" maxLength={10} pattern="(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/20[0-9]{2}" title="Enter the date as DD/MM/YYYY" autoComplete="off"
          onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 8); e.target.value = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; }} /></label>}
        {topic === 'service' && select('customise', 'Customise for', CUSTOMISE)}
        {topic === 'hiring' && text('address', 'Address')}
        {topic === 'hiring' && text('instagram', 'Instagram handle', { placeholder: '@yourhandle' })}
        <label><span>{t.ask} <i aria-hidden="true"> *</i></span><textarea name="message" required minLength={10} maxLength={2000} {...ruleProps('sentence')} /></label>
        {topic === 'hiring' && select('employed', 'Are you currently employed?', ['Yes', 'No'])}
        <button className="btn" disabled={state === 'sending'}><Icon n="send" size={17} /><span>{state === 'sending' ? 'Sending…' : t.submit}</span></button>
      </>}
      {state === 'error' && <p className="notice err" role="alert">We could not send that. Please check your details and try again.</p>}
    </form></>);
}
export default function ContactForm() { return <Suspense fallback={<Head topic="service" />}><Inner /></Suspense>; }
