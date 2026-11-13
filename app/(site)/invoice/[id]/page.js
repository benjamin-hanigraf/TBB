import { notFound } from 'next/navigation';
import { dbReady } from '@/lib/server/db';
import { loadReceipt } from '@/lib/server/receipt';
import { InvoiceSheet, FitA4 } from '@/components/admin/InvoiceSheet';
import PrintButton from '@/components/PrintButton';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Receipt', robots: { index: false, follow: false } };
const UUID = /^[0-9a-f-]{36}$/i;
export default async function Receipt({ params, searchParams }) {
  const { id } = await params; const sp = await searchParams;
  if (!UUID.test(id) || !dbReady()) notFound();
  const r = await loadReceipt(id).catch(() => null); if (!r) notFound(); const sheet = r.sheet;
  return (<main className="receipt-page"><section className="section" style={{ paddingTop: 56 }}><div className="wrap" style={{ maxWidth: 900 }}>
    {sp?.thanks && <div className="head receipt-extra" style={{ marginBottom: 32 }}><h1 style={{ fontSize: 'clamp(30px,5vw,48px)' }}>Thank you.</h1><p className="lead">Your payment was received. A receipt has also been emailed to you.</p></div>}
    <FitA4><InvoiceSheet d={sheet} /></FitA4><div className="row c receipt-extra" style={{ marginTop: 24 }}><PrintButton /></div></div></section></main>);
}
