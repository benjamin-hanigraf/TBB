import { classes, rupees, business, images } from '@/lib/data';
export const metadata = { title: 'Writing Classes' };
export default function Classes() {
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Writing classes</p><h1>Handwriting and<br />calligraphy classes.</h1>
      <p className="lead">All the materials will be provided in class.</p></div></section>
    <section className="section" style={{paddingTop:40}}><div className="wrap split" style={{alignItems:'start'}}>
      <div><h3>Children</h3><p className="lead" style={{marginTop:8}}>In person · Age 5 and above · Twice a week, Tuesday and Thursday · 1 hour each · 8 classes · 4:30 pm to 5:30 pm</p>
        <h3 style={{marginTop:36}}>Adults</h3><p className="lead" style={{marginTop:8}}>Tailor-made courses covering Brush Lettering and Modern Dip Pen Calligraphy. Offline and online.</p>
        <div className="row"><a className="btn" href={`tel:${business.phone.replace(/\s/g,'')}`}>Call {business.phone}</a><a className="btn ghost" href={business.whatsapp}>WhatsApp</a></div></div>
      <div className="ph"><img src={images.teaching} alt="Writing class" /></div></div></section>
    <section className="section soft"><div className="wrap"><h2>Choose your level</h2>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))'}}>{classes.map(c=>(<div key={c.n} className="card"><div className="body" style={{padding:28}}>
        <p className="eyebrow">Level {c.n}</p><h3>{c.title}</h3>{c.tag && <p className="price">{c.tag}</p>}<p style={{marginTop:14,color:'#333'}}>{c.text}</p>
        <p style={{marginTop:20,fontSize:28,fontWeight:600}}>{rupees(c.price)}</p><p className="price">8 classes · 1 hour each</p></div></div>))}</div></div></section>
  </main>);
}
