import Checkout from '@/components/Checkout';
export const metadata = { title: 'Checkout', robots: { index: false } };
export default function CheckoutPage() {
  return (<main><section className="pagehead"><div className="wrap"><p className="eyebrow">TBB Kadai</p><h1>Checkout</h1></div></section>
    <section className="section"><div className="wrap" style={{ maxWidth: 640 }}><Checkout /></div></section></main>);
}
