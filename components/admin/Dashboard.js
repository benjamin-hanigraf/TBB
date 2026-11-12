'use client';
import Link from 'next/link';
import Icon from '@/components/Icons';
import { useLoad, sb, must, every, Page, Card, Stat, Badge, Empty, Spin, Err, fmtD, fmtDT } from './kit';
import { summarise, fyOf, todayISO, money } from '@/lib/accounting';

const istDay = (s) => new Date(new Date(s).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const istTime = (s) => new Date(s).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
const soft = (r) => (r.error ? [] : r.data || []);        // a part that fails to load is simply left out, Home still opens

export default function Dashboard() {
  const { data: d, error } = useLoad(async () => {
    const c = sb(); const today = todayISO(); const fy = fyOf(today);
    const [ledger, toPack, inbox, ws, recentO, recentB, low, recentE, todos, near, sess, late, inv] = await Promise.all([
      every(() => c.from('ledger_entries').select('entry_date,kind,category,amount_paise,gst_paise').gte('entry_date', `${fy.slice(0, 4)}-04-01`).order('id')),
      c.from('orders').select('id', { count: 'exact', head: true }).in('status', ['paid', 'packed']),          // same as "To pack" on the Orders page
      c.from('enquiries').select('id', { count: 'exact', head: true }).is('read_at', null),
      c.from('workshops').select('id,title,starts_at,capacity,status').gte('starts_at', new Date().toISOString()).neq('status', 'draft').order('starts_at').limit(3),
      c.from('orders').select('id,name,total_paise,paid_at').not('paid_at', 'is', null).order('paid_at', { ascending: false }).limit(5),
      c.from('bookings').select('id,name,amount_paise,paid_at,workshops(title)').not('paid_at', 'is', null).order('paid_at', { ascending: false }).limit(5),
      c.from('products').select('id,title,stock').eq('active', true).eq('allow_preorder', false).lte('stock', 2).limit(5),
      c.from('class_enrolments').select('id,name,amount_paise,paid_at,class_levels(title,level)').not('paid_at', 'is', null).order('paid_at', { ascending: false }).limit(5),
      c.from('todos').select('id,title,due_on').eq('done', false).lte('due_on', today).order('due_on'),
      c.from('workshops').select('id,title,kind,starts_at,ends_at,status').neq('status', 'cancelled').gte('starts_at', new Date(Date.now() - 60 * 864e5).toISOString()).lte('starts_at', new Date(Date.now() + 2 * 864e5).toISOString()),
      c.from('class_sessions').select('*,class_enrolments(student_name,class_levels(title,level))').eq('on_date', today).neq('status', 'cancelled'),
      c.from('class_sessions').select('id', { count: 'exact', head: true }).lt('on_date', today).eq('status', 'scheduled'),
      c.from('invoices').select('id,total_paise,due_date,status,doc_type,invoice_payments(amount_paise)').eq('doc_type', 'invoice').in('status', ['draft', 'sent']).lt('due_date', today)]);
    const unread = inbox.error ? await c.from('enquiries').select('id', { count: 'exact', head: true }).eq('handled', false) : inbox;   // before database update v9
    const w = must(ws); let taken = {};
    if (w.length) { const b = must(await c.from('bookings').select('workshop_id,seats').in('workshop_id', w.map((x) => x.id)).eq('status', 'paid')); b.forEach((x) => (taken[x.workshop_id] = (taken[x.workshop_id] || 0) + x.seats)); }
    const recent = [...must(recentO).map((o) => ({ k: 'Order', who: o.name, amt: o.total_paise, at: o.paid_at, id: o.id })), ...must(recentB).map((o) => ({ k: o.workshops?.title || 'Workshop', who: o.name, amt: o.amount_paise, at: o.paid_at, id: o.id })), ...must(recentE).map((o) => ({ k: `${o.class_levels?.title || 'Class'}, ${o.class_levels?.level || ''}`, who: o.name, amt: o.amount_paise, at: o.paid_at, id: o.id }))].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
    const all = must(ledger); const month = today.slice(0, 7); const td = soft(todos);
    // Today: workshops on today (a course counts on every day it runs), classes on today, to-dos due today
    const day = [
      ...soft(near).filter((x) => { const s = istDay(x.starts_at), e = x.kind === 'course' && x.ends_at ? istDay(x.ends_at) : s; return s <= today && today <= e; }).map((x) => ({ key: `w${x.id}`, t: x.title, s: `${istDay(x.starts_at) === today ? istTime(x.starts_at) : 'Course day'}${x.status === 'draft' ? ' · draft' : ''}`, kind: 'Workshop', href: '/manager/workshops' })),
      ...soft(sess).map((x) => { const en = x.class_enrolments || {}; const l = en.class_levels || {}; return { key: `c${x.id}`, t: en.student_name || 'Class', s: [x.time_text, `${l.title || 'Class'}${l.level ? ` (${l.level})` : ''}`].filter(Boolean).join(' · '), kind: 'Class', href: '/manager/classes' }; }),
      ...td.filter((x) => x.due_on === today).map((x) => ({ key: `t${x.id}`, t: x.title, s: '', kind: 'To-do', href: '/manager/planner' }))];
    // Needs attention: only things that are late or running out
    const owed = soft(inv).map((i) => i.total_paise - (i.invoice_payments || []).reduce((s, p) => s + p.amount_paise, 0)).filter((x) => x > 0);
    const lateTodos = td.filter((x) => x.due_on < today).length; const noAttendance = late.error ? 0 : late.count || 0;
    const attention = [
      ...(lateTodos ? [{ key: 'todo', t: `${lateTodos} ${lateTodos === 1 ? 'to-do is' : 'to-dos are'} overdue`, href: '/manager/planner' }] : []),
      ...(noAttendance ? [{ key: 'att', t: `Not marked as attended: ${noAttendance} ${noAttendance === 1 ? 'class' : 'classes'}`, href: '/manager/classes' }] : []),
      ...(owed.length ? [{ key: 'inv', t: `${owed.length} ${owed.length === 1 ? 'invoice is' : 'invoices are'} overdue · ${money(owed.reduce((s, x) => s + x, 0))} to collect`, href: '/manager/money?tab=invoices' }] : []),
      ...must(low).map((p) => ({ key: `p${p.id}`, t: p.stock === 0 ? `${p.title} is out of stock` : `${p.title}: only ${p.stock} left`, href: '/manager/products' }))];
    return { fy, sum: summarise(all.map((e) => ({ ...e })), fy), thisMonth: summarise(all.filter((e) => e.entry_date.startsWith(month)), fy), toPack: toPack.count || 0, inbox: unread.count || 0, ws: w, taken, recent, day, attention };
  });
  if (error) return <Page title="Home"><Err e={error} /></Page>;
  if (!d) return <Page title="Home"><Spin /></Page>;
  const defPin = (() => { try { return !!sessionStorage.getItem('tbb-defpin'); } catch { return false; } })();
  return (<Page title="Home">
    {defPin && <Link href="/manager/settings" className="ad-err" style={{ display: 'block', background: '#fff3d6', color: '#7a4b00' }}>You are still using the starting PIN (0000). Tap here to change it.</Link>}
    <div className="ad-quick">
      {[['/manager/planner', 'Calendar', 'calendardays'], ['/manager/money?tab=calculator', 'Calculator', 'calc'], ['/manager/money?tab=invoices', 'Invoice Generator', 'file'], ['/manager/labels', 'Label Printer', 'print']].map(([h, t, i]) => <Link key={h} href={h}><Icon n={i} size={26} /><span>{t}</span></Link>)}
    </div>
    <div className="ad-grid">
      <Link href="/manager/orders"><Stat label="Orders to pack" value={d.toPack} sub={d.toPack ? 'Tap to see' : 'All caught up'} /></Link>
      <Link href="/manager/inbox"><Stat label="New messages" value={d.inbox} sub={d.inbox ? 'Tap to read' : 'Nothing new'} /></Link>
      <Stat label="Income this month" value={money(d.thisMonth.moneyIn)} />
      <Stat label="Profit this month" value={money(d.thisMonth.profit)} tone={d.thisMonth.profit < 0 ? 'bad' : 'good'} sub={`This year: ${money(d.sum.profit)}`} />
    </div>
    <Card title="Today">{d.day.length ? <div className="ad-list">{d.day.map((x) => <Link key={x.key} href={x.href} className="ad-row"><div className="main"><b>{x.t}</b>{x.s && <small>{x.s}</small>}</div><div className="end"><Badge>{x.kind}</Badge></div></Link>)}</div> : <Empty>Nothing scheduled today.</Empty>}</Card>
    {d.attention.length > 0 && <Card title="Needs attention"><div className="ad-list">{d.attention.map((x) => <Link key={x.key} href={x.href} className="ad-row"><div className="main"><b>{x.t}</b></div></Link>)}</div></Card>}
    <Card title="Upcoming workshops" action={<Link href="/manager/workshops" className="ad-help">See all</Link>}>
      {d.ws.length ? <div className="ad-list">{d.ws.map((w) => <Link key={w.id} href="/manager/workshops" className="ad-row"><div className="main"><b>{w.title}</b><small>{fmtD(w.starts_at)}</small></div><div className="end"><b>{d.taken[w.id] || 0} / {w.capacity}</b><small>seats booked</small></div></Link>)}</div> : <Empty>No upcoming workshops. Add one to start taking bookings.</Empty>}
    </Card>
    <Card title="Recent payments">
      {d.recent.length ? <div className="ad-list">{d.recent.map((r) => <div key={r.k + r.id} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{r.who}</b><small>{r.k} · {fmtDT(r.at)}</small></div><div className="end"><b>{money(r.amt)}</b></div></div>)}</div> : <Empty>Payments will appear here.</Empty>}
    </Card>
  </Page>);
}
