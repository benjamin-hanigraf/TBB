import Form from '@/components/Form';
import Icon from '@/components/Icons';
import Btn from '@/components/Btn';
import { business as b } from '@/lib/data';
export const metadata = { title: 'Contact Us', description: 'Call, email or visit Thin Black Brush in Kodambakkam, Chennai. We are also hiring teachers.' };
export default function Contact() {
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Contact us</p><h1>Say hello.</h1>
      <p className="lead">Follow us on Instagram to see what we do and how we do it.</p></div></section>
    <section className="section"><div className="wrap">
      <div className="contactgrid" style={{marginTop:0}}>
        <div className="card"><Icon n="phone" size={26} /><h2 className="t3">Call Rahi</h2><a className="muted" href={`tel:${b.phone.replace(/\s/g,'')}`}>{b.phone}</a><a className="muted" href="tel:+919566625373">{b.phone2}</a></div>
        <div className="card"><Icon n="mail" size={26} /><h2 className="t3">Email</h2><a className="muted" href={`mailto:${b.email}`}>{b.email}</a></div>
        <div className="card"><Icon n="pin" size={26} /><h2 className="t3">Find us</h2><p className="muted">{b.address.join(' ')}</p></div></div>
      <div className="row c"><Btn href={b.whatsapp} icon="chat">WhatsApp</Btn><Btn href={b.instagram} variant="ghost" icon="instagram">Instagram</Btn></div></div></section>
    <section className="section soft"><div className="wrap"><div className="head"><p className="eyebrow">We are hiring</p><h2>Want to teach or work with us?</h2>
      <p className="lead">If you have an undying passion for art and teaching, we have been looking for you.</p></div>
      <Form kind="hiring" submit="Apply" done="Thank you for getting in touch. We will be in touch soon." fields={[
        { name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'phone', label: 'Phone', type: 'tel', required: true },
        { name: 'address', label: 'Address' }, { name: 'instagram', label: 'Instagram handle', placeholder: '@yourhandle' },
        { name: 'message', label: 'Experience', type: 'textarea', required: true },
        { name: 'employed', label: 'Are you currently employed?', type: 'select', required: true, options: ['Yes', 'No'] }]} /></div></section>
  </main>);
}
