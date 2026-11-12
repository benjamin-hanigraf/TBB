// Class batches: working out the dates of the classes, and moving them.
const pad = (n) => String(n).padStart(2, '0');
export const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const dayOf = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();          // 0 = Sunday
export const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 864e5);
/** The dates of `count` classes starting on or after `start`, on the chosen weekdays (0 = Sunday). With no weekday chosen, the weekday of the first class repeats every week. */
export function classDates(start, days, count) {
  const ds = days?.length ? days : [dayOf(start)]; const out = []; let d = start, guard = 0;
  while (out.length < count && guard < 1500) { if (ds.includes(dayOf(d))) out.push(d); d = addDays(d, 1); guard++; }
  return out;
}
/** Move one class to a new date. With shiftLater, every later class that is still to come moves by the same number of days. Returns the changes to save. */
export function moveClass(sessions, no, newDate, shiftLater) {
  const s = sessions.find((x) => x.no === no); if (!s) return []; const delta = daysBetween(s.on_date, newDate); if (!delta) return [];
  const out = [{ id: s.id, on_date: newDate, moved_from: s.moved_from || s.on_date }];
  if (shiftLater) for (const x of sessions) if (x.no > no && x.status === 'scheduled') out.push({ id: x.id, on_date: addDays(x.on_date, delta), moved_from: x.moved_from || x.on_date });
  return out;
}
/** How one student is doing: classes attended out of the classes held so far, and out of the whole course. */
export function progress(sessions, attendance, enrolmentId) {
  const held = sessions.filter((s) => s.status === 'done'); const present = held.filter((s) => attendance.some((a) => a.session_id === s.id && a.enrolment_id === enrolmentId && a.present)).length;
  return { attended: present, held: held.length, total: sessions.length, missed: held.length - present };
}
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dayList = (days) => (days?.length ? [...days].sort().map((d) => DAY_NAMES[d]).join(', ') : '');
export const fmtDay = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
