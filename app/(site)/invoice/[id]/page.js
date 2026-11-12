import { notFound } from 'next/navigation';
import { q, dbReady, getSettings } from '@/lib/server/db';
import { buildInvoice } from '@/lib/server/invoice';
import { receiptSheet } from '@/lib/receiptSheet';
import { orderNumber } from '@/lib/numbering';
import { InvoiceSheet, FitA4 } from '@/components/admin/InvoiceSheet';
import PrintButton from '@/components/PrintButton';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Receipt', robots: { index: false, follow: false } };
const UUID = /^[0-9a-f-]{36}$/i;
export default async function Receipt({ params, searchParams }) {
  const { id } = await params; const sp = await searchParams;
  if (!UUID.test(id) || !dbReady()) notFound();
  let inv = null; let ref = '';
  const settings = await getSettings().catch(() => ({}));
  const [o] = await q(`orders?id=eq.${id}&status=in.(paid,packed,shipped,delivered)&select=*,order_items(*)`).catch(() => []);
  if (o) { const on = orderNumber(o, settings); ref = on ? `Order ${on}` : ''; }
  if (o) inv = buildInvoice({ kind: 'order', row: { ...o, status: 'paid' }, items: (o.order_items || []).map((i) => ({ title: i.title, qty: i.qty, unit_paise: i.unit_paise })), settings });
  else { const [b] = await q(`bookings?id=eq.${id}&status=eq.paid&select=*,workshops(title)`).catch(() => []);
    if (b) inv = buildInvoice({ kind: 'booking', row: b, items: [{ title: `${b.workshops?.title || 'Workshop'} (${b.seats} ${b.seats > 1 ? 'seats' : 'seat'})`, qty: b.seats, unit_paise: Math.round(b.amount_paise / b.seats) }], settings });
    else { const [e] = await q(`class_enrolments?id=eq.${id}&status=eq.paid&select=*,class_levels(title,level,sessions)`).catch(() => []);
      if (e) inv = buildInvoice({ kind: 'enrolment', row: e, items: [{ title: `${e.class_levels?.title || 'Writing class'}, ${e.class_levels?.level || ''} (${e.class_levels?.sessions || 8} classes) for ${e.student_name}`, qty: 1, unit_paise: e.amount_paise }], settings }); } }
  if (!inv) notFound();
  const sheet = receiptSheet(inv, { ref, terms: settings.invoice?.terms || '' });
  return (<main className="receipt-page"><section className="section" style={{ paddingTop: 56 }}><div className="wrap" style={{ maxWidth: 900 }}>
    {sp?.thanks && <div className="head receipt-extra" style={{ marginBottom: 32 }}><h1 style={{ fontSize: 'clamp(30px,5vw,48px)' }}>Thank you.</h1><p className="lead">Your payment was received. A receipt has also been emailed to you.</p></div>}
    <FitA4><InvoiceSheet d={sheet} /></FitA4><div className="row c receipt-extra" style={{ marginTop: 24 }}><PrintButton /></div></div></section></main>);
}
