// Sums typed into a number box: "400+520", "500-250+100", "1,200 + 300", "99.50+0.50". Only + and - are understood.
/** The total as a number (it may be below zero), or null when the text is not a finished sum (for example "400+" or "abc"). */
export function sumSigned(text) {
  const t = String(text ?? '').replace(/[\s,₹]/g, ''); if (!t) return null;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([+-](\d+\.?\d*|\.\d+))*$/.test(t)) return null;
  const parts = t.match(/[+-]?(\d+\.?\d*|\.\d+)/g); const n = parts.reduce((s, x) => s + parseFloat(x), 0); return Math.round(n * 100) / 100;
}
/** Like sumSigned, but a total below zero counts as no answer (null). */
export const sumOf = (text) => { const r = sumSigned(text); return r === null || r < 0 ? null : r; };
export const hasSum = (text) => /\d\s*[+-]\s*[\d.]/.test(String(text ?? ''));
/** What to show when the box is not being edited: the result of a sum, otherwise the text as it is. */
export const shown = (text) => { const r = hasSum(text) ? sumOf(text) : null; return r === null ? text : String(r); };
