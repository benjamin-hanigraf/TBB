import Form from '@/components/Form';
import { getImages } from '@/lib/db';
export const revalidate = 60;
export const metadata = { title: 'Custom Invitations' };
export default async function Invites() {
  const im = await getImages();
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Custom invitations</p><h1>Design with us.</h1>
      <p className="lead">For corporate events, weddings, birthdays and more. We take care of the design and the printing.</p></div></section>
    <section className="section"><div className="wrap"><div className="gal" style={{marginTop:0}}>{im.invites.map((s, i) => <figure key={i}><img src={s} alt="Custom invitation by Thin Black Brush" loading="lazy" /></figure>)}</div></div></section>
    <section className="section soft"><div className="wrap"><div className="head"><h2>Want a custom invite?</h2>
      <p className="lead">Each invitation is designed around your needs. Tell us what you have in mind and we will send you an estimate.</p></div>
      <Form kind="invitation" submit="Send" done="Thank you for getting in touch. We will get back to you at the earliest." fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'phone', label: 'Phone', type: 'tel', required: true },
        { name: 'event', label: 'Event type', type: 'select', required: true, options: ['Wedding', 'Corporate event', 'Birthday', 'Other'] },
        { name: 'date', label: 'Event date', type: 'date' },
        { name: 'message', label: 'What do you have in mind?', type: 'textarea', required: true }]} /></div></section>
  </main>);
}
