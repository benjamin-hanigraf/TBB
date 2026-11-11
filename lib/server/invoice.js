// Builds one invoice document and renders it as HTML (used on the invoice page and inside emails).
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const inr = (p) => '₹' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 });
const fyOf = (iso) => { const [y, m] = iso.split('-').map(Number); const s = m >= 4 ? y : y - 1; return `${s}-${String((s + 1) % 100).padStart(2, '0')}`; };
export const invoiceNumber = (iso, n, prefix = 'TBB') => `${prefix}/${fyOf(iso)}/${String(n).padStart(4, '0')}`;
export const gstInside = (total, rate) => rate > 0 ? Math.round(total - total / (1 + rate / 100)) : 0;

export function buildInvoice({ kind, row, items, settings }) {
  const gst = settings?.gst || { enabled: false, rate_percent: 18, gstin: '' }; const biz = settings?.business || {};
  const date = (row.paid_at || row.created_at || new Date().toISOString()).slice(0, 10);
  const lines = items.map((i) => ({ desc: i.title, qty: i.qty, unit_paise: i.unit_paise, total_paise: i.qty * i.unit_paise }));
  if (kind === 'order' && row.shipping_paise > 0) lines.push({ desc: 'Shipping', qty: 1, unit_paise: row.shipping_paise, total_paise: row.shipping_paise });
  const total = kind === 'order' ? row.total_paise : row.amount_paise;
  return {
    no: invoiceNumber(date, row.invoice_no), date, kind, paid: row.status === 'paid', paymentId: row.razorpay_payment_id || '',
    business: { name: biz.name || 'Thin Black Brush', address: biz.address || '', phone: biz.phone || '', email: biz.email || '', gstin: gst.enabled ? gst.gstin : '' },
    customer: { name: row.name, email: row.email, phone: row.phone, address: kind === 'order' ? addrLine(row.shipping_address) : '' },
    lines, total, gstEnabled: !!gst.enabled, gstRate: gst.rate_percent || 18, gstAmount: gst.enabled ? gstInside(total, gst.rate_percent || 18) : 0,
  };
}
const addrLine = (a) => a ? [a.recipient, a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ') : '';

import { invoiceTotals } from '../accounting.js';
/** Invoice made with the invoice generator: prices are before GST, GST is added as its own line. */
export function buildManualInvoice(i, settings, to) {
  const biz = settings?.business || {}, gst = settings?.gst || {}; const t = invoiceTotals(i.items || [], i.discount_paise || 0, !!i.gst_enabled, Number(i.gst_rate) || 18);
  const lines = (i.items || []).map((x) => ({ desc: x.desc, qty: x.qty, unit_paise: x.unit_paise, total_paise: Math.round(x.qty * x.unit_paise) }));
  if (t.discount) lines.push({ desc: 'Discount', qty: 1, unit_paise: -t.discount, total_paise: -t.discount });
  if (i.gst_enabled && t.gst) lines.push({ desc: `GST (${Number(i.gst_rate) || 18}%)`, qty: 1, unit_paise: t.gst, total_paise: t.gst });
  return { no: i.invoice_no, date: i.issue_date, kind: 'invoice', paid: i.status === 'paid', paymentId: '', title: i.status === 'paid' ? 'Receipt' : 'Invoice',
    business: { name: biz.name || 'Thin Black Brush', address: biz.address || '', phone: biz.phone || '', email: biz.email || '', gstin: gst.enabled ? gst.gstin : '' },
    customer: { name: i.customer_name, email: to || i.customer_email || '', phone: i.customer_phone || '', address: i.customer_address || '', gstin: i.customer_gstin || '' },
    lines, total: t.total, gstEnabled: false, gstRate: 0, gstAmount: 0, notes: i.notes || '', terms: settings?.invoice?.terms || '', due: i.due_date || '' };
}
export function renderInvoiceHTML(d, { standalone = false } = {}) {
  const rows = d.lines.map((l) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e5ea">${esc(l.desc)}</td><td style="padding:10px 0;border-bottom:1px solid #e5e5ea;text-align:center">${l.qty}</td><td style="padding:10px 0;border-bottom:1px solid #e5e5ea;text-align:right">${inr(l.unit_paise)}</td><td style="padding:10px 0;border-bottom:1px solid #e5e5ea;text-align:right">${inr(l.total_paise)}</td></tr>`).join('');
  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1d1d1f;max-width:640px;margin:0 auto;padding:24px;line-height:1.5">
<table width="100%" style="border-collapse:collapse"><tr><td><div style="font-size:22px;font-weight:600">${esc(d.business.name)}</div><div style="color:#6e6e73;font-size:13px">${esc(d.business.address)}<br>${esc(d.business.phone)} · ${esc(d.business.email)}${d.business.gstin ? `<br>GSTIN ${esc(d.business.gstin)}` : ''}</div></td>
<td style="text-align:right;vertical-align:top"><div style="font-size:20px;font-weight:600">${d.title || (d.paid ? 'Receipt' : 'Invoice')}</div><div style="color:#6e6e73;font-size:13px">No. ${esc(d.no)}<br>${esc(d.date)}${d.due ? `<br>Due ${esc(d.due)}` : ''}</div></td></tr></table>
<div style="margin:24px 0;font-size:14px"><div style="color:#6e6e73">Billed to</div><b>${esc(d.customer.name)}</b><br>${esc(d.customer.email)}${d.customer.phone ? ` · ${esc(d.customer.phone)}` : ''}${d.customer.address ? `<br>${esc(d.customer.address)}` : ''}${d.customer.gstin ? `<br>GSTIN ${esc(d.customer.gstin)}` : ''}</div>
<table width="100%" style="border-collapse:collapse;font-size:14px"><tr style="color:#6e6e73;text-align:left"><th style="padding:8px 0;font-weight:500">Item</th><th style="font-weight:500;text-align:center">Qty</th><th style="font-weight:500;text-align:right">Price</th><th style="font-weight:500;text-align:right">Amount</th></tr>${rows}</table>
<table width="100%" style="margin-top:12px;font-size:14px"><tr><td style="text-align:right;color:#6e6e73">${d.gstEnabled ? `Includes GST (${d.gstRate}%): ${inr(d.gstAmount)}` : ''}</td></tr><tr><td style="text-align:right;font-size:18px;font-weight:600;padding-top:6px">Total ${inr(d.total)}</td></tr>${d.paid ? `<tr><td style="text-align:right;color:#14532d;font-size:13px">Paid online${d.paymentId ? ` · Payment ID ${esc(d.paymentId)}` : ''}</td></tr>` : ''}</table>
${d.notes ? `<p style="font-size:13px;margin-top:20px;white-space:pre-wrap">${esc(d.notes)}</p>` : ''}<p style="color:#6e6e73;font-size:12px;margin-top:20px">${esc(d.terms || '')}${d.terms ? '<br>' : ''}Thank you for choosing ${esc(d.business.name)}.</p></div>`;
  return standalone ? `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${d.paid ? 'Receipt' : 'Invoice'} ${esc(d.no)}</title></head><body style="margin:0">${html}</body></html>` : html;
}
