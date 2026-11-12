'use client';
import { useEffect, useRef, useState } from 'react';
import { money } from '@/lib/accounting';
import { isoToDMY } from './kit';

// The invoice page: A4 portrait, a header block of fixed size with the TBB stacked logo, then bill-to, items, totals and payment details.
export function InvoiceSheet({ d }) {
  const gst = d.gstOn; const c = d.calc;
  return (<div className="inv-sheet">
    <div className="inv-head">
      <img src="/brand/logo-stacked-light.svg" alt="Thin Black Brush" className="inv-logo" />
      <div className="inv-biz"><b>{d.biz.name}</b>{d.biz.address && <span style={{ whiteSpace: 'pre-line' }}>{d.biz.address}</span>}{d.biz.phone && <span>{d.biz.phone}</span>}{d.biz.email && <span>{d.biz.email}</span>}{gst && d.biz.gstin && <span>GSTIN {d.biz.gstin}</span>}</div>
    </div>
    <div className="inv-meta">
      <div><p className="inv-label">Bill to</p><p className="inv-cust">{d.customer.name || '—'}</p>
        {d.customer.address && <p className="inv-sub" style={{ whiteSpace: 'pre-line' }}>{d.customer.address}</p>}{d.customer.phone && <p className="inv-sub">{d.customer.phone}</p>}{d.customer.email && <p className="inv-sub">{d.customer.email}</p>}{gst && d.customer.gstin && <p className="inv-sub">GSTIN {d.customer.gstin}</p>}</div>
      <div className="inv-right"><p className="inv-title">{d.title}</p><p className="inv-sub">{d.no}</p><p className="inv-sub">Date {isoToDMY(d.date)}</p>{d.due && <p className="inv-sub">Due {isoToDMY(d.due)}</p>}</div>
    </div>
    <table className="inv-table"><thead><tr><th className="l">Description</th>{gst && <th>HSN/SAC</th>}<th className="r">Qty</th><th className="r">Rate</th>{gst && <th className="r">GST</th>}<th className="r">Amount</th></tr></thead>
      <tbody>{c.lines.length ? c.lines.map((l, i) => <tr key={i}><td className="l">{l.desc || '—'}</td>{gst && <td>{l.hsn || '—'}</td>}<td className="r">{l.qty}</td><td className="r">{money(l.unit_paise || 0)}</td>{gst && <td className="r">{l.rate ? `${l.rate}%` : '—'}</td>}<td className="r">{money(l.net)}</td></tr>) : <tr><td className="l" colSpan={gst ? 6 : 4}>—</td></tr>}</tbody></table>
    <div className="inv-totals">
      <div><span>Subtotal</span><span>{money(c.subtotal)}</span></div>
      {c.discount > 0 && <div><span>Discount</span><span>− {money(c.discount)}</span></div>}
      {gst && <><div><span>Taxable value</span><span>{money(c.taxable)}</span></div><div><span>CGST</span><span>{money(c.cgst)}</span></div><div><span>SGST</span><span>{money(c.sgst)}</span></div></>}
      <div className="grand"><span>Total</span><span>{money(c.total)}</span></div>
      {d.paid && <div className="paid"><span>Paid{d.method ? ` by ${d.method}` : ''}{d.paidOn ? ` on ${isoToDMY(d.paidOn)}` : ''}</span><span>{money(c.total)}</span></div>}
      {!d.paid && d.paidPaise > 0 && <><div><span>Paid so far</span><span>{money(d.paidPaise)}</span></div><div className="paid"><span>Balance due</span><span>{money(d.balance)}</span></div></>}
    </div>
    <div className="inv-foot">
      <div>{d.biz.upi && <><p className="inv-label">Pay by UPI</p><p className="inv-sub">{d.biz.upi}</p></>}{d.notes && <><p className="inv-label" style={{ marginTop: 10 }}>Notes</p><p className="inv-sub" style={{ whiteSpace: 'pre-wrap' }}>{d.notes}</p></>}</div>
      <div className="inv-right"><p className="inv-sub">{d.terms}</p><p className="inv-sub">Thank you for choosing Thin Black Brush.</p></div>
    </div>
  </div>);
}

/** Shrinks the A4 page to fit the screen. When printing, it is shown at true A4 size. */
export function FitA4({ children, pages = 1 }) {
  const ref = useRef(); const [s, setS] = useState(1);
  useEffect(() => { const el = ref.current; if (!el) return; const fit = () => setS(Math.min(1, el.clientWidth / 794)); fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect(); }, []);
  return <div ref={ref} className="inv-fit" style={{ height: 1123 * s * pages }}><div className="inv-scale" style={{ transform: `scale(${s})` }}>{children}</div></div>;
}
