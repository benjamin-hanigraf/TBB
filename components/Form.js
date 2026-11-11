'use client';
import { useState } from 'react';
import Icon from './Icons';
import { ruleProps, ruleFor } from '@/lib/rules';
import { RULES } from '@/lib/format';
export default function Form({ kind, fields, submit = 'Send', done = 'Thank you. We will get back to you soon.' }) {
  const [state, setState] = useState('idle');
  async function onSubmit(e) {
    e.preventDefault(); setState('sending');
    const data = Object.fromEntries(new FormData(e.target));
    for (const fl of fields) { const r = RULES[fl.rule || ruleFor(fl.name)]; if (r && data[fl.name]) data[fl.name] = r.done(String(data[fl.name])); }
    try {
      const r = await fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, ...data }) });
      setState(r.ok ? 'done' : 'error'); if (r.ok) e.target.reset();
    } catch { setState('error'); }
  }
  if (state === 'done') return <div className="notice ok"><Icon n="check" size={20} /> {done}</div>;
  return (
    <form autoComplete="off" onSubmit={onSubmit} className="form">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      {fields.map((f) => (
        <label key={f.name}><span>{f.label}{f.required ? <i aria-hidden="true"> *</i> : <em> (optional)</em>}</span>
          {f.type === 'textarea' ? <textarea name={f.name} required={f.required} minLength={f.required ? 10 : undefined} maxLength={2000} placeholder={f.placeholder} {...ruleProps(f.rule || ruleFor(f.name) || 'sentence')} />
          : f.type === 'select' ? <select name={f.name} required={f.required} defaultValue="" autoComplete="off"><option value="" disabled>Select</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
          : f.type === 'date' ? <input name={f.name} type="text" inputMode="numeric" placeholder="DD/MM/YYYY" maxLength={10} pattern="(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/20[0-9]{2}" title="Enter the date as DD/MM/YYYY" autoComplete="off" required={f.required}
              onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 8); e.target.value = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; }} />
          : <input name={f.name} type={f.type || 'text'} required={f.required} maxLength={200} placeholder={f.placeholder}
              {...(f.type === 'tel' ? { pattern: '[0-9+\\s\\-]{10,16}', title: 'Enter a valid phone number', inputMode: 'tel' } : {})}
              autoComplete="off" data-lpignore="true" data-1p-ignore="true" {...ruleProps(f.rule || ruleFor(f.name))} />}
        </label>))}
      <button className="btn" disabled={state === 'sending'}><Icon n="send" size={17} /><span>{state === 'sending' ? 'Sending…' : submit}</span></button>
      <p className="small center">Fields marked * are required.</p>
      {state === 'error' && <p className="notice err" role="alert">That did not go through. Please try again, or call or WhatsApp us.</p>}
    </form>);
}
