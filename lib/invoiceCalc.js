// Invoice maths with a GST rate on every line. All money is whole paise.
// items: [{ desc, qty, unit_paise, gst_rate, hsn }]  (prices are before GST)
export function calcInvoice(items, discountPaise = 0, gstOn = false) {
  const lines = items.map((i) => ({ ...i, net: Math.round(Number(i.qty ?? 1) * Number(i.unit_paise || 0)) }));
  const subtotal = lines.reduce((s, l) => s + l.net, 0); const discount = Math.min(Math.max(Number(discountPaise) || 0, 0), subtotal);
  let left = discount;
  lines.forEach((l, i) => { const share = i === lines.length - 1 ? left : Math.round(discount * (subtotal ? l.net / subtotal : 0)); left -= share; l.taxable = Math.max(0, l.net - share); l.rate = gstOn ? Number(l.gst_rate) || 0 : 0; l.gst = Math.round(l.taxable * l.rate / 100); l.total = l.taxable + l.gst; });
  const taxable = lines.reduce((s, l) => s + l.taxable, 0), gst = lines.reduce((s, l) => s + l.gst, 0), sgst = Math.floor(gst / 2), cgst = gst - sgst;
  const byRate = {}; lines.forEach((l) => { if (l.gst) byRate[l.rate] = (byRate[l.rate] || 0) + l.gst; });
  const noQty = lines.length > 0 && lines.every((l) => l.qty === null || l.qty === undefined || l.qty === '');       // quantity left blank on every line: it does not apply (a service), so the column is left out
  return { noQty, lines, subtotal, discount, taxable, gst, cgst, sgst, total: taxable + gst, byRate };
}
