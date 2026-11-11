import Form from '@/components/Form';
import { Star } from '@/components/Doodle';
import { collaborators, memories } from '@/lib/data';
export const metadata = { title: 'Collaborations' };
export default function Collabs() {
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">We have worked with</p><h1>Collaborations</h1>
      <p className="lead">Over the years we have worked on many projects with many organisations. What we love most about these collaborations is getting to know people, creating art and sharing the joy that it gives.</p></div></section>
    <section className="section"><div className="wrap"><div className="logos" style={{marginTop:0}}>{collaborators.map(c => <figure key={c.name}><div className="lg"><img src={c.img} alt={c.name} loading="lazy" /></div><figcaption>{c.name}</figcaption></figure>)}</div></div></section>
    <section className="section soft"><div className="wrap"><div className="head"><Star /><h2 style={{marginTop:14}}>Memories</h2>
      <p className="lead">A few moments from our collaborations with brands, NGOs, colleges and corporates.</p></div>
      <div className="gal">{memories.map(m => <figure key={m.cap}><img src={m.src} alt={m.cap} loading="lazy" /><figcaption>{m.cap}</figcaption></figure>)}</div></div></section>
    <section className="section"><div className="wrap"><div className="head"><p className="eyebrow">Artist, brand, NGO or company?</p><h2>We would love to hear from you.</h2>
      <p className="lead">If you have a project in mind, tell us about it. We are all ears.</p></div>
      <Form kind="collaboration" submit="Send" done="Thank you for reaching out. We will be in touch soon." fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'organisation', label: 'Organisation' },
        { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'message', label: 'Your idea', type: 'textarea', required: true }]} /></div></section>
  </main>);
}
