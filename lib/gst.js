// GST on shop items. mode: 'none' (no GST), 'add' (18% added on top of the price), 'included' (the price already contains 18%).
export const GST_RATE = 18;
export const GST_MODES = [['none', 'No GST'], ['add', 'Add GST (18%)'], ['included', 'Includes GST (18%)']];
/** price in paise (or rupees, any unit) times qty -> { net, gst, total } in the same unit */
export function gstLine(unit, qty, mode) {
  const base = Math.round(unit * qty);
  if (mode === 'add') { const gst = Math.round(base * GST_RATE / 100); return { net: base, gst, total: base + gst }; }
  if (mode === 'included') { const gst = Math.round(base - base / (1 + GST_RATE / 100)); return { net: base - gst, gst, total: base }; }
  return { net: base, gst: 0, total: base };
}
