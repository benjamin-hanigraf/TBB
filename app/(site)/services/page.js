import Btn from '@/components/Btn';
export const metadata = { title: 'Our Services', description: 'Tell us what you would like customised and we will get it done.' };
const OPTIONS = ['Invitations', 'Stationery', 'Calligraphy artwork', 'Gifts', 'Something else'];
export default function Services() {
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Our services</p><h1>Tell us what you need.<br />We will get it done.</h1>
      <p className="lead">Share what you would like us to customise, and we will call you soon.</p></div></section>
    <section className="section"><div className="wrap center">
      <div className="row c" style={{ marginTop: 0 }}>{OPTIONS.map((o) => <Btn key={o} href={`/contact?topic=service&for=${encodeURIComponent(o)}#message-form`} variant="ghost">{o}</Btn>)}</div>
      <div className="row c"><Btn href="/contact?topic=service#message-form" icon="arrow">Enquire</Btn></div></div></section>
  </main>);
}
