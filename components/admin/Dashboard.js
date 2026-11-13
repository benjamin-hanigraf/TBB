'use client';
import Link from 'next/link';
import Icon from '@/components/Icons';
import { useLoad, sb, must, every, Page, Card, Fold, Stat, Badge, Empty, Spin, Err, fmtD, fmtDT } from './kit';
import { summarise, fyOf, todayISO, money, moneyR } from '@/lib/accounting';

const istDay = (s) => new Date(new Date(s).getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const istTime = (s) => new Date(s).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
const soft = (r) => (r.error ? [] : r.data || []);        // a part that fails to load is simply left out, Home still opens
const MAX_ATTENTION = 10;

export default function Dashboard() {
  const { data: d, error } = useLoad(async () => {
    const c = sb(); const today = todayISO(); const fy = fyOf(today); const lvl = (l) => `${l?.title || 'Class'}${l?.level ? ` (${l.level})` : ''}`;
    const [ledger, toPack, inbox, ws, recentO, recentB, low, recentE, todos, near, sess, late, inv] = await Promise.all([
      every(() => c.from('ledger_entries').select('entry_date,kind,category,amount_paise,gst_paise').gte('entry_date', `${fy.slice(0, 4)}-04-01`).order('id')),
      c.from('orders').select('id', { count: 'exact', head: true }).in('status', ['paid', 'packed']),          // same as "To ship" on the Orders page
      c.from('enquiries').select('id', { count: 'exact', head: true }).is('read_at', null),
      c.from('workshops').select('id,title,starts_at,capacity,status').gte('starts_at', new Date().toISOString()).eq('status', 'published').order('starts_at').limit(3),
      c.from('orders').select('id,name,total_paise,paid_at').not('paid_at', 'is', null).order('paid_at', { ascending: false }).limit(5),
      c.from('bookings').select('id,name,amount_paise,paid_at,workshops(title)').not('paid_at', 'is', null).order('paid_at', { ascending: false }).limit(5),
      c.from('products').select('id,title,stock').eq('active', true).eq('allow_preorder', false).lte('stock', 2).limit(5),
      c.from('class_enrolments').select('id,name,amount_paise,paid_at,class_levels(title,level)').not('paid_at', 'is', null).order('paid_at', { ascending: false }).limit(5),
      c.from('todos').select('id,title,due_on').eq('done', false).or(`due_on.lte.${today},due_on.is.null`).order('due_on'),
      c.from('workshops').select('id,title,kind,starts_at,ends_at,status').neq('status', 'cancelled').gte('starts_at', new Date(Date.now() - 60 * 864e5).toISOString()).lte('starts_at', new Date(Date.now() + 2 * 864e5).toISOString()),
      c.from('class_sessions').select('*,class_enrolments(student_name,class_levels(title,level))').eq('on_date', today).neq('status', 'cancelled'),
      c.from('class_sessions').select('id,no,on_date,enrolment_id,class_enrolments(student_name,class_id)').lt('on_date', today).eq('status', 'scheduled').order('on_date').limit(MAX_ATTENTION),
      every(() => c.from('invoices').select('id,customer_name,total_paise,due_date,status,doc_type,invoice_payments(amount_paise)').eq('doc_type', 'invoice').in('status', ['draft', 'sent']).order('id'))]);
    const unread = inbox.error ? await c.from('enquiries').select('id', { count: 'exact', head: true }).eq('handled', false) : inbox;   // before the database was updated
    const w = must(ws); let taken = {};
    if (w.length) { const b = must(await c.from('bookings').select('workshop_id,seats').in('workshop_id', w.map((x) => x.id)).eq('status', 'paid')); b.forEach((x) => (taken[x.workshop_id] = (taken[x.workshop_id] || 0) + x.seats)); }
    const recent = [...must(recentO).map((o) => ({ k: 'Order', who: o.name, amt: o.total_paise, at: o.paid_at, id: o.id })), ...must(recentB).map((o) => ({ k: o.workshops?.title || 'Workshop', who: o.name, amt: o.amount_paise, at: o.paid_at, id: o.id })), ...must(recentE).map((o) => ({ k: lvl(o.class_levels), who: o.name, amt: o.amount_paise, at: o.paid_at, id: o.id }))].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
    const all = must(ledger); const month = today.slice(0, 7); const td = soft(todos);
    // Today: workshops on today (a course counts on every day it runs), classes on today, and pending tasks
    const day = [
      ...soft(near).filter((x) => { const s = istDay(x.starts_at), e = x.kind === 'course' && x.ends_at ? istDay(x.ends_at) : s; return s <= today && today <= e; }).map((x) => ({ key: `w${x.id}`, t: x.title, s: `${istDay(x.starts_at) === today ? istTime(x.starts_at) : 'Course day'}${x.status === 'draft' ? ' · draft' : ''}`, kind: 'Workshop', href: '/manager/workshops' })),
      ...soft(sess).map((x) => { const en = x.class_enrolments || {}; return { key: `c${x.id}`, t: en.student_name || 'Class', s: [x.time_text, lvl(en.class_levels)].filter(Boolean).join(' · '), kind: 'Class', href: '/manager/classes' }; }),
      ...td.map((x) => ({ key: `t${x.id}`, t: x.title, s: x.due_on && x.due_on < today ? `Overdue since ${fmtD(x.due_on)}` : '', kind: 'Task', href: `/manager/planner?todo=${x.id}` }))];      // pending tasks: due today, overdue, or with no date (the same ones the Planner shows under Today)
    // Receivables: what customers still owe on invoices (all unpaid ones, not only late ones)
    const owing = must(inv).map((i) => ({ ...i, left: i.total_paise - (i.invoice_payments || []).reduce((s, p) => s + p.amount_paise, 0) })).filter((i) => i.left > 0);
    // Needs attention: things that are late or running out, each one opens exactly that item
    const attention = [
      ...owing.filter((i) => i.due_date && i.due_date < today).map((i) => ({ key: `i${i.id}`, t: `${i.customer_name}: invoice overdue`, s: money(i.left), href: `/manager/money?tab=invoices&open=${i.id}` })),
      ...soft(late).map((x) => ({ key: `a${x.id}`, t: `${x.class_enrolments?.student_name || 'Student'}: class ${x.no} not marked`, s: fmtD(x.on_date), href: `/manager/classes?student=${x.enrolment_id}` })),
      ...must(low).map((p) => ({ key: `p${p.id}`, t: p.stock === 0 ? `${p.title} is out of stock` : `${p.title}: only ${p.stock} left`, s: '', href: `/manager/products?open=${p.id}` }))];
    return { sum: summarise(all.map((e) => ({ ...e })), fy), month: summarise(all.filter((e) => e.entry_date.startsWith(month)), fy), toPack: toPack.count || 0, inbox: unread.count || 0, owed: owing.reduce((s, i) => s + i.left, 0), owedN: owing.length, ws: w, taken, recent, day, attention };
  });
  if (error) return <Page title="Hello Rahi"><Err e={error} /></Page>;
  if (!d) return <Page title="Hello Rahi"><Spin /></Page>;
  const defPin = (() => { try { return !!sessionStorage.getItem('tbb-defpin'); } catch { return false; } })();
  const first = d.toPack > 0 ? <Link href="/manager/orders"><Stat label="Orders to ship" value={d.toPack} sub={d.inbox ? `${d.inbox} new ${d.inbox === 1 ? 'message' : 'messages'}` : 'Tap to see'} /></Link>
    : d.inbox > 0 ? <Link href="/manager/inbox"><Stat label="New messages" value={d.inbox} sub="Tap to read" /></Link> : <Link href="/manager/orders"><Stat label="Orders to ship" value={0} sub="All caught up" /></Link>;
  return (<Page title="Hello Rahi">
    {defPin && <Link href="/manager/settings" className="ad-err" style={{ display: 'block', background: '#fff3d6', color: '#7a4b00' }}>You are still using the starting PIN (0000). Tap here to change it.</Link>}
    <div className="ad-quick">
      {[['/manager/planner', 'Planner', 'qplanner'], ['/manager/money?tab=calculator', 'Calculator', 'qcalc'], ['/manager/money?tab=invoices', 'Invoices', 'qinvoice'], ['/manager/labels', 'Label Printer', 'qprint']].map(([h, t, i]) => <Link key={h} href={h}><Icon n={i} size={26} /><span>{t}</span></Link>)}
    </div>
    <div className="ad-grid">
      {first}
      <Link href="/manager/money?tab=invoices"><Stat label="Receivables" value={moneyR(d.owed)} sub={d.owedN ? `From ${d.owedN} ${d.owedN === 1 ? 'invoice' : 'invoices'}` : 'Nothing owed'} /></Link>
      <Link href="/manager/money"><Stat label="Income this month" value={moneyR(d.month.moneyIn)} sub={`Expense: ${moneyR(d.month.moneyOut)}`} /></Link>
      <Link href="/manager/money?view=report"><Stat label="Profit this month" value={moneyR(d.month.profit)} tone={d.month.profit < 0 ? 'bad' : 'good'} sub={`This year: ${moneyR(d.sum.profit)}`} /></Link>
    </div>
    <Card title="Today">{d.day.length ? <div className="ad-list">{d.day.map((x) => <Link key={x.key} href={x.href} className="ad-row"><div className="main"><b>{x.t}</b>{x.s && <small>{x.s}</small>}</div><div className="end"><Badge>{x.kind}</Badge></div></Link>)}</div> : <Empty>Nothing scheduled today.</Empty>}</Card>
    <Card title="Upcoming workshops" action={<Link href="/manager/workshops" className="ad-help">See all</Link>}>
      {d.ws.length ? <div className="ad-list">{d.ws.map((w) => <Link key={w.id} href="/manager/workshops" className="ad-row"><div className="main"><b>{w.title}</b><small>{fmtD(w.starts_at)}</small></div><div className="end"><b>{d.taken[w.id] || 0} / {w.capacity}</b><small>seats booked</small></div></Link>)}</div> : <Empty>No upcoming workshops. Add one to start taking bookings.</Empty>}
    </Card>
    <Card title="Recent payments">
      {d.recent.length ? <div className="ad-list">{d.recent.map((r) => <div key={r.k + r.id} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{r.who}</b><small>{fmtDT(r.at)}</small></div><div className="end"><b>{money(r.amt)}</b></div></div>)}</div> : <Empty>Payments will appear here.</Empty>}
    </Card>
    {d.attention.length > 0 && <Fold title={`Needs attention (${d.attention.length})`}><div className="ad-list">{d.attention.slice(0, MAX_ATTENTION).map((x) => <Link key={x.key} href={x.href} className="ad-row"><div className="main"><b>{x.t}</b>{x.s && <small>{x.s}</small>}</div></Link>)}</div></Fold>}
  </Page>);
}
