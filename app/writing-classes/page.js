import Btn from '@/components/Btn';
import Icon from '@/components/Icons';
import { classes, rupees, business } from '@/lib/data';
import { getImages } from '@/lib/db';
export const metadata = { title: 'Writing Classes' };
export const revalidate = 60;
export default async function Classes() {
  const im = await getImages();
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Writing classes</p><h1>Handwriting and calligraphy</h1>
      <p className="lead">All materials are provided in class.</p></div></section>
    <section className="section"><div className="wrap split">
      <div className="photo"><img src={im.teaching} alt="Teaching a writing class" /></div>
      <div className="info"><ul className="facts big">
        <li><Icon n="user" /><span><b>Children</b><br /><span className="muted">In person, for ages 5 and above. Tuesday and Thursday, 4:30 pm to 5:30 pm. 8 classes, 1 hour each.</span></span></li>
        <li><Icon n="user" /><span><b>Adults</b><br /><span className="muted">Tailor-made courses in Brush Lettering and Modern Dip Pen Calligraphy, offline and online.</span></span></li></ul>
        <div className="row"><Btn href={`tel:${business.phone.replace(/\s/g, '')}`} icon="phone">Call</Btn><Btn href={business.whatsapp} variant="ghost" icon="chat">WhatsApp</Btn></div></div></div></section>
    <section className="section soft"><div className="wrap"><div className="head"><h2>Choose your level</h2><p className="lead">Four courses, from first strokes to modern calligraphy. Each has 8 classes of 1 hour.</p></div>
      <div className="levels">{classes.map(c => (<div key={c.n} className={`level ${c.track === 'Calligraphy' ? 'cal' : ''}`}>
        <span className="tag">{c.track === 'Calligraphy' ? 'Handwriting + Calligraphy' : 'Handwriting'}</span>
        <h3>{c.title}</h3><p className="small lv">{c.level}</p><p className="desc">{c.text}</p>
        <ul className="covers">{c.covers.map(x => <li key={x}><Icon n="check" size={15} /><span>{x}</span></li>)}</ul>
        <p className="foot">{rupees(c.price)}<span> · 8 classes</span></p></div>))}</div></div></section>
  </main>);
}
