import Icon from './Icons';
import { business } from '@/lib/data';
import { getImages } from '@/lib/db';
// Live feed: set INSTAGRAM_FEED_URL (a free Behold.so JSON feed URL) in Netlify. Without it, shows studio photos.
async function load() {
  const u = process.env.INSTAGRAM_FEED_URL; if (!u) return null;
  try {
    const r = await fetch(u, { next: { revalidate: 3600 } }); if (!r.ok) return null;
    const j = await r.json(); const posts = Array.isArray(j) ? j : j.posts || [];
    return posts.slice(0, 6).map(p => ({ href: p.permalink, src: p.sizes?.medium?.mediaUrl || p.thumbnailUrl || p.mediaUrl, alt: (p.caption || 'Instagram post').slice(0, 100) })).filter(p => p.src && p.href);
  } catch { return null; }
}
export default async function InstagramFeed() {
  const live = await load(); const images = await getImages();
  const items = live?.length ? live : images.gallery.slice(0, 6).map(src => ({ href: business.instagram, src, alt: 'Thin Black Brush on Instagram' }));
  return (
    <section className="section"><div className="wrap">
      <div className="head"><p className="eyebrow">Instagram</p><h2>@{business.instagramHandle}</h2><p className="lead">Follow along for new workshops, behind-the-scenes moments and student work.</p></div>
      <div className="gal igrid">{items.map((p, i) => (<a key={i} href={p.href} target="_blank" rel="noopener noreferrer" aria-label={p.alt}><img src={p.src} alt={p.alt} loading="lazy" /></a>))}</div>
      <div className="row c"><a className="btn ghost" href={business.instagram} target="_blank" rel="noopener noreferrer"><Icon n="instagram" size={17} /><span>Follow</span></a></div>
    </div></section>);
}
