import ContactForm from '@/components/ContactForm';
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
          <div className="cl"><span>{b.phone}</span><span>{b.phone2}</span></div>
          <Btn href={`tel:${b.phone.replace(/\s/g,'')}`} variant="ghost" icon="phone" className="sm">Call</Btn></div>
        <div className="cc"><span className="cic"><Icon n="mail" size={22} /></span><h2 className="t3">Email</h2>
          <div className="cl"><span>{b.email}</span><span className="muted">We reply within a day</span></div>
          <Btn href={`mailto:${b.email}`} variant="ghost" icon="mail" className="sm">Write</Btn></div>
        <div className="cc"><span className="cic"><Icon n="pin" size={22} /></span><h2 className="t3">Visit the studio</h2>
          <address className="cl">{b.address.map((l) => <span key={l}>{l}</span>)}</address>
          <Btn href={b.map} variant="ghost" icon="arrow" className="sm" target="_blank" rel="noopener noreferrer">Directions</Btn></div></div>
      <div className="row c"><Btn href={b.whatsapp} icon="chat">WhatsApp</Btn><Btn href={b.instagram} variant="ghost" icon="instagram">Instagram</Btn></div></div></section>
    <section className="section soft" id="message-form"><div className="wrap"><ContactForm /></div></section>
  </main>);
}
