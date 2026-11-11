import Link from 'next/link';
import { rupees } from '@/lib/data';
import { getProducts } from '@/lib/db';
export const revalidate = 60;
export const metadata = { title: 'Store' };
export default async function Store() {
  const products = await getProducts();
  return (<main>
    <section className="pagehead"><div className="wrap"><p className="eyebrow">TBB Kadai</p><h1>Made with love.<br />Handle with creativity.</h1>
      <p className="lead">Each of our products is carefully thought of and specially made for artists and art lovers who enjoy good stationery.</p></div></section>
    <section className="section" style={{paddingTop:24}}><div className="wrap"><div className="grid">
      {products.map(p=>(<Link key={p.slug} href={`/store/${p.slug}`} className="card"><div className="ph"><img src={p.images[0]} alt={p.title} loading="lazy" /></div>
        <div className="body">{p.stock<=0 && <span className="tag off">Out of stock</span>}<h3>{p.title}</h3><p className="price">{rupees(p.price)}</p></div></Link>))}
    </div></div></section></main>);
}
