'use client';
import { useEffect, useState } from 'react';
// A small switch between two or three views of one page (for example Workshops | Classes). The choice is kept in the address (?tab=...), so links and refreshes land on the same view.
export function useTab(options, fallback) {
  const [tab, setTabState] = useState(fallback);
  useEffect(() => { const t = new URLSearchParams(window.location.search).get('tab'); if (t && options.some(([k]) => k === t)) setTabState(t); /* eslint-disable-next-line */ }, []);
  const setTab = (t) => { setTabState(t); try { const u = new URL(window.location.href); u.searchParams.set('tab', t); window.history.replaceState(null, '', u); } catch {} };
  return [tab, setTab];
}
export default function Seg({ options, value, onChange, label = 'View' }) {
  return (<div className="ad-seg" role="tablist" aria-label={label}>{options.map(([k, t]) => <button key={k} type="button" role="tab" aria-selected={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>{t}</button>)}</div>);
}
