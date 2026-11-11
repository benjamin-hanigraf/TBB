import { notFound } from 'next/navigation';
import Btn from '@/components/Btn';
import JsonLd from '@/components/JsonLd';
import AddToCart from '@/components/AddToCart';
import Gallery from '@/components/Gallery';
import Icon from '@/components/Icons';
import { rupees, returnPolicy, business } from '@/lib/data';
import { getProducts, getProduct } from '@/lib/db';
export const revalidate = 60;
export async function generateStaticParams() { return (await getProducts()).map(p => ({ slug: p.slug })); }
export async function generateMetadata({ params }) { const { slug } = await params; return { title: (await getProduct(slug))?.title }; }
export default async function Product({ params }) {
  const { slug } = await params; const p = await getProduct(slug); if (!p) notFound();
  const out = p.stock <= 0 && !p.preorder;
  return (<main><JsonLd data={{ '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: p.text, image: p.images, brand: { '@type': 'Brand', name: 'Thin Black Brush' }, offers: { '@type': 'Offer', price: p.price, priceCurrency: 'INR', availability: out ? 'https://schema.org/OutOfStock' : p.preorder ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock' } }} /><section className="section"><div className="wrap split top">
    <Gallery images={p.images} alt={p.title} />
    <div className="info">{p.preorder && <span className="tag">Pre-order</span>}
      <h1 style={{marginTop:p.preorder?14:0}}>{p.title}</h1><p className="price">{rupees(p.price)}</p>
      <p style={{marginTop:20,color:'#424245'}}>{p.text}</p>
      <ul className="facts">{p.details.map(d => <li key={d}><Icon n="check" size={16} /><span>{d}</span></li>)}</ul>
      <div className="row"><AddToCart product={{ slug: p.slug, title: p.title, price: p.price, image: p.images[0], stock: p.stock, preorder: p.preorder }} label={p.preorder ? 'Pre-order' : 'Add to basket'} /><Btn href={business.whatsapp} variant="ghost" icon="chat">WhatsApp</Btn></div>
      {p.shipping && <p className="fine"><b>Shipping.</b> {p.shipping}</p>}<p className="fine"><b>Returns.</b> {returnPolicy}</p></div>
  </div></section></main>);
}
