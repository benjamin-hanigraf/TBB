import { ADDRESS_TEXT } from '../address.js';
import { formatFor, formatNumber } from '../numbering.js';
const LOGO = `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thinblackbrush.com').replace(/\/$/, '')}/brand/logo-stacked-light.png`;
// Builds one invoice document and renders it as HTML (used on the invoice page and inside emails).
export const DEFAULT_MAP = 'https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7';
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const inr = (p) => '₹' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 });
export const gstInside = (total, rate) => rate > 0 ? Math.round(total - total / (1 + rate / 100)) : 0;

export function buildInvoice({ kind, row, items, settings, ref = '' }) {      // ref: a short line shown under the number, such as "Order ORD-0007"
  const gst = settings?.gst || { enabled: false, rate_percent: 18, gstin: '' }; const biz = settings?.business || {};
  const date = (row.paid_at || row.created_at || new Date().toISOString()).slice(0, 10);
  const lines = items.map((i) => ({ desc: i.title, qty: i.qty, unit_paise: i.unit_paise, total_paise: i.qty * i.unit_paise }));
  if (kind === 'order' && row.shipping_paise > 0) lines.push({ desc: 'Shipping', qty: 1, unit_paise: row.shipping_paise, total_paise: row.shipping_paise });
  const total = kind === 'order' ? row.total_paise : row.amount_paise;
  if (kind === 'order') { const added = total - lines.reduce((t, l) => t + l.total_paise, 0); if (added > 0) lines.push({ desc: 'GST (18%)', qty: 1, unit_paise: added, total_paise: added }); }   // GST that was added on top of item prices
  const explicit = kind === 'order' ? (items.some((i) => i.gst_paise != null) ? items.reduce((t, i) => t + (i.gst_paise || 0), 0) : null) : (row.gst_paise != null ? row.gst_paise : null);
  const gstAmount = explicit != null ? explicit : (gst.enabled ? gstInside(total, gst.rate_percent || 18) : 0);
  return {
    no: formatNumber(formatFor('invoice', settings), row.invoice_no, date), ref, date, kind, paid: row.status === 'paid', paymentId: row.razorpay_payment_id || '',
    business: { name: biz.name || 'Thin Black Brush', address: biz.address || ADDRESS_TEXT, map: biz.map || DEFAULT_MAP, phone: biz.phone || '', email: biz.email || '', gstin: gst.enabled ? gst.gstin : '' },
    customer: { name: row.name, email: row.email, phone: row.phone, address: kind === 'order' ? addrLine(row.shipping_address) : '' },
    lines, total, gstEnabled: gstAmount > 0, gstRate: 18, gstAmount,
  };
}
const addrLine = (a) => a ? [a.recipient, a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ') : '';

import { calcInvoice } from '../invoiceCalc.js';
/** Invoice made with the invoice generator: prices are before GST, GST is added as its own line. */
export function buildManualInvoice(i, settings, to, payments = []) {
  const biz = settings?.business || {}, gst = settings?.gst || {}; const t = calcInvoice(i.items || [], i.discount_paise || 0, !!i.gst_enabled);
  const lines = t.lines.map((x) => ({ desc: x.desc + (x.hsn ? ` (HSN/SAC ${x.hsn})` : ''), qty: x.qty, unit_paise: x.unit_paise, total_paise: x.net }));
  if (t.discount) lines.push({ desc: 'Discount', qty: 1, unit_paise: -t.discount, total_paise: -t.discount });
  if (i.gst_enabled) Object.entries(t.byRate).forEach(([r, v]) => lines.push({ desc: `GST (${r}%)`, qty: 1, unit_paise: v, total_paise: v }));
  const paidPaise = payments.reduce((s, x) => s + (x.amount_paise || 0), 0); const balance = Math.max(0, t.total - paidPaise); const isInv = (i.doc_type || 'invoice') === 'invoice';
  const title = i.doc_type === 'quotation' ? 'Quotation' : i.doc_type === 'credit_note' ? 'Credit note' : (balance === 0 && paidPaise > 0 ? 'Receipt' : 'Invoice');
  return { no: i.invoice_no, date: i.issue_date, kind: 'invoice', paid: isInv && balance === 0 && paidPaise > 0, paidPaise: isInv ? paidPaise : 0, balance, againstNo: i.against_no || '', paymentId: '', title,
    business: { name: biz.name || 'Thin Black Brush', address: biz.address || ADDRESS_TEXT, map: biz.map || DEFAULT_MAP, phone: biz.phone || '', email: biz.email || '', gstin: gst.enabled ? gst.gstin : '' },
    customer: { name: i.customer_name, email: to || i.customer_email || '', phone: i.customer_phone || '', address: i.customer_address || '', gstin: i.customer_gstin || '' },
    lines, total: t.total, gstEnabled: false, gstRate: 0, gstAmount: 0, notes: i.notes || '', terms: settings?.invoice?.terms || '', due: i.due_date || '' };
}
const dmy = (iso) => { if (!iso) return ''; const [y, m, dd] = String(iso).slice(0, 10).split('-'); return `${dd}/${m}/${y}`; };
/** The same look as the invoice page: logo left and business details right, a big uppercase title, grey table headings, totals on the right. Email-safe (tables and inline styles). */
export function renderInvoiceHTML(d, { standalone = false } = {}) {
  const grey = '#8e8e93', line = '#ececef', th = `padding:9px 0;font-size:11.5px;color:${grey};text-transform:uppercase;letter-spacing:.05em;font-weight:600;border-bottom:1px solid #d2d2d7`;
  const rows = d.lines.map((l) => `<tr><td style="padding:11px 0;border-bottom:1px solid ${line}">${esc(l.desc)}</td><td style="padding:11px 0;border-bottom:1px solid ${line};text-align:right">${l.qty}</td><td style="padding:11px 0;border-bottom:1px solid ${line};text-align:right">${inr(l.unit_paise)}</td><td style="padding:11px 0;border-bottom:1px solid ${line};text-align:right">${inr(l.total_paise)}</td></tr>`).join('');
  const addr = esc(d.business.address).replace(/\n/g, '<br>');
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#141414;max-width:640px;margin:0 auto;padding:28px;line-height:1.5;font-size:14px">
<table width="100%" style="border-collapse:collapse"><tr><td valign="top"><img src="${LOGO}" alt="${esc(d.business.name)}" width="150" style="display:block;height:auto;border:0"></td>
<td valign="top" align="right" style="font-size:12.5px;color:#555"><b style="color:#141414;font-size:14px">${esc(d.business.name)}</b><br>${d.business.map ? `<a href="${esc(d.business.map)}" style="color:#555;text-decoration:none">${addr}</a>` : addr}${d.business.phone ? `<br>${esc(d.business.phone)}` : ''}${d.business.email ? `<br>${esc(d.business.email)}` : ''}${d.business.gstin ? `<br>GSTIN ${esc(d.business.gstin)}` : ''}</td></tr></table>
<table width="100%" style="border-collapse:collapse;margin:26px 0 28px"><tr><td valign="top"><div style="font-size:11.5px;color:${grey};text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Bill to</div><div style="font-size:18px;font-weight:600">${esc(d.customer.name)}</div><div style="font-size:13px;color:#555">${esc(d.customer.email)}${d.customer.phone ? `<br>${esc(d.customer.phone)}` : ''}${d.customer.address ? `<br>${esc(d.customer.address)}` : ''}${d.customer.gstin ? `<br>GSTIN ${esc(d.customer.gstin)}` : ''}</div></td>
<td valign="top" align="right"><div style="font-size:26px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">${d.title || (d.paid ? 'Receipt' : 'Invoice')}</div><div style="font-size:13px;color:#555">${esc(d.no)}${d.ref ? `<br>${esc(d.ref)}` : ''}<br>Date ${dmy(d.date)}${d.due ? `<br>Due ${dmy(d.due)}` : ''}</div></td></tr></table>
<table width="100%" style="border-collapse:collapse;font-size:13.5px"><tr><th align="left" style="${th}">Description</th><th align="right" style="${th}">Qty</th><th align="right" style="${th}">Rate</th><th align="right" style="${th}">Amount</th></tr>${rows}</table>
<table align="right" style="border-collapse:collapse;margin-top:16px;width:300px;font-size:13.5px;color:#555">${d.gstEnabled ? `<tr><td style="padding:3px 0">Includes GST (${d.gstRate}%)</td><td align="right">${inr(d.gstAmount)}</td></tr>` : ''}<tr><td style="padding:10px 0 0;border-top:2px solid #141414;font-size:18px;font-weight:700;color:#141414">Total</td><td align="right" style="padding:10px 0 0;border-top:2px solid #141414;font-size:18px;font-weight:700;color:#141414">${inr(d.total)}</td></tr>${d.paidPaise > 0 && d.balance > 0 ? `<tr><td style="padding:4px 0">Paid so far</td><td align="right">${inr(d.paidPaise)}</td></tr><tr><td style="font-weight:600;color:#141414">Balance due</td><td align="right" style="font-weight:600;color:#141414">${inr(d.balance)}</td></tr>` : ''}${d.paid ? `<tr><td colspan="2" style="padding-top:6px;font-weight:600;color:#141414">Paid${d.paymentId ? ` online · Payment ID ${esc(d.paymentId)}` : ''}</td></tr>` : ''}</table>
<div style="clear:both"></div>
${d.notes ? `<p style="font-size:13px;margin:24px 0 0;white-space:pre-wrap;color:#555">${esc(d.notes)}</p>` : ''}<div style="margin-top:28px;padding-top:16px;border-top:1px solid ${line};font-size:12px;color:#555">${esc(d.terms || '')}${d.terms ? '<br>' : ''}Thank you for choosing ${esc(d.business.name)}.</div></div>`;
  return standalone ? `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${d.paid ? 'Receipt' : 'Invoice'} ${esc(d.no)}</title></head><body style="margin:0">${html}</body></html>` : html;
}
