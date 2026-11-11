import { business as b } from '@/lib/data';
export const metadata = { title: 'Contact Us' };
export default function Contact() {
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Contact us</p><h1>Say hello.</h1></div></section>
    <section className="section" style={{paddingTop:24}}><div className="wrap split" style={{alignItems:'start'}}>
      <div><h3>Call Rahi</h3><p className="lead" style={{marginTop:6}}><a href={`tel:${b.phone.replace(/\s/g,'')}`}>{b.phone}</a> / <a href="tel:+919566625373">{b.phone2}</a></p>
        <h3 style={{marginTop:32}}>Email</h3><p className="lead" style={{marginTop:6}}><a href={`mailto:${b.email}`}>{b.email}</a></p>
        <h3 style={{marginTop:32}}>Find us at</h3><p className="lead" style={{marginTop:6}}>{b.address.join(' ')}</p>
        <p className="lead">To know more about what we do and how we do it, follow us on <a href={b.instagram} style={{textDecoration:'underline'}}>Instagram @thinblackbrush</a>.</p>
        <div className="row"><a className="btn" href={b.whatsapp}>Chat on WhatsApp</a></div></div>
      <div><h3>Want to teach or work with us?</h3><p className="lead" style={{marginTop:6}}>If you have an undying passion for art and teaching, we've been looking for you. We are hiring!</p>
        <form><label>Name<input /></label><label>Email<input type="email" /></label><label>Phone<input /></label><label>Instagram handle<input /></label><label>Experience<textarea /></label><label>Are you currently employed?<select><option>Yes</option><option>No</option></select></label><button className="btn" disabled>Submit (forms go live soon)</button></form></div>
    </div></section></main>);
}
