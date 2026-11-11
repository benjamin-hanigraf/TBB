import Link from 'next/link';
import Pic from '@/components/Pic';
import { isPast, fmtDate } from '@/lib/data';
import { getWorkshops } from '@/lib/db';
export const metadata = { title: 'Workshops', description: 'Beginner-friendly calligraphy and watercolour workshops with every material included. See upcoming dates and book online.' };
export const revalidate = 60;
const Card = ({ w, off }) => (<Link href={`/workshops/${w.slug}`} className="card"><div className="ph"><Pic src={w.image} alt={w.title} eager={!off} /></div>
  <div className="body"><span className={`tag ${off ? 'off' : ''}`}>{w.cancelled ? 'Cancelled' : off ? 'Ended' : 'Open'}</span><h3>{w.title}</h3><p className="small">{fmtDate(w.starts_at)}</p><p className="small">{w.venue}</p></div></Link>);
export default async function Workshops() {
  const all = await getWorkshops();
  const up = all.filter(w => !isPast(w) && !w.cancelled), past = all.filter(w => isPast(w) || w.cancelled).sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at)).slice(0, 3);
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Learn with TBB</p><h1>Workshops</h1><p className="lead">Super excited to explore art with you. Don't miss it!</p></div></section>
    <section className="section"><div className="wrap"><div className="head"><h2>Upcoming</h2></div>
      {up.length ? <div className="cards">{up.map(w => <Card key={w.slug} w={w} />)}</div> : <p className="notice">No workshops are scheduled right now. Follow us on Instagram to hear about the next one first.</p>}</div></section>
    {past.length > 0 && <section className="section soft"><div className="wrap"><div className="head"><h2>Past workshops</h2></div><div className="cards">{past.map(w => <Card key={w.slug} w={w} off />)}</div></div></section>}
  </main>);
}
