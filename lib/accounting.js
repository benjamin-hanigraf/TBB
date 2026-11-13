// Accounting helpers. All money is whole paise (Rs 1 = 100 paise). Adapted from the Ledger tool:
// Indian financial year (April to March), invoice numbering by prefix and year, GST split, profit and GST summaries.
export const IN_CATEGORIES = ['Workshops', 'Classes', 'Store sales', 'Custom invitations', 'Services', 'Collaborations', 'Studio rent-outs', 'Other income'];
export const OUT_CATEGORIES = ['Materials and supplies', 'Printing', 'Venue rent', 'Teacher or helper pay', 'Shipping and courier', 'Marketing', 'Software and subscriptions', 'Payment gateway fees', 'Refunds', 'Travel', 'Utilities', 'Equipment', 'Taxes and fees', 'Other expense'];
// How money was paid: the four choices offered everywhere. Older entries may also say card (now Bank/Card), razorpay (paid online) or other.
export const PAY_METHODS = [['upi', 'UPI'], ['cash', 'Cash'], ['bank', 'Bank/Card'], ['tds', 'TDS']];
export const METHODS = ['upi', 'cash', 'bank', 'tds', 'card', 'razorpay', 'other'];
export const methodLabel = (m) => ({ upi: 'UPI', cash: 'Cash', bank: 'Bank/Card', card: 'Bank/Card', tds: 'TDS', razorpay: 'Online', other: 'Other' }[m] || (m ? String(m) : ''));
/** The four choices, plus the entry's own older value when it is not one of them (so editing never changes it by surprise). Card counts as Bank/Card. */
export const methodChoices = (current) => { const c = current === 'card' ? 'bank' : current; return !c || PAY_METHODS.some(([k]) => k === c) ? PAY_METHODS : [...PAY_METHODS, [c, methodLabel(c)]]; };

const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());

/** "2026-27" for any date between 1 Apr 2026 and 31 Mar 2027 */
export function fyOf(iso) {
  const [y, m] = iso.split('-').map(Number); const start = m >= 4 ? y : y - 1;
  return `${start}-${pad((start + 1) % 100)}`;
}
export function fyRange(fy) { const s = Number(fy.slice(0, 4)); return { start: `${s}-04-01`, end: `${s + 1}-03-31` }; }
export const inFY = (iso, fy) => { const { start, end } = fyRange(fy); return iso >= start && iso <= end; };
export function fyChoices(entries, today = todayISO()) {
  const set = new Set([fyOf(today), ...entries.map((e) => fyOf(e.entry_date))]);
  return [...set].sort().reverse();
}

/** GST contained in a tax-inclusive amount */
export const gstInside = (totalPaise, ratePct) => ratePct > 0 ? Math.round(totalPaise - totalPaise / (1 + ratePct / 100)) : 0;
/** GST to add on top of a tax-exclusive amount */
export const gstOnTop = (taxablePaise, ratePct) => Math.round(taxablePaise * ratePct / 100);
/** CGST + SGST halves (any odd paisa goes to CGST) */
export const gstHalves = (gstPaise) => { const sgst = Math.floor(gstPaise / 2); return { cgst: gstPaise - sgst, sgst }; };

/** Invoice totals. Prices on an invoice are before GST; GST is added on top when enabled. */
export function invoiceTotals(items, discountPaise = 0, gstEnabled = false, ratePct = 18) {
  const subtotal = items.reduce((s, i) => s + Math.round(Number(i.qty || 0) * Number(i.unit_paise || 0)), 0);
  const discount = Math.min(Math.max(discountPaise, 0), subtotal);
  const taxable = subtotal - discount;
  const gst = gstEnabled ? gstOnTop(taxable, ratePct) : 0;
  return { subtotal, discount, taxable, gst, ...gstHalves(gst), total: taxable + gst };
}

/** Next invoice number like TBB/2026-27/003. prefix may contain YYYY-YY which becomes the financial year. */
export function nextInvoiceNo(existingNos, prefix, iso, start = 1) {
  const fy = fyOf(iso); const p = prefix.replace(/yyyy-yy/gi, fy).replace(/\/+$/, '');
  const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const re = new RegExp(`^${esc}/(\\d+)$`);
  let max = 0; for (const n of existingNos) { const m = String(n).match(re); if (m) max = Math.max(max, parseInt(m[1], 10)); }
  return `${p}/${String(Math.max(max + 1, Number(start) || 1)).padStart(3, '0')}`;
}

/** Plain-language summary for a financial year. */
export function summarise(entries, fy) {
  const rows = entries.filter((e) => inFY(e.entry_date, fy));
  const sum = (arr, k = 'amount_paise') => arr.reduce((s, e) => s + e[k], 0);
  const ins = rows.filter((e) => e.kind === 'in'), outs = rows.filter((e) => e.kind === 'out');
  const group = (arr) => Object.entries(arr.reduce((m, e) => ((m[e.category] = (m[e.category] || 0) + e.amount_paise), m), {})).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  const monthly = {};
  for (const e of rows) { const k = e.entry_date.slice(0, 7); const m = (monthly[k] ||= { month: k, in: 0, out: 0, gstIn: 0, gstOut: 0 }); if (e.kind === 'in') { m.in += e.amount_paise; m.gstIn += e.gst_paise; } else { m.out += e.amount_paise; m.gstOut += e.gst_paise; } }
  const gstCollected = sum(ins, 'gst_paise'), gstPaid = sum(outs, 'gst_paise');
  return {
    moneyIn: sum(ins), moneyOut: sum(outs), profit: sum(ins) - sum(outs),
    inByCategory: group(ins), outByCategory: group(outs),
    gstCollected, gstPaid, gstPayable: gstCollected - gstPaid,
    months: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({ ...m, profit: m.in - m.out, gstPayable: m.gstIn - m.gstOut })),
    count: rows.length,
  };
}

/** Business calculator helpers */
export const calc = {
  markupPrice: (costPaise, pct) => Math.round(costPaise * (1 + pct / 100)),
  marginPct: (costPaise, pricePaise) => pricePaise > 0 ? ((pricePaise - costPaise) / pricePaise) * 100 : 0,
  markupPct: (costPaise, pricePaise) => costPaise > 0 ? ((pricePaise - costPaise) / costPaise) * 100 : 0,
  priceForMargin: (costPaise, marginPct) => marginPct < 100 ? Math.round(costPaise / (1 - marginPct / 100)) : 0,
  discounted: (pricePaise, pct) => Math.round(pricePaise * (1 - pct / 100)),
  breakEvenUnits: (fixedPaise, unitPricePaise, unitCostPaise) => unitPricePaise > unitCostPaise ? Math.ceil(fixedPaise / (unitPricePaise - unitCostPaise)) : Infinity,
};

export const rupeesToPaise = (v) => { const n = Number(String(v).replace(/[₹,\s]/g, '')); return Number.isFinite(n) ? Math.round(n * 100) : 0; };
export const paiseToRupees = (p) => (p / 100).toFixed(2);
export const money = (paise) => '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });
/** Whole rupees, for reports and summaries (no paise). */
export const moneyR = (paise) => '₹' + Math.round(paise / 100).toLocaleString('en-IN');
export const monthLabel = (ym) => new Date(ym + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
export const csvEscape = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCSV = (rows, cols) => [cols.map((c) => csvEscape(c.label)).join(','), ...rows.map((r) => cols.map((c) => csvEscape(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','))].join('\n');
