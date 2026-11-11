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
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'NOSCRIPT']);
function fix(s) {
  let t = s;
  for (const [re, rep] of RULES) t = t.replace(re, rep);
  const trimmed = t.trimEnd(); const tail = t.slice(trimmed.length);
  const words = trimmed.split(/\s+/);
  if (words.length >= 3) {                       // glue the last two words
    const i = trimmed.lastIndexOf(' ');
    if (i > 0) t = trimmed.slice(0, i) + ' ' + trimmed.slice(i + 1) + tail;
  }
  return t;
}
function run(root) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && !SKIP.has(n.parentElement.tagName) && /\S\s+\S/.test(n.nodeValue)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  for (const n of nodes) { const next = fix(n.nodeValue); if (next !== n.nodeValue) n.nodeValue = next; }
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
