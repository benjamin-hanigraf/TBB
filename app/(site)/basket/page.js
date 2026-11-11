import Cart from '@/components/CartView';
export const metadata = { title: 'Basket' };
export default function BasketPage() {
  return (<main><section className="pagehead"><div className="wrap"><p className="eyebrow">TBB Kadai</p><h1>Your basket</h1></div></section>
    <section className="section"><div className="wrap" style={{ maxWidth: 640 }}><Cart /></div></section></main>);
}
