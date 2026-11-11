import Link from 'next/link';
import { workshops, rupees, isPast, fmtDate } from '@/lib/data';
export const metadata = { title: 'Workshops' };
const Card = ({ w, past }) => (<Link href={`/workshops/${w.slug}`} className="card"><div className="ph"><img src={w.image} alt={w.title} loading="lazy" /></div>
  <div className="body"><span className={`tag ${past?'off':''}`}>{past?'Ended':'Open for booking'}</span><h3>{w.title}</h3><p className="price">{fmtDate(w.starts_at)} · {w.venue}</p><p className="price">{rupees(w.price)} per person</p></div></Link>);
export default function Workshops() {
  const up = workshops.filter(w => !isPast(w)), past = workshops.filter(isPast);
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Learn with TBB</p><h1>Workshops</h1><p className="lead">Super excited to explore art with you. Don't miss it!</p></div></section>
    <section className="section" style={{paddingTop:40}}><div className="wrap">
      <h2>Upcoming</h2>
      {up.length ? <div className="grid">{up.map(w=><Card key={w.slug} w={w} />)}</div> : <div className="notice">No workshops are scheduled right now. Follow us on Instagram to hear first about the next one.</div>}
    </div></section>
    {past.length>0 && <section className="section soft"><div className="wrap"><h2>Past workshops</h2><div className="grid">{past.map(w=><Card key={w.slug} w={w} past />)}</div></div></section>}
  </main>);
}
