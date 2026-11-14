'use client';
import { useEffect } from 'react';

/** Keyboard controls for the whole Manager app, in one place (see the list in EDITS.txt).
 *  Lists, menus and rows:   Down / Up move between the rows of a list, Home / End jump to the first or last one. Enter or Space opens the focused row.
 *  Tab bars and switches:   Left / Right move to the next or previous choice and select it (Home / End for the first and last).
 *  Calendar:                arrows move by a day or a week, Page Up / Page Down change the month, Enter opens the day.
 *  Search:                  "/" jumps to the search box, Esc clears it, Esc again leaves it.
 *  Windows (pop-ups):       Esc closes, Tab stays inside, Ctrl or Cmd + S (or Enter) saves; handled in Modal (kit.js).
 *  Pages:                   the browser's Back (or Alt + Left) goes up one level, handled in Shell.js. */
const typing = (el) => !!el?.closest?.('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,select,[contenteditable="true"]');
const visible = (el) => el.getClientRects().length > 0 && !el.closest('[hidden]');
const go = (el) => { el.focus({ preventScroll: false }); el.scrollIntoView?.({ block: 'nearest' }); };

const ROW = 'a.ad-row, button.ad-row, .mail-open, .todo-main';
function rowsOf(el) {
  const side = el.closest('.ad-side nav'); if (side) return [...side.querySelectorAll('a')];
  const list = el.closest('.ad-list, .cls-list'); if (!list) return null;
  const all = [...list.querySelectorAll(`${ROW}, .ad-row input[type=checkbox], .ad-row .ad-grip`)].filter(visible);
  const mine = el.matches('input[type=checkbox]') ? 'input[type=checkbox]' : el.matches('.ad-grip') ? '.ad-grip' : ROW;       // arrows move between the same kind of control
  return all.filter((x) => x.matches(mine));
}

export function useAdminKeys() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target; if (!(t instanceof Element)) return; const k = e.key;

      // ---- "/" focuses search; Esc clears it, then leaves it
      if (k === '/' && !typing(t) && !t.closest('[contenteditable="true"]')) { const scope = [...document.querySelectorAll('.ad-modal-bg')].pop() || document.querySelector('.ad-main'); const s = [...(scope?.querySelectorAll('.ad-search') || [])].find(visible); if (s) { e.preventDefault(); s.focus(); s.select?.(); } return; }
      if (k === 'Escape' && t.matches?.('.ad-search')) {
        e.preventDefault(); e.stopPropagation(); if (t.value) { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(t, ''); t.dispatchEvent(new Event('input', { bubbles: true })); } else t.blur(); return;
      }
      if (typing(t)) {
        // From a search box, Down moves into the results list below it
        if (k === 'ArrowDown' && t.matches('.ad-search')) { const first = [...document.querySelectorAll('.ad-main .ad-list')].flatMap((l) => [...l.querySelectorAll(ROW)]).find(visible); if (first) { e.preventDefault(); go(first); } }
        return;
      }

      // ---- tab bars, switches and filters: Left / Right (also Up / Down in a vertical one), Home / End
      const group = t.closest('[role=tablist], .ad-tabsbar, .ad-seg, .ad-tabs, .cal-pick');
      if (group && (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Home' || k === 'End')) {
        const items = [...group.querySelectorAll('button, a')].filter((x) => visible(x) && !x.disabled); const i = items.indexOf(t.closest('button, a')); if (i < 0) return;
        const n = k === 'Home' ? 0 : k === 'End' ? items.length - 1 : (i + (k === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
        e.preventDefault(); go(items[n]); if (group.matches('[role=tablist], .ad-tabsbar, .ad-seg')) items[n].click(); return;       // selecting follows the focus, like a tab bar on a phone
      }

      // ---- calendar: arrows move by a day or a week, Page Up / Page Down by a month
      const day = t.closest('.cal-day');
      if (day || (t.closest('.cal-grid') && (k === 'PageUp' || k === 'PageDown'))) {
        if (k === 'PageUp' || k === 'PageDown') { const b = document.querySelector(`.cal-head button[aria-label="${k === 'PageUp' ? 'Previous' : 'Next'} month"]`); if (b) { e.preventDefault(); b.click(); } return; }
        const days = [...document.querySelectorAll('.cal-grid .cal-day')]; const i = days.indexOf(day); const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[k];
        if (d && i >= 0) { e.preventDefault(); const n = days[i + d]; if (n) { go(n); n.click(); } } else if (k === 'Home' || k === 'End') { e.preventDefault(); const n = days[k === 'Home' ? 0 : days.length - 1]; if (n) { go(n); n.click(); } }
        return;
      }

      // ---- lists and the side menu: Down / Up, Home / End
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Home' || k === 'End') {
        const rows = rowsOf(t); if (!rows || rows.length < 2) return; const i = rows.indexOf(t); if (i < 0) return;
        const n = k === 'Home' ? 0 : k === 'End' ? rows.length - 1 : i + (k === 'ArrowDown' ? 1 : -1); if (n < 0 || n >= rows.length) return; e.preventDefault(); go(rows[n]);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
