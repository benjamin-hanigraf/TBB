// Small spreadsheet (CSV) reader and writer. Understands commas, semicolons or tabs (pasting from Excel), quotes and a byte-order mark.
export function parseCSV(text) {
  text = String(text || '').replace(/^﻿/, ''); const first = text.split(/\r?\n/)[0] || '';
  const delim = ['\t', ';', ','].reduce((b, d) => (first.split(d).length > first.split(b).length ? d : b), ',');
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((c) => c.trim() !== '')) rows.push(row); row = []; }
    else cur += ch;
  }
  row.push(cur); if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}
export const norm = (h) => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
/** rows (first row = headings) -> array of objects keyed by normalised heading */
export function toObjects(rows) {
  if (!rows.length) return [];
  const heads = rows[0].map(norm); return rows.slice(1).map((r) => Object.fromEntries(heads.map((h, i) => [h, (r[i] ?? '').trim()])));
}
const esc = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const writeCSV = (headings, ...records) => [headings, ...records].map((r) => r.map(esc).join(',')).join('\r\n');
// ---- value readers used by the importer
export const yes = (v) => /^(y|yes|true|1|on)$/i.test(String(v || '').trim());
export const asList = (v) => String(v || '').split(/[|;\n]/).map((x) => x.trim()).filter(Boolean);
export function asDate(v) {                                  // 25/12/2026, 25-12-2026 or 2026-12-25 -> 2026-12-25
  const s = String(v || '').trim(); let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s); let y, mo, d;
  if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; } else if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) { y = +m[1]; mo = +m[2]; d = +m[3]; } else return null;
  const dt = new Date(Date.UTC(y, mo - 1, d)); if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
export function asTime(v) {                                  // 10:30 AM, 10am, 14:00, empty -> 10:00
  const s = String(v || '').trim().toLowerCase(); if (!s) return '10:00';
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(s); if (!m) return null; let h = +m[1]; const mi = +(m[2] || 0);
  if (m[3] === 'pm' && h < 12) h += 12; if (m[3] === 'am' && h === 12) h = 0; if (h > 23 || mi > 59) return null; return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}
export const istISO = (date, time) => new Date(`${date}T${time}:00+05:30`).toISOString();
