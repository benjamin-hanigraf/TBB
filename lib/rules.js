'use client';
import { RULES, ruleFor } from './format';
// Props that make an <input>/<textarea> clean itself up: light fixes while typing, full tidy-up when leaving the field.
export function ruleProps(rule) {
  const r = RULES[rule]; if (!r) return {};
  const apply = (el, fn) => { const v = el.value, n = fn(v); if (n !== v) { const pos = el.selectionStart; el.value = n; try { el.setSelectionRange(Math.min(pos, n.length), Math.min(pos, n.length)); } catch {} } };
  return { autoCapitalize: r.cap, spellCheck: r.spell, onInput: (e) => apply(e.target, r.typing), onBlur: (e) => apply(e.target, r.done) };
}
export { ruleFor };
