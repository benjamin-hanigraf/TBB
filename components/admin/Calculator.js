'use client';
import { useState } from 'react';
import { Page, Card } from './kit';
import { calc, rupeesToPaise, money, gstInside, gstOnTop } from '@/lib/accounting';
import { RULES } from '@/lib/format';
function N({ label, v, set, suffix, hint }) {
  return (<label className="ad-field"><span>{label}{suffix && <em> {suffix}</em>}</span><input inputMode="decimal" value={v} onChange={(e) => set(RULES.money.typing(e.target.value))} />{hint && <small>{hint}</small>}</label>);
}
const R = ({ rows }) => <div className="ad-list" style={{ marginTop: 14 }}>{rows.map(([k, v, big]) => <div key={k} className="ad-row" style={{ cursor: 'default' }}><span>{k}</span><b style={big ? { fontSize: 20 } : undefined}>{v}</b></div>)}</div>;
const pct = (x) => `${(Math.round(x * 10) / 10).toString()}%`;
export default function Calculator() {
  return (<Page title="Calculator" back="/manager/tools"><div className="ad-help" style={{ marginBottom: 14 }}>Type numbers in any box. Answers update as you type.</div><Price /><Gst /><Disc /><Even /></Page>);
}
function Price() {
  const [cost, setCost] = useState(''); const [mk, setMk] = useState('50'); const [sell, setSell] = useState('');
  const c = rupeesToPaise(cost); const p = calc.markupPrice(c, Number(mk) || 0); const sp = rupeesToPaise(sell);
  return (<Card title="Price and profit"><div className="ad-form"><N label="What it costs you (₹)" v={cost} set={setCost} /><N label="Markup" suffix="%" v={mk} set={setMk} hint="How much you add on top of the cost" /></div>
    {c > 0 && <R rows={[['Selling price', money(p), true], ['Profit per item', money(p - c)], ['Margin (profit as a share of the price)', pct(calc.marginPct(c, p))]]} />}
    <div className="ad-form" style={{ marginTop: 14 }}><N label="Or: your selling price (₹)" v={sell} set={setSell} hint="See your markup and margin for a price you already use" /></div>
    {c > 0 && sp > 0 && <R rows={[['Markup', pct(calc.markupPct(c, sp))], ['Margin', pct(calc.marginPct(c, sp))], ['Profit per item', money(sp - c)]]} />}</Card>);
}
function Gst() {
  const [amt, setAmt] = useState(''); const [rate, setRate] = useState('18'); const a = rupeesToPaise(amt), r = Number(rate) || 0;
  return (<Card title="GST"><div className="ad-form"><N label="Amount (₹)" v={amt} set={setAmt} /><N label="GST rate" suffix="%" v={rate} set={setRate} /></div>
    {a > 0 && <><p className="ad-section-t">If the amount is before GST</p><R rows={[['GST', money(gstOnTop(a, r))], ['Total with GST', money(a + gstOnTop(a, r)), true]]} />
      <p className="ad-section-t" style={{ marginTop: 14 }}>If the amount already includes GST</p><R rows={[['GST inside', money(gstInside(a, r))], ['Price without GST', money(a - gstInside(a, r)), true]]} /></>}</Card>);
}
function Disc() {
  const [p, setP] = useState(''); const [d, setD] = useState('10'); const a = rupeesToPaise(p);
  return (<Card title="Discount"><div className="ad-form"><N label="Price (₹)" v={p} set={setP} /><N label="Discount" suffix="%" v={d} set={setD} /></div>
    {a > 0 && <R rows={[['You give away', money(a - calc.discounted(a, Number(d) || 0))], ['Customer pays', money(calc.discounted(a, Number(d) || 0)), true]]} />}</Card>);
}
function Even() {
  const [fixed, setFixed] = useState(''); const [price, setPrice] = useState(''); const [cost, setCost] = useState(''); const [cap, setCap] = useState('12');
  const be = calc.breakEvenUnits(rupeesToPaise(fixed), rupeesToPaise(price), rupeesToPaise(cost)); const ok = rupeesToPaise(price) > rupeesToPaise(cost) && rupeesToPaise(fixed) > 0;
  const seats = Number(cap) || 0; const profitFull = seats * (rupeesToPaise(price) - rupeesToPaise(cost)) - rupeesToPaise(fixed);
  return (<Card title="Workshop break-even"><p className="ad-help" style={{ marginTop: 0 }}>How many students do you need to cover your costs?</p>
    <div className="ad-form"><N label="Fixed costs (₹)" v={fixed} set={setFixed} hint="Venue, teacher pay, marketing: costs that do not change with students" /><N label="Price per student (₹)" v={price} set={setPrice} /><N label="Cost per student (₹)" v={cost} set={setCost} hint="Kit and materials for one student" /><N label="Seats available" v={cap} set={setCap} /></div>
    {ok && <R rows={[['Students needed to break even', Number.isFinite(be) ? String(be) : 'Not possible', true], ['Profit if all seats are filled', money(profitFull)]]} />}
    {be > seats && ok && <p className="ad-err" style={{ marginTop: 12 }}>You cannot break even with {seats} seats at this price. Try a higher price or lower costs.</p>}</Card>);
}
