import Btn from './Btn';
// "Tell us what you need": the custom-work call to action, shown on the home page and at the bottom of the invitations page.
export default function CustomWork({ soft = false }) {
  return (<section className={`section ${soft ? 'soft' : ''}`} id="services"><div className="wrap"><div className="head"><p className="eyebrow">Our services</p><h2>Tell us what you need.<br />We will get it done.</h2>
    <p className="lead">Share what you would like us to customise, and we will call you soon.</p>
    <div className="row c"><Btn href="/contact?topic=service#message-form" icon="arrow">Enquire</Btn></div></div></div></section>);
}
