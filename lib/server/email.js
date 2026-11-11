import { esc, inr, renderInvoiceHTML } from './invoice.js';
export const emailReady = () => !!process.env.RESEND_API_KEY;
const FROM = () => process.env.EMAIL_FROM || 'Thin Black Brush <onboarding@resend.dev>';
export const BUSINESS_TO = () => process.env.BUSINESS_EMAIL || 'thinblackbrush@gmail.com';

export async function sendEmail({ to, subject, html, replyTo }) {
  if (!emailReady()) return { skipped: true };
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM(), to: Array.isArray(to) ? to : [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }) });
  if (!r.ok) throw new Error(`email failed ${r.status}`); return r.json();
}
const wrap = (title, body) => `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1d1d1f;line-height:1.6"><h2 style="margin:0 0 12px">${esc(title)}</h2>${body}</div>`;

export const customerReceipt = (inv, what) => ({
  to: inv.customer.email, subject: `${what} confirmed · ${inv.business.name} (${inv.no})`,
  html: wrap(`Thank you, ${inv.customer.name.split(' ')[0]}!`, `<p>We have received your payment of <b>${inr(inv.total)}</b>. Your receipt is below.</p>`) + renderInvoiceHTML(inv),
});
export const businessAlert = (inv, what, detail) => ({
  to: BUSINESS_TO(), replyTo: inv.customer.email, subject: `New ${what}: ${inv.customer.name} · ${inr(inv.total)}`,
  html: wrap(`New ${what} paid`, `<p><b>${esc(inv.customer.name)}</b><br>${esc(inv.customer.email)} · ${esc(inv.customer.phone)}</p><p>${detail}</p><p>Total received: <b>${inr(inv.total)}</b> · Receipt ${esc(inv.no)}</p>${inv.customer.address ? `<p>Ship to: ${esc(inv.customer.address)}</p>` : ''}`),
});
export const enquiryAlert = (e) => ({
  to: BUSINESS_TO(), replyTo: e.email, subject: `New ${e.kind} enquiry from ${e.name}`,
  html: wrap(`New ${e.kind} enquiry`, `<p><b>${esc(e.name)}</b><br>${esc(e.email)} · ${esc(e.phone || '')}</p><p style="white-space:pre-wrap">${esc(e.message || '')}</p>${Object.entries(e.details || {}).map(([k, v]) => `<p style="margin:2px 0"><span style="color:#6e6e73">${esc(k)}:</span> ${esc(v)}</p>`).join('')}`),
});
export const enquiryThanks = (e, bizName = 'Thin Black Brush') => ({
  to: e.email, subject: `We got your message · ${bizName}`,
  html: wrap(`Thank you, ${e.name.split(' ')[0]}!`, `<p>We have received your message and will get back to you soon. If it is urgent, call or WhatsApp us on +91 99620 50962.</p>`),
});
export const shippedEmail = (order, carrier, number) => ({
  to: order.email, subject: `Your order is on its way · Thin Black Brush`,
  html: wrap('Your order has shipped', `<p>Hi ${esc(order.name.split(' ')[0])}, your order has been shipped${carrier ? ` with <b>${esc(carrier)}</b>` : ''}.</p>${number ? `<p>Tracking number: <b>${esc(number)}</b></p>` : ''}<p>Thank you for shopping with Thin Black Brush.</p>`),
});
export const invoiceEmail = (inv, to, note) => ({
  to, subject: `Invoice ${inv.no} · ${inv.business.name}`,
  html: wrap(`Invoice ${inv.no}`, `<p>${esc(note || 'Please find your invoice below.')}</p>`) + renderInvoiceHTML(inv),
});
