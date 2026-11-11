import Cart from '@/components/CartView';
export const metadata = { title: 'Bag' };
export default function BagPage() {
  return (<main><section className="pagehead"><div className="wrap"><p className="eyebrow">TBB Kadai</p><h1>Your bag</h1></div></section>
    <section className="section"><div className="wrap" style={{ maxWidth: 640 }}><Cart /></div></section></main>);
}
