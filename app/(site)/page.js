import Btn from '@/components/Btn';
import Pic from '@/components/Pic';
import InstagramFeed from '@/components/InstagramFeed';
import { rupees, isPast, fmtDate } from '@/lib/data';
import { getWorkshops, getProducts, getImages } from '@/lib/db';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import { business as biz } from '@/lib/data';
export const revalidate = 60;
export default async function Home() {
  const [workshops, products, images] = await Promise.all([getWorkshops(), getProducts(), getImages()]);
  const upcoming = workshops.filter(w => !isPast(w) && !w.cancelled);
  const shown = (upcoming.length ? upcoming : workshops.filter(isPast).slice(-3)).slice(0, 3);
  return (<main>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: 'Thin Black Brush', description: "The Artists' Commonroom: art and calligraphy workshops, writing classes and handcrafted art supplies.", telephone: biz.phone, email: biz.email, url: 'https://www.thinblackbrush.com', sameAs: [biz.instagram, biz.facebook], hasMap: biz.map, address: { '@type': 'PostalAddress', streetAddress: '2nd Floor - Berachah, 13/7, 1st Cross St, Trustpuram, Kodambakkam', addressLocality: 'Chennai', addressRegion: 'Tamil Nadu', postalCode: '600024', addressCountry: 'IN' } }} />
    <section className="hero"><div className="wrap">
      <p className="eyebrow">The Artists' Commonroom</p>
      <h1>Make something<br />beautiful.</h1>
      <p className="lead">Art workshops, calligraphy and writing classes, and handcrafted art supplies, made with love in Chennai.</p>
      <div className="shot"><Pic src={images.hero} alt="Hands practising modern calligraphy" eager w={1600} h={800} sizes="(max-width: 1100px) 100vw, 1080px" /></div>
    </div></section>

    <section className="section"><div className="wrap">
      <div className="head"><p className="eyebrow">Workshops</p><h2>Pick up a brush or a pen.<br />Leave with a new skill.</h2>
        <p className="lead">Beginner-friendly, in-person art and calligraphy workshops with every material included.</p></div>
      <div className="cards">{shown.map(w => (
        <Link key={w.slug} href={`/workshops/${w.slug}`} className="card"><div className="ph"><Pic src={w.image} alt={w.title} /></div>
          <div className="body"><span className={`tag ${isPast(w) ? 'off' : ''}`}>{isPast(w) ? 'Ended' : 'Book now'}</span><h3>{w.title}</h3><p className="small">{fmtDate(w.starts_at)}</p><p className="small">{w.venue}</p></div></Link>))}</div>
      <div className="row c"><Btn href="/workshops" variant="ghost" icon="arrow">View all</Btn><Btn href="/workshops#gallery" variant="ghost" icon="image">Gallery</Btn></div>
    </div></section>

    <section className="section soft"><div className="wrap">
      <div className="head"><p className="eyebrow">TBB Kadai</p><h2>Made with love.<br />Handle with creativity.</h2>
        <p className="lead">Premium stationery for artists and art lovers, light on your pocket.</p></div>
      <div className="cards">{products.slice(0, 3).map(p => (
        <Link key={p.slug} href={`/store/${p.slug}`} className="card"><div className="ph"><Pic src={p.images[0]} alt={p.title} /></div>
          <div className="body"><h3>{p.title}</h3><p className="price">{rupees(p.price)}</p></div></Link>))}</div>
      <div className="row c"><Btn href="/store" variant="ghost" icon="bag">Shop</Btn></div>
    </div></section>

    <section className="section"><div className="wrap">
      <div className="head"><p className="eyebrow">Writing classes</p><h2>Handwriting and calligraphy classes, for every age.</h2>
        <p className="lead">Alongside our art workshops, we teach writing to children aged 5 to 15, with tailor-made courses for adults. All materials are provided in class.</p></div>
      <div className="wide"><Pic src={images.classes_banner} alt="Students with their finished artwork" w={1600} h={840} sizes="(max-width: 1100px) 100vw, 1080px" /></div>
      <div className="row c"><Btn href="/writing-classes" icon="arrow">More</Btn></div>
    </div></section>

    <section className="section dark"><div className="wrap head">
      <p className="eyebrow">Custom invitations</p><h2>Design with us.</h2>
      <p className="lead">For corporate events, weddings and birthdays. We take care of the design and the printing.</p>
      <div className="row c"><Btn href="/custom-invitations" variant="light" icon="mail">Enquire</Btn></div></div></section>

    <InstagramFeed />
  </main>);
}
