'use client';
import { useEffect } from 'react';
// Typography polish for ALL text on the site (including text from the database):
//  - short words (the, a, of, and...) stay attached to the word that follows them
//  - numbers stay with their units ("8 classes", "4:30 pm", "31 October 2026", "Level 1")
//  - the last two words of any text never split, so no single word is left alone on a line
const SHORT = 'a|an|the|of|in|on|at|to|by|for|and|or|as|is|it|if|so|we|our|your|you|my|with|from|per|into|than|not|no|up';
const RULES = [
  [new RegExp(`\\b(${SHORT})\\s+(?=\\S)`, 'gi'), (m, w) => `${w} `],
  [/(\d)\s+(?=[A-Za-z₹%°])/g, '$1 '],
  [/([A-Za-z])\s+(?=\d)/g, '$1 '],
  [/\s+·\s+/g, ' · '],
  [/(₹)\s+/g, '$1'],
];
// terms that must never be split across lines
const PHRASES = /\b(brush lettering|dip pen calligraphy|dip pen|faux calligraphy|modern calligraphy|thin black brush|teach for india|oblique holder|guideline book)\b/gi;
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'NOSCRIPT']);
function fix(s, heading) {
  let t = heading ? s : s.replace(PHRASES, (m) => m.replace(/\s+/g, '\u00A0'));
  // two capitalised words mid-sentence are almost always a name ("Brush Lettering", "Tamil Nadu"): keep them together
  if (!heading) t = t.replace(/([A-Z][a-z]+)\s+(?=[A-Z][a-z]{2,})/g, (m, w, off, str) => { const before = str.slice(0, off).trimEnd(); return (!before || /[.!?:]$/.test(before)) ? m : w + '\u00A0'; });
  for (const [re, rep] of RULES) t = t.replace(re, rep);
  const trimmed = t.trimEnd(); const tail = t.slice(trimmed.length);
  const words = trimmed.split(/\s+/);
  if (words.length >= 3 && !heading) {           // glue the last two words (headings are balanced by CSS instead)
    const i = trimmed.lastIndexOf(' ');
    if (i > 0 && trimmed.length - i <= 16) t = trimmed.slice(0, i) + ' ' + trimmed.slice(i + 1) + tail;
  }
  return t;
}
function run(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && !SKIP.has(n.parentElement.tagName) && /\S\s+\S/.test(n.nodeValue)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  for (const n of nodes) { const next = fix(n.nodeValue, !!n.parentElement.closest('h1,h2,h3')); if (next !== n.nodeValue) n.nodeValue = next; }
}
export default function Typeset() {
  useEffect(() => {
    run(document.body);
    const mo = new MutationObserver((ms) => { for (const m of ms) { if (m.type === 'childList') m.addedNodes.forEach((n) => { if (n.nodeType === 1) run(n); else if (n.nodeType === 3 && n.parentElement) run(n.parentElement); }); } });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return null;
}
