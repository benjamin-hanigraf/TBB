import Btn from '@/components/Btn';
import { classes, rupees, business, images } from '@/lib/data';
import { getImages } from '@/lib/db';
export const metadata = { title: 'Writing Classes' };
export const revalidate = 60;
export default async function Classes() {
  const im = await getImages();
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Writing classes</p><h1>Handwriting and calligraphy classes.</h1>
      <p className="lead">All materials are provided in class.</p></div></section>
    <section className="section"><div className="wrap">
      <div className="cards" style={{marginTop:0}}>
        <div className="card lvl"><h3>Children</h3><p className="muted" style={{marginTop:10}}>In person, for ages 5 and above.<br />Tuesday and Thursday, 4:30 pm to 5:30 pm.<br />8 classes, 1 hour each.</p></div>
        <div className="card lvl"><h3>Adults</h3><p className="muted" style={{marginTop:10}}>Tailor-made courses in Brush Lettering and Modern Dip Pen Calligraphy.<br />Offline and online.</p></div></div>
      <div className="row c"><Btn href={`tel:${business.phone.replace(/\s/g, '')}`} icon="phone">Call</Btn><Btn href={business.whatsapp} variant="ghost" icon="chat">WhatsApp</Btn></div>
      <div className="wide"><img src={im.teaching} alt="Writing class" loading="lazy" /></div></div></section>
    <section className="section soft"><div className="wrap"><div className="head"><h2>Choose your level</h2></div>
      <div className="cards">{classes.map(c => (<div key={c.n} className="card lvl"><p className="eyebrow" style={{marginBottom:6}}>{c.level}</p><h3>{c.title}</h3>
        {c.includes && <p className="small" style={{marginTop:6}}>Includes {c.includes}</p>}<p style={{marginTop:14,color:'#424245'}}>{c.text}</p>
        <p className="price" style={{marginTop:16}}>{rupees(c.price)} · 8 classes · 1 hour each</p></div>))}</div></div></section>
  </main>);
}
