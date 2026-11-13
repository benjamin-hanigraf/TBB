'use client';
// Shows a receipt or invoice as a PDF inside a window (no new page), with Print (the device's print dialog) and Download.
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icons';
import { Modal, Btn, Spin, Err, useAction } from './kit';
import { InvoiceSheet } from './InvoiceSheet';
import { printHtml, htmlToPdf } from '@/lib/printDoc';
import { adminPost } from '@/lib/adminApi';

export function DocModal({ title, fileName = 'document', sheets, onClose }) {
  const off = useRef(); const [url, setUrl] = useState(''); const [err, setErr] = useState(null);
  useEffect(() => {
    let on = true, made = '';
    (async () => {
      try {
        await new Promise((r) => setTimeout(r, 60));
        const blob = await htmlToPdf(off.current.innerHTML); made = URL.createObjectURL(blob); if (on) setUrl(made);
      } catch (e) { console.error(e); if (on) setErr(e); }
    })();
    return () => { on = false; if (made) URL.revokeObjectURL(made); };
  }, []);
  const [run, busy] = useAction();
  const print = () => run(async () => { await printHtml(off.current.innerHTML, { title }); });
  return (<Modal title={title} onClose={onClose} wide>
    <div className="doc-off" ref={off} aria-hidden="true">{sheets.map((d, i) => <InvoiceSheet key={i} d={d} />)}</div>
    {err ? <Err e={{ message: 'Could not make the PDF. You can still print it.' }} /> : !url ? <Spin /> : <iframe className="doc-frame" title={title} src={url} />}
    <div className="ad-actions full" style={{ marginTop: 14 }}>
      <Btn icon="print" busy={busy} onClick={print}>Print</Btn>
      {url && <a className="ad-btn ghost" href={url} download={`${String(fileName).replace(/[^\w.-]+/g, '-')}.pdf`}><Icon n="download" size={16} /><span>Download PDF</span></a>}
    </div>
  </Modal>);
}

/** A receipt for an order, workshop booking or class enrolment, fetched by id. */
export function ReceiptModal({ id, onClose }) {
  const [d, setD] = useState(null); const [err, setErr] = useState(null);
  useEffect(() => { let on = true; adminPost('/api/manager/receipt', { id }).then((r) => { if (!on) return; if (r.ok) setD(r); else setErr({ message: r.status === 404 ? 'There is no receipt for this yet. It is made once the payment is confirmed.' : 'Could not open the receipt.' }); }).catch((e) => on && setErr(e)); return () => { on = false; }; }, [id]);
  if (err) return <Modal title="Receipt" onClose={onClose}><Err e={err} /></Modal>;
  if (!d) return <Modal title="Receipt" onClose={onClose}><Spin /></Modal>;
  return <DocModal title={`Receipt ${d.name}`} fileName={`Receipt-${d.name}`} sheets={[d.sheet]} onClose={onClose} />;
}
