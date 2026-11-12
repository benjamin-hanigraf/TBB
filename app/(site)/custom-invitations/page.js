import Btn from '@/components/Btn';
import CustomWork from '@/components/CustomWork';
import { getImages } from '@/lib/db';
export const revalidate = 60;
export const metadata = { title: 'Custom Invitations', description: 'Custom-designed and printed invitations for weddings, birthdays and corporate events.' };
export default async function Invites() {
  const im = await getImages();
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">Custom invitations</p><h1>Design with us.</h1>
      <p className="lead">For corporate events, weddings, birthdays and more. We take care of the design and the printing.</p></div></section>
    <section className="section"><div className="wrap"><div className="gal" style={{marginTop:0}}>{im.invites.map((s, i) => <figure key={i}><img src={s} alt="Custom invitation by Thin Black Brush" loading="lazy" /></figure>)}</div></div></section>
    <section className="section soft"><div className="wrap"><div className="head"><h2>Want a custom invite?</h2>
      <p className="lead">Each invitation is designed around your needs. Tell us what you have in mind and we will send you an estimate.</p></div>
      <div className="row c"><Btn href="/contact?topic=invitation#message-form" icon="arrow">Get a quote</Btn></div></div></section>
    <CustomWork />
  </main>);
}
