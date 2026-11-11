import Link from 'next/link';
import { images, workshops, products, rupees, isPast, fmtDate } from '@/lib/data';
export default function Home() {
  const upcoming = workshops.filter(w => !isPast(w));
  return (<main>
    <section className="hero"><div className="wrap">
      <p className="eyebrow">The Artists' Commonroom</p>
      <h1>Learn to write<br />beautifully.</h1>
      <p className="lead" style={{margin:'24px auto 0'}}>Calligraphy and art workshops, handwriting classes and handcrafted indie art supplies, made with love in Chennai.</p>
      <div className="row" style={{justifyContent:'center'}}><Link className="btn" href="/workshops">Book a workshop</Link><Link className="btn ghost" href="/store">Visit the store</Link></div>
      <div className="shot"><img src={images.hero} alt="Hands practising modern calligraphy" /></div>
    </div></section>

    <section className="section"><div className="wrap split">
      <div><p className="eyebrow">Workshops</p><h2>Pick up a pen. Leave with a skill.</h2>
        <p className="lead">Beginner friendly, in-person workshops. Every kit is included, so all you bring is curiosity.</p>
        <ul className="list">{(upcoming.length?upcoming:workshops).slice(0,3).map(w=>(<li key={w.slug}><Link href={`/workshops/${w.slug}`}><b>{w.title}</b><br /><span style={{color:'#6e6e73'}}>{fmtDate(w.starts_at)} · {w.venue}</span></Link></li>))}</ul>
        <div className="row"><Link className="btn" href="/workshops">See all workshops</Link></div></div>
      <div className="ph"><img src={workshops[1].image} alt="Calligraphy workshop" /></div>
    </div></section>

    <section className="section soft"><div className="wrap center">
      <p className="eyebrow">TBB Kadai</p><h2>Made with love.<br />Handle with creativity.</h2>
      <p className="lead">Carefully thought-out stationery for artists and art lovers. Premium quality that is light on your pocket.</p>
      <div className="grid">{products.slice(0,3).map(p=>(<Link key={p.slug} href={`/store/${p.slug}`} className="card" style={{textAlign:'left'}}><div className="ph"><img src={p.images[0]} alt={p.title} loading="lazy" /></div><div className="body"><h3>{p.title}</h3><p className="price">{rupees(p.price)}</p></div></Link>))}</div>
      <div className="row"><Link className="btn ghost" href="/store">Shop all</Link></div>
    </div></section>

    <section className="section"><div className="wrap split">
      <div className="ph"><img src={images.teaching} alt="Teaching a writing class" /></div>
      <div><p className="eyebrow">Writing classes</p><h2>Handwriting and calligraphy, for every age.</h2>
        <p className="lead">Children from age 5, and tailor-made courses for adults. All materials are provided in class.</p>
        <div className="row"><Link className="btn" href="/writing-classes">Explore classes</Link></div></div>
    </div></section>

    <section className="section dark"><div className="wrap center"><p className="eyebrow" style={{color:'#999'}}>Custom invitations</p>
      <h2>Design with us.</h2><p className="lead" style={{color:'#bbb'}}>Corporate events, weddings, birthdays, you name it. We take care of designing and printing.</p>
      <div className="row"><Link className="btn light" href="/custom-invitations">Enquire</Link></div></div></section>

    <section className="section"><div className="wrap center"><p className="eyebrow">Moments</p><h2>From our studio.</h2>
      <div className="gal">{images.gallery.map((s,i)=><img key={i} src={s} alt="Thin Black Brush workshop moment" loading="lazy" />)}</div></div></section>
  </main>);
}
