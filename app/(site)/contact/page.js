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
        <div className="cc"><span className="cic"><Icon n="phone" size={22} /></span><h2 className="t3">Call Rahi</h2>
          <div className="cl"><a href={`tel:${b.phone.replace(/\s/g,'')}`}>{b.phone}</a><a href="tel:+919566625373">{b.phone2}</a></div>
          <Btn href={`tel:${b.phone.replace(/\s/g,'')}`} variant="ghost" icon="phone" className="sm">Call</Btn></div>
        <div className="cc"><span className="cic"><Icon n="mail" size={22} /></span><h2 className="t3">Email</h2>
          <div className="cl"><a href={`mailto:${b.email}`}>{b.email}</a><span className="muted">We reply within a day</span></div>
          <Btn href={`mailto:${b.email}`} variant="ghost" icon="mail" className="sm">Write to us</Btn></div>
        <div className="cc"><span className="cic"><Icon n="pin" size={22} /></span><h2 className="t3">Visit the studio</h2>
          <address className="cl"><a href={b.map} target="_blank" rel="noopener noreferrer" style={{ display: 'grid', gap: 3 }}>{b.address.map((l) => <span key={l}>{l}</span>)}</a></address>
          <Btn href={b.map} variant="ghost" icon="arrow" className="sm" target="_blank" rel="noopener noreferrer">Directions</Btn></div></div>
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
