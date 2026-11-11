import { notFound } from 'next/navigation';
import Link from 'next/link';
import { workshops, rupees, isPast, fmtDate, business } from '@/lib/data';
export function generateStaticParams() { return workshops.map(w => ({ slug: w.slug })); }
export async function generateMetadata({ params }) { const { slug } = await params; const w = workshops.find(x => x.slug === slug); return { title: w?.title }; }
export default async function Workshop({ params }) {
  const { slug } = await params; const w = workshops.find(x => x.slug === slug); if (!w) notFound();
  const past = isPast(w);
  return (<main><section className="section"><div className="wrap split">
    <div className="ph"><img src={w.image} alt={w.title} /></div>
    <div><span className={`tag ${past?'off':''}`}>{past?'Ended':'Open for booking'}</span>
      <h1 style={{fontSize:'clamp(32px,5vw,52px)'}}>{w.title}</h1><p className="lead">{w.summary}</p>
      <div className="dl"><span><b>Date</b> · {fmtDate(w.starts_at)}</span><span><b>Venue</b> · {w.venue}</span><span style={{color:'#6e6e73'}}>{w.address}</span>
        <span><b>Price</b> · {rupees(w.price)} per person, kit included</span>{w.friendPrice && <span><b>Bring a friend</b> · {rupees(w.friendPrice)} per person</span>}</div>
      <div className="row">{past ? <button className="btn" disabled>Booking closed</button> : <button className="btn" disabled>Reserve a seat (payments coming soon)</button>}
        <a className="btn ghost" href={business.whatsapp}>Ask on WhatsApp</a></div>
      {past && <p className="notice">This workshop has ended. <Link href="/workshops" style={{textDecoration:'underline'}}>See upcoming workshops</Link></p>}
    </div></div></section>
    <section className="section soft"><div className="wrap split" style={{alignItems:'start'}}>
      <div><h3>About this workshop</h3>{w.description.map((t,i)=><p key={i} style={{marginTop:12,color:'#333'}}>{t}</p>)}<h3 style={{marginTop:32}}>What you will learn</h3><ul className="list">{w.learn.map(x=><li key={x}>{x}</li>)}</ul></div>
      <div><h3>What is included</h3><ul className="list">{w.includes.map(x=><li key={x}>{x}</li>)}</ul><p style={{marginTop:14,color:'#6e6e73'}}>{w.note}</p>
        <h3 style={{marginTop:32}}>Good to know</h3><ul className="list"><li>All participants are required to be on time.</li><li>Tickets cannot be refunded but can be transferred to someone on prior notice to the TBB team.</li><li>Bookings are confirmed only on payment.</li></ul></div>
    </div></section></main>);
}
