// Document numbers for invoices, quotations and orders. Used by the Manager app and by the server, so they always agree.
// A format is plain text with placeholders:   YYYY-YY = financial year (2026-27)   YYYY = year the financial year starts   YY = its last two digits
//                                             ####    = the number; one # is one digit, so #### gives leading zeros (0042)
// Example: "TBB/YYYY-YY/####" becomes TBB/2026-27/0042. The financial year runs April to March.
const pad2 = (n) => String(n).padStart(2, '0');
export function financialYear(iso) { const [y, m] = String(iso).slice(0, 10).split('-').map(Number); const start = m >= 4 ? y : y - 1; return { start, label: `${start}-${pad2((start + 1) % 100)}` }; }

export const DEFAULT_FORMATS = { invoice: 'TBB/YYYY-YY/###', quotation: 'TBB-Q/YYYY-YY/###', order: 'ORD-####' };

/** The format chosen in Settings. Older settings only had a prefix; it becomes "prefix/###". */
export function formatFor(kind, settings) {
  const s = (kind === 'order' ? settings?.order : settings?.invoice) || {};
  const saved = kind === 'quotation' ? s.quotation_format : s.format;
  if (saved && validFormat(saved) === '') return saved;
  const prefix = kind === 'quotation' ? s.quotation_prefix : kind === 'invoice' ? s.prefix : '';
  return prefix ? `${String(prefix).replace(/\/+$/, '')}/###` : DEFAULT_FORMATS[kind];
}
/** '' when the format is fine, otherwise a short message for the owner. */
export function validFormat(format) {
  const f = String(format || ''); if (!f.trim()) return 'Please type a format.'; if (!/#/.test(f)) return 'The format needs # for the number, for example ####.';
  if ((f.match(/#+/g) || []).length > 1) return 'Use one group of # only, for example ####.'; if (f.length > 40) return 'That is too long.'; return '';
}
const years = (format, iso) => { const fy = financialYear(iso); return String(format).replace(/YYYY-YY/g, fy.label).replace(/YYYY/g, String(fy.start)).replace(/YY/g, pad2(fy.start % 100)); };
/** formatNumber('TBB/YYYY-YY/####', 42, '2026-11-12') -> 'TBB/2026-27/0042' */
export function formatNumber(format, n, iso) { return years(format, iso).replace(/#+/, (run) => String(n).padStart(run.length, '0')); }
/** The number that comes after the highest one already used in this format and year (never below `start`). */
export function nextNumberInList(existing, format, iso, start = 1) {
  const text = years(format, iso); const i = text.search(/#+/); if (i < 0) return formatNumber(format, Math.max(1, Number(start) || 1), iso);
  const run = text.match(/#+/)[0]; const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${esc(text.slice(0, i))}(\\d+)${esc(text.slice(i + run.length))}$`); let max = 0;
  for (const n of existing || []) { const m = String(n).match(re); if (m) max = Math.max(max, parseInt(m[1], 10)); }
  return formatNumber(format, Math.max(max + 1, Number(start) || 1), iso);
}
/** An order's number as shown (empty if it has none yet). */
export const orderNumber = (order, settings) => (order?.order_no != null ? formatNumber(formatFor('order', settings), order.order_no, String(order.created_at || new Date().toISOString()).slice(0, 10)) : '');
