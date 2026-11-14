import { notFound } from 'next/navigation';
import Link from 'next/link';
import Btn from '@/components/Btn';
import Pic from '@/components/Pic';
import Gallery from '@/components/Gallery';
import JsonLd from '@/components/JsonLd';
import BookWorkshop from '@/components/BookWorkshop';
import Icon from '@/components/Icons';
import { rupees, isPast, fmtDate } from '@/lib/data';
import { getBusiness } from '@/lib/db';
import { getWorkshops, getWorkshop } from '@/lib/db';
export const revalidate = 60;
export async function generateStaticParams() { return (await getWorkshops()).map(w => ({ slug: w.slug })); }
export async function generateMetadata({ params }) { const { slug } = await params; return { title: (await getWorkshop(slug))?.title }; }
export default async function Workshop({ params }) {
  const { slug } = await params; const w = await getWorkshop(slug); if (!w) notFound(); const business = await getBusiness();
  const closed = isPast(w) || w.cancelled;
  const label = w.cancelled ? 'Cancelled' : isPast(w) ? 'Ended' : w.seatsLeft === 0 ? 'Sold out' : 'Book now';
  return (<main>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Event', name: w.title, description: w.summary, startDate: w.starts_at, eventStatus: w.cancelled ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', location: { '@type': 'Place', name: w.venue, address: w.address }, offers: { '@type': 'Offer', price: w.price, priceCurrency: 'INR', availability: closed ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock' }, organizer: { '@type': 'Organization', name: 'Thin Black Brush' } }} />
    <section className="section"><div className="wrap split">
      {w.images?.length > 1 ? <Gallery images={w.images} alt={w.title} /> : <div className="gallery"><div className="main"><Pic src={w.image} alt={w.title} eager sizes="(max-width: 860px) 92vw, 520px" /></div></div>}
      <div className="info">{closed || w.seatsLeft === 0 ? <span className="tag off">{label}</span> : null}
        <h1 style={{marginTop:closed || w.seatsLeft === 0 ? 14 : 0}}>{w.title}</h1><p className="lead" style={{marginLeft:0}}>{w.summary}</p>
        <ul className="facts">
          <li><Icon n="calendar" /><span><b>{fmtDate(w.starts_at)}{w.kind === 'course' && w.ends_at && fmtDate(w.ends_at) !== fmtDate(w.starts_at) ? ` to ${fmtDate(w.ends_at)}` : ''}</b></span></li>
          <li><Icon n="pin" /><span><b>{w.venue}</b><br /><span className="muted">{w.address}</span></span></li>
          <li><Icon n="note" /><span className="pricebox">
            <span className="pr-main"><b>{rupees(w.price)}</b>{w.regularPrice ? <s>{rupees(w.regularPrice)}</s> : null}<span>{w.gstMode === 'add' ? '+ 18% GST ' : w.gstMode === 'included' ? 'incl. GST ' : ''}per person, kit included</span></span>
            {w.regularPrice ? <span className="pr-line"><span className="tag">Early bird</span><span>Save {rupees(w.regularPrice - w.price)} when you book by {fmtDate(w.earlyUntil)}</span></span> : null}
            {w.friendPrice ? <span className="pr-line muted">{rupees(w.friendPrice)} each when you bring a friend</span> : null}</span></li>
        </ul>
        {closed ? <div className="row"><Btn icon="calendar" disabled>{w.cancelled ? 'Cancelled' : 'Booking closed'}</Btn><Btn href={business.whatsapp} variant="ghost" icon="chat">WhatsApp</Btn></div>
          : w.seatsLeft === 0 ? <div className="row"><Btn icon="calendar" disabled>Sold out</Btn><Btn href={business.whatsapp} variant="ghost" icon="chat">WhatsApp</Btn></div>
          : <><div className="row"><BookWorkshop slug={w.slug} title={w.title} price={w.price} friendPrice={w.friendPrice} gstMode={w.gstMode} seatsLeft={w.seatsLeft} whatsapp={business.whatsapp} /></div></>}
        {closed && <p className="fine">This workshop is over. <Link href="/workshops" style={{textDecoration:'underline'}}>See upcoming workshops</Link>.</p>}
      </div></div></section>
    <section className="section soft"><div className="wrap"><div className="head"><h2>About this workshop</h2>{w.description.map((t, i) => <p key={i} className="lead">{t}</p>)}</div>
      <div className="cols3"><div><h3>You will learn</h3><ul className="plist">{w.learn.map(x => <li key={x}>{x}</li>)}</ul></div>
        <div><h3>Included</h3><ul className="plist">{w.includes.map(x => <li key={x}>{x}</li>)}</ul></div>
        <div><h3>Good to know</h3><ul className="plist">{(w.goodToKnow?.length ? w.goodToKnow : ['Please arrive on time.', 'Bookings are confirmed on payment.', 'Tickets are non-refundable, but can be transferred to someone else with prior notice to the TBB team.']).map((x) => <li key={x}>{x}</li>)}</ul></div></div>
      {w.note && <p className="note-c">{w.note}</p>}
    </div></section></main>);
}
