'use client';
import Link from 'next/link';
import { useLoad, sb, must, Page, Card, Stat, Badge, Empty, Spin, Err, fmtD, fmtDT } from './kit';
import { summarise, fyOf, todayISO, money } from '@/lib/accounting';
export default function Dashboard() {
  const { data: d, error } = useLoad(async () => {
    const c = sb(); const fy = fyOf(todayISO());
    const [ledger, toPack, inbox, ws, recentO, recentB, low] = await Promise.all([
      c.from('ledger_entries').select('entry_date,kind,category,amount_paise,gst_paise').gte('entry_date', `${fy.slice(0, 4)}-04-01`).limit(5000),
      c.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
      c.from('enquiries').select('id', { count: 'exact', head: true }).eq('handled', false),
      c.from('workshops').select('id,title,starts_at,capacity,status').gte('starts_at', new Date().toISOString()).neq('status', 'draft').order('starts_at').limit(3),
      c.from('orders').select('id,name,total_paise,paid_at').not('paid_at', 'is', null).order('paid_at', { ascending: false }).limit(5),
      c.from('bookings').select('id,name,amount_paise,paid_at,workshops(title)').not('paid_at', 'is', null).order('paid_at', { ascending: false }).limit(5),
      c.from('products').select('id,title,stock').eq('active', true).eq('allow_preorder', false).lte('stock', 2).limit(5),
    ]);
    const w = must(ws); let taken = {};
    if (w.length) { const b = must(await c.from('bookings').select('workshop_id,seats').in('workshop_id', w.map((x) => x.id)).eq('status', 'paid')); b.forEach((x) => (taken[x.workshop_id] = (taken[x.workshop_id] || 0) + x.seats)); }
    const recent = [...must(recentO).map((o) => ({ k: 'Order', who: o.name, amt: o.total_paise, at: o.paid_at, id: o.id })), ...must(recentB).map((o) => ({ k: o.workshops?.title || 'Workshop', who: o.name, amt: o.amount_paise, at: o.paid_at, id: o.id }))].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
    const all = must(ledger); const month = todayISO().slice(0, 7);
    return { fy, sum: summarise(all.map((e) => ({ ...e })), fy), thisMonth: summarise(all.filter((e) => e.entry_date.startsWith(month)), fy), toPack: toPack.count || 0, inbox: inbox.count || 0, ws: w, taken, recent, low: must(low) };
  });
  if (error) return <Page title="Home"><Err e={error} /></Page>;
  if (!d) return <Page title="Home"><Spin /></Page>;
  return (<Page title="Home">
    <div className="ad-grid">
      <Link href="/admin/orders"><Stat label="Orders to pack" value={d.toPack} sub={d.toPack ? 'Tap to see' : 'All caught up'} /></Link>
      <Link href="/admin/inbox"><Stat label="New messages" value={d.inbox} sub={d.inbox ? 'Tap to reply' : 'Nothing new'} /></Link>
      <Stat label="Money in this month" value={money(d.thisMonth.moneyIn)} />
      <Stat label="Profit this month" value={money(d.thisMonth.profit)} tone={d.thisMonth.profit < 0 ? 'bad' : 'good'} sub={`This year: ${money(d.sum.profit)}`} />
    </div>
    <div className="ad-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
      <Link className="ad-btn" href="/admin/workshops?new=1">New workshop</Link><Link className="ad-btn ghost" href="/admin/products?new=1">Add product</Link>
      <Link className="ad-btn ghost" href="/admin/tools/invoice">New invoice</Link><Link className="ad-btn ghost" href="/admin/money?new=out">Add expense</Link>
    </div>
    <Card title="Upcoming workshops" action={<Link href="/admin/workshops" className="ad-help">See all</Link>}>
      {d.ws.length ? <div className="ad-list">{d.ws.map((w) => <Link key={w.id} href="/admin/workshops" className="ad-row"><div className="main"><b>{w.title}</b><small>{fmtD(w.starts_at)}</small></div><div className="end"><b>{d.taken[w.id] || 0} / {w.capacity}</b><small>seats booked</small></div></Link>)}</div> : <Empty>No upcoming workshops. Add one to start taking bookings.</Empty>}
    </Card>
    <Card title="Recent payments">
      {d.recent.length ? <div className="ad-list">{d.recent.map((r) => <div key={r.k + r.id} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{r.who}</b><small>{r.k} · {fmtDT(r.at)}</small></div><div className="end"><b>{money(r.amt)}</b><Badge tone="ok">Paid</Badge></div></div>)}</div> : <Empty>Payments will appear here.</Empty>}
    </Card>
    {d.low.length > 0 && <Card title="Running low"><div className="ad-list">{d.low.map((p) => <Link key={p.id} href="/admin/products" className="ad-row"><div className="main"><b>{p.title}</b></div><Badge tone={p.stock === 0 ? 'bad' : 'warn'}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</Badge></Link>)}</div></Card>}
  </Page>);
}
