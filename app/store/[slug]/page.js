import { notFound } from 'next/navigation';
import { products, rupees, returnPolicy, business } from '@/lib/data';
export function generateStaticParams() { return products.map(p => ({ slug: p.slug })); }
export async function generateMetadata({ params }) { const { slug } = await params; return { title: products.find(x => x.slug === slug)?.title }; }
export default async function Product({ params }) {
  const { slug } = await params; const p = products.find(x => x.slug === slug); if (!p) notFound();
  return (<main><section className="section"><div className="wrap split" style={{alignItems:'start'}}>
    <div><div className="ph"><img src={p.images[0]} alt={p.title} /></div>
      {p.images.length>1 && <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:10}}>{p.images.slice(1,5).map((s,i)=><img key={i} src={s} alt="" style={{borderRadius:12,aspectRatio:1,objectFit:'cover',width:'100%'}} />)}</div>}</div>
    <div><h1 style={{fontSize:'clamp(30px,4.5vw,48px)'}}>{p.title}</h1><p style={{fontSize:28,marginTop:12}}>{rupees(p.price)}</p><p className="lead">{p.text}</p>
      <ul className="list">{p.details.map(d=><li key={d}>{d}</li>)}</ul>
      <div className="row"><button className="btn" disabled>{p.stock>0?'Add to cart (checkout coming soon)':'Out of stock'}</button><a className="btn ghost" href={business.whatsapp}>Ask on WhatsApp</a></div>
      {p.shipping && <p className="notice"><b>Shipping.</b> {p.shipping}</p>}<p className="notice"><b>Return policy.</b> {returnPolicy}</p></div>
  </div></section></main>);
}
