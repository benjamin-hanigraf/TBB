'use client';
import { useState } from 'react';
import { Page, Fold } from './kit';
import Seg from './Seg';
import { sumSigned, sumOf, shown } from '@/lib/arith';
import { calc, rupeesToPaise, money, gstInside, gstOnTop } from '@/lib/accounting';
import { RULES } from '@/lib/format';
// plain: an amount or a count, which also accepts sums such as 400+520. Other boxes (percentages, rates) take one number only.
function N({ label, v, set, suffix, hint, plain }) {
  const [raw, setRaw] = useState(v); const [focus, setFocus] = useState(false);
  if (!plain) return (<label className="ad-field"><span>{label}{suffix && <em> {suffix}</em>}</span><input inputMode="decimal" value={v} onChange={(e) => set(RULES.money.typing(e.target.value))} />{hint && <small>{hint}</small>}</label>);
  const type = (e) => { const t = e.target.value.replace(/[^0-9.+\-,\s]/g, '').slice(0, 40); setRaw(t); if (!t.trim()) { set(''); return; } const r = sumSigned(t); if (r !== null) set(r < 0 ? '' : String(r)); };       // a total below zero leaves the answers blank       // an unfinished sum keeps the last good answer
  return (<label className="ad-field"><span>{label}{suffix && <em> {suffix}</em>}</span>
    <input inputMode="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={focus ? raw : shown(raw)} onFocus={() => setFocus(true)} onBlur={() => { setFocus(false); if (sumSigned(raw) === null && raw.trim()) setRaw(v); }} onChange={type} />{hint && <small>{hint}</small>}</label>);
}
const R = ({ rows }) => <div className="ad-list" style={{ marginTop: 14 }}>{rows.map(([k, v, big]) => <div key={k} className="ad-row" style={{ cursor: 'default' }}><span>{k}</span><b style={big ? { fontSize: 20 } : undefined}>{v}</b></div>)}</div>;
const pct = (x) => `${(Math.round(x * 10) / 10).toString()}%`;
export default function Calculator() {
  return (<Page title="Calculator"><p className="ad-help" style={{ margin: '0 0 14px' }}>Type numbers in any box. You can also add and subtract, like 400+520. Answers update as you type.</p>
    <Fold big tight={false} title="Price and profit"><Price /></Fold>
    <Fold big tight={false} title="GST"><Gst /></Fold>
    <Fold big tight={false} title="Discount"><Disc /></Fold>
    <Fold big tight={false} title="Workshop break-even"><Even /></Fold></Page>);
}
const Tabs = ({ options, value, onChange, label }) => <div style={{ textAlign: 'center', marginBottom: 16 }}><Seg options={options} value={value} onChange={onChange} label={label} /></div>;
function Price() {
  const [tab, setTab] = useState('markup'); const [cost, setCost] = useState(''); const [mk, setMk] = useState('50'); const [sell, setSell] = useState('');
  const c = rupeesToPaise(cost); const p = calc.markupPrice(c, Number(mk) || 0); const sp = rupeesToPaise(sell);
  return (<><Tabs label="Work out from" value={tab} onChange={setTab} options={[['markup', 'Markup'], ['sale', 'Sale Price']]} />
    {tab === 'markup' ? <>
      <div className="ad-form"><N key="n1" plain label="What it costs you (₹)" v={cost} set={setCost} /><N key="n2" label="Markup" suffix="%" v={mk} set={setMk} hint="How much you add on top of the cost" /></div>
      {c > 0 && <R rows={[['Selling price', money(p), true], ['Profit per item', money(p - c)], ['Profit percentage', pct(calc.marginPct(c, p))]]} />}</>
    : <>
      <div className="ad-form"><N key="n3" plain label="What it costs you (₹)" v={cost} set={setCost} /><N key="n4" plain label="Your selling price (₹)" v={sell} set={setSell} hint="See your markup and profit for a price you already use" /></div>
      {c > 0 && sp > 0 && <R rows={[['Markup', pct(calc.markupPct(c, sp)), true], ['Profit percentage', pct(calc.marginPct(c, sp))], ['Profit per item', money(sp - c)]]} />}</>}</>);
}
function Gst() {
  const [tab, setTab] = useState('excl'); const [amt, setAmt] = useState(''); const [rate, setRate] = useState('18'); const a = rupeesToPaise(amt), r = Number(rate) || 0;
  return (<><Tabs label="The amount is" value={tab} onChange={setTab} options={[['excl', 'Exclusive'], ['incl', 'Inclusive']]} />
    <div className="ad-form"><N key="n5" plain label={tab === 'excl' ? 'Amount before GST (₹)' : 'Amount including GST (₹)'} v={amt} set={setAmt} /><N key="n6" label="GST rate" suffix="%" v={rate} set={setRate} /></div>
    {a > 0 && (tab === 'excl' ? <R rows={[['GST', money(gstOnTop(a, r))], ['Total with GST', money(a + gstOnTop(a, r)), true]]} /> : <R rows={[['GST inside', money(gstInside(a, r))], ['Price without GST', money(a - gstInside(a, r)), true]]} />)}</>);
}
function Disc() {
  const [tab, setTab] = useState('customer'); const [p, setP] = useState(''); const [d, setD] = useState('10'); const a = rupeesToPaise(p); const after = calc.discounted(a, Number(d) || 0); const cust = tab === 'customer';
  return (<><Tabs label="Who gives the discount" value={tab} onChange={setTab} options={[['customer', 'Customer'], ['supplier', 'Supplier']]} />
    <div className="ad-form"><N key="n7" plain label={cust ? 'Your price (₹)' : "Supplier's price (₹)"} v={p} set={setP} /><N key="n8" label="Discount" suffix="%" v={d} set={setD} /></div>
    {a > 0 && <R rows={cust ? [['You give away', money(a - after)], ['Customer pays', money(after), true]] : [['You save', money(a - after)], ['You pay', money(after), true]]} />}</>);
}
function Even() {
  const [fixed, setFixed] = useState(''); const [price, setPrice] = useState(''); const [cost, setCost] = useState(''); const [cap, setCap] = useState('12');
  const be = calc.breakEvenUnits(rupeesToPaise(fixed), rupeesToPaise(price), rupeesToPaise(cost)); const ok = rupeesToPaise(price) > rupeesToPaise(cost) && rupeesToPaise(fixed) > 0;
  const seats = Number(cap) || 0; const profitFull = seats * (rupeesToPaise(price) - rupeesToPaise(cost)) - rupeesToPaise(fixed);
  return (<><p className="ad-help" style={{ marginTop: 0 }}>How many participants do you need to cover your costs?</p>
    <div className="ad-form"><N key="n9" plain label="Fixed costs (₹)" v={fixed} set={setFixed} hint="Venue, teacher pay, marketing: costs that do not change with students" /><N key="n10" plain label="Price per student (₹)" v={price} set={setPrice} /><N key="n11" plain label="Cost per student (₹)" v={cost} set={setCost} hint="Kit and materials for one student" /><N key="n12" plain label="Seats available" v={cap} set={setCap} /></div>
    {ok && <R rows={[['Participants needed to break even', Number.isFinite(be) ? String(be) : 'Not possible', true], ['Profit if all seats are filled', money(profitFull)]]} />}
    {be > seats && ok && <p className="ad-err" style={{ marginTop: 12 }}>You cannot break even with {seats} seats at this price. Try a higher price or lower costs.</p>}</>);
}
