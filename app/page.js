import Btn from '@/components/Btn';
import InstagramFeed from '@/components/InstagramFeed';
import { Squiggle, Star, Note } from '@/components/Doodle';
import { rupees, isPast, fmtDate } from '@/lib/data';
import { getWorkshops, getProducts, getImages } from '@/lib/db';
import Link from 'next/link';
export const revalidate = 60;
export default async function Home() {
  const [workshops, products, images] = await Promise.all([getWorkshops(), getProducts(), getImages()]);
  const upcoming = workshops.filter(w => !isPast(w) && !w.cancelled);
  const shown = (upcoming.length ? upcoming : workshops.filter(isPast).slice(-3)).slice(0, 3);
  return (<main>
    <section className="hero"><div className="wrap">
      <p className="eyebrow">The Artists' Commonroom</p>
      <h1>Learn to write<br />beautifully.</h1><Squiggle w={200} />
      <p className="lead">Calligraphy and art workshops, handwriting classes and handcrafted art supplies, made with love in Chennai.</p>
      <div className="row"><Btn href="/workshops" icon="arrow">Book now</Btn><Btn href="/store" variant="ghost" icon="bag">Shop</Btn></div>
      <div className="shot"><img src={images.hero} alt="Hands practising modern calligraphy" /></div>
    </div></section>

    <section className="section"><div className="wrap">
      <div className="head"><p className="eyebrow">Workshops</p><h2>Pick up a pen.<br />Leave with a skill.</h2>
        <p className="lead">Beginner-friendly, in-person workshops with every material included.</p></div>
      <div className="cards">{shown.map(w => (
        <Link key={w.slug} href={`/workshops/${w.slug}`} className="card"><div className="ph"><img src={w.image} alt={w.title} loading="lazy" /></div>
          <div className="body"><span className={`tag ${isPast(w) ? 'off' : ''}`}>{isPast(w) ? 'Ended' : 'Open'}</span><h3>{w.title}</h3><p className="small">{fmtDate(w.starts_at)}</p><p className="small">{w.venue}</p></div></Link>))}</div>
      <div className="row c"><Btn href="/workshops" variant="ghost" icon="arrow">View all</Btn></div>
    </div></section>

    <section className="section soft"><div className="wrap">
      <div className="head"><p className="eyebrow">TBB Kadai</p><h2>Made with love.<br />Handle with creativity.</h2>
        <p className="lead">Premium stationery for artists and art lovers, light on your pocket.</p></div>
      <div className="cards">{products.slice(0, 3).map(p => (
        <Link key={p.slug} href={`/store/${p.slug}`} className="card"><div className="ph"><img src={p.images[0]} alt={p.title} loading="lazy" /></div>
          <div className="body"><h3>{p.title}</h3><p className="price">{rupees(p.price)}</p></div></Link>))}</div>
      <div className="row c"><Btn href="/store" variant="ghost" icon="bag">Shop all</Btn></div>
    </div></section>

    <section className="section"><div className="wrap">
      <div className="head"><p className="eyebrow">Writing classes</p><h2>Handwriting and calligraphy, for every age.</h2>
        <p className="lead">Children from age 5, and tailor-made courses for adults. All materials are provided in class.</p></div>
      <div className="wide"><img src={images.teaching} alt="Teaching a writing class" loading="lazy" /></div>
      <div className="row c"><Btn href="/writing-classes" icon="arrow">Learn more</Btn></div>
    </div></section>

    <section className="section dark"><div className="wrap head">
      <Star /><p className="eyebrow" style={{marginTop:14}}>Custom invitations</p><h2>Design with us.</h2>
      <p className="lead">For corporate events, weddings and birthdays. We take care of the design and the printing.</p>
      <div className="row c"><Btn href="/custom-invitations" variant="light" icon="mail">Enquire</Btn></div></div></section>

    <InstagramFeed />
  </main>);
}
