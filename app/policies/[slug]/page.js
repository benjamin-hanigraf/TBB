import { notFound } from 'next/navigation';
import docs from '@/lib/policies.json';
export function generateStaticParams() { return docs.map(d => ({ slug: d.slug })); }
export async function generateMetadata({ params }) { const { slug } = await params; return { title: docs.find(d => d.slug === slug)?.title }; }
export default async function Policy({ params }) {
  const { slug } = await params; const d = docs.find(x => x.slug === slug); if (!d) notFound();
  return (<main><section className="pagehead"><div className="wrap"><p className="eyebrow">Policies</p><h1 style={{fontSize:'clamp(34px,5vw,56px)'}}>{d.title}</h1></div></section>
    <section className="section" style={{paddingTop:24}}><div className="wrap prose">{d.blocks.map((b,i)=> b.h?<h3 key={i}>{b.h}</h3> : b.ul?<ul key={i}>{b.ul.map(x=><li key={x}>{x}</li>)}</ul> : <p key={i}>{b.p}</p>)}</div></section></main>);
}
