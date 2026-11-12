import Btn from '@/components/Btn';
import { collaborators, memories } from '@/lib/data';
import { getImages } from '@/lib/db';
export const revalidate = 60;
export const metadata = { title: 'Collaborations', description: 'Brands, NGOs, colleges and companies we have collaborated with, and how to work with us.' };
export default async function Collabs() {
  const im = await getImages();
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Collaborations</p><h1>Made together.</h1>
      <p className="lead">Over the years we have worked on many projects with many organisations. What we love most about these collaborations is getting to know people, creating art and sharing the joy that it gives.</p></div></section>
    <section className="section"><div className="wrap"><div className="head"><h2 className="sm">Brands and organisations we have worked with</h2></div><div className="logos">{collaborators.map(c => <figure key={c.name} title={c.name}><div className="lg"><img src={c.img} alt={c.name} title={c.name} loading="lazy" /></div></figure>)}</div></div></section>
    <section className="section soft"><div className="wrap"><div className="head"><h2>Memories</h2>
      <p className="lead">A few moments from our collaborations with brands, NGOs, colleges and corporates.</p></div>
      <div className="gal">{memories.map((m, i) => <figure key={m.cap}><img src={im.memorySrc[i] || m.src} alt={m.cap} loading="lazy" /><figcaption>{m.cap}</figcaption></figure>)}</div></div></section>
    <section className="section"><div className="wrap"><div className="head"><p className="eyebrow">Artist, brand, NGO or company?</p><h2>We would love to hear from you.</h2>
      <p className="lead">If you have a project in mind, tell us about it. We are all ears.</p></div>
      <div className="row c"><Btn href="/contact?topic=collaboration#message-form" icon="arrow">Collaborate</Btn></div></div></section>
  </main>);
}
