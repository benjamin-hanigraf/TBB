import { notFound } from 'next/navigation';
import Link from 'next/link';
import Btn from '@/components/Btn';
import Icon from '@/components/Icons';
import { rupees, isPast, fmtDate, business } from '@/lib/data';
import { getWorkshops, getWorkshop } from '@/lib/db';
export const revalidate = 60;
export async function generateStaticParams() { return (await getWorkshops()).map(w => ({ slug: w.slug })); }
export async function generateMetadata({ params }) { const { slug } = await params; return { title: (await getWorkshop(slug))?.title }; }
export default async function Workshop({ params }) {
  const { slug } = await params; const w = await getWorkshop(slug); if (!w) notFound();
  const closed = isPast(w) || w.cancelled;
  const label = w.cancelled ? 'Cancelled' : isPast(w) ? 'Ended' : w.seatsLeft === 0 ? 'Sold out' : 'Open';
  return (<main>
    <section className="section"><div className="wrap split">
      <div className="gallery"><div className="main"><img src={w.image} alt={w.title} /></div></div>
      <div className="info"><span className={`tag ${closed ? 'off' : ''}`}>{label}</span>
        <h1 style={{marginTop:14}}>{w.title}</h1><p className="lead" style={{marginLeft:0}}>{w.summary}</p>
        <ul className="facts">
          <li><Icon n="calendar" /><span><b>{fmtDate(w.starts_at)}</b></span></li>
          <li><Icon n="pin" /><span><b>{w.venue}</b><br /><span className="muted">{w.address}</span></span></li>
          <li><Icon n="ticket" /><span>{rupees(w.price)} per person, kit included{w.friendPrice ? <><br /><span className="muted">{rupees(w.friendPrice)} each when you bring a friend</span></> : null}</span></li>
        </ul>
        <div className="row"><Btn icon="calendar" disabled>{closed ? 'Booking closed' : 'Reserve'}</Btn><Btn href={business.whatsapp} variant="ghost" icon="chat">WhatsApp</Btn></div>
        {closed ? <p className="fine">This workshop is over. <Link href="/workshops" style={{textDecoration:'underline'}}>See upcoming workshops</Link>.</p> : <p className="fine">Online booking opens soon. Until then, reserve your seat on WhatsApp.</p>}
      </div></div></section>
    <section className="section soft"><div className="wrap"><div className="head"><h2>About this workshop</h2>{w.description.map((t, i) => <p key={i} className="lead">{t}</p>)}</div>
      <div className="cols2"><div><h3>You will learn</h3><ul className="plist">{w.learn.map(x => <li key={x}>{x}</li>)}</ul></div>
        <div><h3>Included</h3><ul className="plist">{w.includes.map(x => <li key={x}>{x}</li>)}</ul>{w.note && <p className="fine">{w.note}</p>}</div></div>
      <div className="head" style={{marginTop:64}}><h3>Good to know</h3><ul className="plist"><li>Please arrive on time.</li><li>Bookings are confirmed on payment.</li><li>Tickets are non-refundable, but can be transferred to someone else with prior notice to the TBB team.</li></ul></div>
    </div></section></main>);
}
