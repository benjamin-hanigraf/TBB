// Spotting two things planned for the same day at the same time: classes, workshops, events and rent-outs.
// Times are typed by hand ("4:30 pm", "11 am to 12:30 pm", "7 to 8 pm"), so they are read leniently. A thing with no readable time is never reported as a clash.
const toMin = (h, m, ap) => { let x = Number(h) % 12; if (ap === 'pm') x += 12; return x * 60 + Number(m || 0); };
const TIME = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/gi;
const meridiem = (s) => (s ? (/^p/i.test(s) ? 'pm' : 'am') : '');

const guess = (h) => (Number(h) >= 8 && Number(h) <= 11 ? 'am' : 'pm');   // a bare "9" is morning, a bare "4:30" is afternoon
/** "4:30 pm" -> {start, end} in minutes after midnight (one hour long); "7 to 8 pm" -> 7 pm to 8 pm; "All day" -> the whole day; unreadable -> null. */
export function parseSlot(text) {
  const t = String(text || '').trim(); if (!t) return null; if (/all\s*day|full\s*day/i.test(t)) return { start: 0, end: 1440 };
  const found = [...t.matchAll(TIME)].filter((m) => m[1] && Number(m[1]) <= 24).slice(0, 2); if (!found.length) return null;
  if (found.length === 1) { const m = found[0]; const s = toMin(m[1], m[2], meridiem(m[3]) || guess(m[1])); return { start: s, end: Math.min(1440, s + 60) }; }
  const [a, b] = found; const apB = meridiem(b[3]) || guess(b[1]); const apA = meridiem(a[3]) || (b[3] ? apB : guess(a[1]));
  let start = toMin(a[1], a[2], apA); const end = toMin(b[1], b[2], apB);
  if (!a[3] && start > end) start = toMin(a[1], a[2], apA === 'pm' ? 'am' : 'pm');            // "11 to 1 pm" means 11 am to 1 pm
  return end > start ? { start, end } : { start, end: Math.min(1440, start + 60) };
}
/** A workshop only has a start time, so it is taken to last three hours. */
export function slotFromStart(startMinutes, hours = 3) { return { start: startMinutes, end: Math.min(1440, startMinutes + hours * 60) }; }
export const overlaps = (a, b) => !!a && !!b && a.start < b.end && b.start < a.end;
/** candidate and others: { date: 'YYYY-MM-DD', slot, label }. Returns the others that fall on the same day at an overlapping time. */
export function findClashes(candidate, others) { return (others || []).filter((o) => o.date === candidate.date && overlaps(candidate.slot, o.slot)); }
const hm = (min) => { const h = Math.floor(min / 60), m = min % 60; const ap = h >= 12 ? 'pm' : 'am'; return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${ap}`; };
export const describeSlot = (s) => (s ? (s.start === 0 && s.end === 1440 ? 'all day' : `${hm(s.start)} to ${hm(s.end)}`) : '');
