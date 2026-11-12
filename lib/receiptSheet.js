// A receipt (order, workshop booking or class enrolment) in the shape the invoice sheet draws, so a receipt looks exactly like an invoice.
// inv comes from buildInvoice (lib/server/invoice.js). ref is a short line such as "Order ORD-0007".
export function receiptSheet(inv, { ref = '', terms = '' } = {}) {
  const gstLine = inv.lines.find((l) => /^GST \(/.test(l.desc));                  // GST that was added on top of the prices
  const items = inv.lines.filter((l) => l !== gstLine);
  const lines = items.map((l) => ({ desc: l.desc, qty: l.qty, unit_paise: l.unit_paise, net: l.total_paise, rate: 0, gst: 0, hsn: '' }));
  const sum = lines.reduce((t, l) => t + l.net, 0); const gst = inv.gstAmount || 0; const onTop = !!gstLine; const sgst = Math.floor(gst / 2), cgst = gst - sgst;
  const calc = { lines, subtotal: sum, discount: 0, taxable: onTop ? sum : inv.total - gst, gst, cgst, sgst, total: inv.total, included: gst > 0 && !onTop };
  return { no: inv.no, date: inv.date, title: 'Receipt', ref, biz: { ...inv.business }, customer: { ...inv.customer }, calc, gstOn: gst > 0, gstColumns: false,
    notes: inv.paymentId ? `Paid online. Payment ID ${inv.paymentId}.` : '', terms, paid: true, method: 'online', paidOn: inv.date };
}
