'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icons';
import { useLoad, sb, must, Page, Card, Empty, Spin, Err, Badge } from './kit';
import { todayISO } from '@/lib/accounting';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const istDate = (s) => new Date(new Date(s).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const istTime = (s) => new Date(s).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).replace(/\s/g, ' ');
const addDays = (isoStr, n) => { const d = new Date(`${isoStr}T00:00:00`); d.setDate(d.getDate() + n); return iso(d); };

/** Turns workshops and class levels into a list of {date, title, kind, time, note} entries. */
export function buildEvents(workshops, levels) {
  const ev = [];
  for (const w of workshops) {
    if (w.status === 'cancelled') continue; const s = istDate(w.starts_at); const e = w.kind === 'course' && w.ends_at ? istDate(w.ends_at) : s;
    for (let d = s, n = 0; d <= e && n < 120; d = addDays(d, 1), n++) ev.push({ date: d, title: w.title, kind: 'workshop', time: d === s ? istTime(w.starts_at) : '', note: w.venue_name || '', draft: w.status === 'draft', href: '/manager/workshops' });
  }
  for (const c of levels) {
    if (!c.starts_on || !c.active) continue; const days = c.days?.length ? c.days : [new Date(`${c.starts_on}T00:00:00`).getDay()];
    let d = c.starts_on, n = 0, guard = 0; while (n < (c.sessions || 8) && guard < 400) { if (days.includes(new Date(`${d}T00:00:00`).getDay())) { n++; ev.push({ date: d, title: `${c.title}, ${c.level}`, kind: 'class', time: c.time_text || '', note: `Class ${n} of ${c.sessions || 8}`, href: '/manager/classes' }); } d = addDays(d, 1); guard++; }
  }
  return ev.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export default function Calendar() {
  const today = todayISO(); const [ym, setYm] = useState(today.slice(0, 7)); const [sel, setSel] = useState(today);
  const { data, error } = useLoad(async () => {
    const c = sb(); const [w, l] = await Promise.all([c.from('workshops').select('id,title,kind,starts_at,ends_at,venue_name,status').order('starts_at'), c.from('class_levels').select('id,title,level,starts_on,days,sessions,time_text,active')]);
    return { w: must(w), l: must(l) };
  });
  const events = useMemo(() => (data ? buildEvents(data.w, data.l) : []), [data]);
  const by = useMemo(() => { const m = {}; events.forEach((e) => (m[e.date] ||= []).push(e)); return m; }, [events]);
  if (error) return <Page title="Calendar"><Err e={error} /></Page>; if (!data) return <Page title="Calendar"><Spin /></Page>;
  const [y, m] = ym.split('-').map(Number); const first = new Date(y, m - 1, 1); const lead = first.getDay(); const count = new Date(y, m, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => `${ym}-${pad(i + 1)}`)]; while (cells.length % 7) cells.push(null);
  const go = (n) => { const d = new Date(y, m - 1 + n, 1); setYm(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); };
  const upcoming = events.filter((e) => e.date >= today).slice(0, 8);
  const dayList = by[sel] || [];
  return (<Page title="Calendar">
    <Card>
      <div className="cal-head"><button className="ad-x" aria-label="Previous month" onClick={() => go(-1)}><Icon n="left" size={18} /></button><h2>{MONTHS[m - 1]} {y}</h2><button className="ad-x" aria-label="Next month" onClick={() => go(1)}><Icon n="right" size={18} /></button>
        <button className="ad-btn ghost sm" onClick={() => { setYm(today.slice(0, 7)); setSel(today); }}>Today</button></div>
      <div className="cal-grid" role="grid" aria-label={`${MONTHS[m - 1]} ${y}`}>
        {DAYS.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => d ? (<button key={d} type="button" className={`cal-day ${d === today ? 'today' : ''} ${d === sel ? 'sel' : ''}`} onClick={() => setSel(d)} aria-label={`${+d.slice(8)} ${MONTHS[m - 1]}${by[d] ? `, ${by[d].length} event${by[d].length > 1 ? 's' : ''}` : ''}`}>
          <b>{+d.slice(8)}</b>
          <span className="cal-chips">{(by[d] || []).slice(0, 2).map((e, k) => <i key={k} className={`chip ${e.kind} ${e.draft ? 'draft' : ''}`}><em>{e.title}</em></i>)}{(by[d] || []).length > 2 && <i className="more">+{by[d].length - 2}</i>}</span>
          <span className="cal-dots">{(by[d] || []).slice(0, 3).map((e, k) => <i key={k} className={e.kind} />)}</span></button>) : <div key={`e${i}`} className="cal-empty" />)}
      </div>
      <p className="cal-key"><i className="dotk workshop" /> Workshops <i className="dotk class" /> Classes</p>
    </Card>
    <Card title={new Date(`${sel}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}>
      {dayList.length ? <div className="ad-list">{dayList.map((e, i) => <Link key={i} href={e.href} className="ad-row"><div className="main"><b>{e.title}</b><small>{[e.time, e.note].filter(Boolean).join(' · ') || (e.kind === 'class' ? 'Class' : 'Workshop')}</small></div><div className="end">{e.draft && <Badge>Draft</Badge>}<Badge>{e.kind === 'class' ? 'Class' : 'Workshop'}</Badge></div></Link>)}</div> : <Empty>Nothing scheduled.</Empty>}
    </Card>
    <Card title="Coming up">
      {upcoming.length ? <div className="ad-list">{upcoming.map((e, i) => <Link key={i} href={e.href} className="ad-row"><div className="main"><b>{e.title}</b><small>{[e.time, e.note].filter(Boolean).join(' · ')}</small></div><div className="end"><small>{new Date(`${e.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</small></div></Link>)}</div> : <Empty>No upcoming workshops or classes. Add a start date and days to a class level, or schedule a workshop.</Empty>}
    </Card>
  </Page>);
}
