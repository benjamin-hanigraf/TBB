import Link from 'next/link';
import Pic from '@/components/Pic';
import Btn from '@/components/Btn';
import { rupees } from '@/lib/data';
import { getProducts } from '@/lib/db';
export const metadata = { title: 'Store', description: 'Handcrafted calligraphy supplies and stationery: oblique holders, guideline books and planners from TBB Kadai.' };
export const revalidate = 60;
export default async function Store() {
  const products = await getProducts();
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">TBB Kadai</p><h1>Made with love.<br />Handle with creativity.</h1>
      <p className="lead">Each product is thoughtfully made for artists and art lovers who enjoy good stationery.</p></div></section>
    <section className="section"><div className="wrap"><div className="cards" style={{marginTop:0}}>
      {products.map((p, i) => (<Link key={p.slug} href={`/store/${p.slug}`} className="card"><div className="ph"><Pic src={p.images[0]} alt={p.title} eager={i < 3} priority={i === 0} /></div>
        <div className="body">{p.preorder ? <span className="tag">Pre-order</span> : p.stock <= 0 ? <span className="tag off">Out of stock</span> : null}<h2 className="t3">{p.title}</h2><p className="price">{rupees(p.price)}</p></div></Link>))}
    </div>
      <div className="row c"><Btn href="/bag" variant="ghost" icon="bag">View Your Bag</Btn></div></div></section></main>);
}
