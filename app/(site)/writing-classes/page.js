import Btn from '@/components/Btn';
import Pic from '@/components/Pic';
import Icon from '@/components/Icons';
import { business } from '@/lib/data';
import { getImages, getClasses } from '@/lib/db';
import LevelPicker from '@/components/LevelPicker';
export const metadata = { title: 'Writing Classes', description: 'Handwriting and calligraphy classes for children from age 5, plus tailor-made courses for adults, in Chennai.' };
export const revalidate = 60;
export default async function Classes() {
  const [im, levels] = await Promise.all([getImages(), getClasses()]);
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Writing classes</p><h1>Handwriting and calligraphy</h1>
      <p className="lead">All materials are provided in class.</p></div></section>
    <section className="section"><div className="wrap split">
      <div className="photo"><Pic src={im.teaching} alt="Teaching a writing class" eager sizes="(max-width: 860px) 92vw, 520px" /></div>
      <div className="info"><ul className="facts big">
        <li><Icon n="user" size={22} /><span><b>Children</b><br /><span className="muted">In person, for ages 5 and above. Tuesday and Thursday, 4:30 pm to 5:30 pm. 8 classes, 1 hour each.</span></span></li>
        <li><Icon n="user" size={22} /><span><b>Adults</b><br /><span className="muted">Tailor-made courses in Brush Lettering and Modern Dip Pen Calligraphy, offline and online.</span></span></li></ul>
        <div className="row"><Btn href={`tel:${business.phone.replace(/\s/g, '')}`} icon="phone">Call</Btn><Btn href={business.whatsapp} variant="ghost" icon="chat">WhatsApp</Btn></div></div></div></section>
    <section className="section soft"><div className="wrap"><div className="head"><h2>Choose your level</h2><p className="lead">Four courses, from first strokes to modern calligraphy. Pick a level to enrol online.</p></div>
      <LevelPicker classes={levels} phone={business.phone} whatsapp={business.whatsapp} /></div></section>
  </main>);
}
