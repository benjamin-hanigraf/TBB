import { img } from '@/lib/data';
export const metadata = { title: 'Custom Invitations' };
export default function Invites() {
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Custom invitations</p><h1>Design with us.</h1>
      <p className="lead">Corporate events, weddings, birthdays, you name it! We take care of designing and printing.</p></div></section>
    <section className="section" style={{paddingTop:24}}><div className="wrap"><div className="gal">{['55fd8e1e6e','ac911ad304','3c20fb04cd'].map((s,i)=><img key={i} src={img(s)} alt="Custom invitation" loading="lazy" />)}</div></div></section>
    <section className="section soft"><div className="wrap"><h2>Want to get your invite customised?</h2>
      <p className="lead">Each invite is curated based on your requirements. To get an estimate, let us know what you are looking for and we will get back to you.</p>
      <form><label>Name<input name="name" /></label><label>Email<input type="email" name="email" /></label><label>Phone<input name="phone" /></label><label>What do you have in mind?<textarea name="message" /></label><button className="btn" disabled>Send (forms go live soon)</button></form></div></section>
  </main>);
}
