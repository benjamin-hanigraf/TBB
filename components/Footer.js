import Link from 'next/link';
import { business as b } from '@/lib/data';
export default function Footer() {
  return (<>
    <a className="wa" href={b.whatsapp} target="_blank" rel="noopener">Chat on WhatsApp</a>
    <footer><div className="wrap">
      <div className="cols">
        <div><h4>Thin Black Brush</h4><p>{b.tagline}.<br />Handcrafted indie art supplies, workshops and classes.</p></div>
        <div><h4>Explore</h4><ul><li><Link href="/workshops">Workshops</Link></li><li><Link href="/writing-classes">Writing classes</Link></li><li><Link href="/store">Store</Link></li><li><Link href="/custom-invitations">Invitations</Link></li></ul></div>
        <div><h4>Studio</h4><p>{b.address.join(' ')}</p><p style={{marginTop:8}}><a href={`tel:${b.phone.replace(/\s/g,'')}`}>{b.phone}</a><br /><a href={`mailto:${b.email}`}>{b.email}</a></p></div>
        <div><h4>Follow</h4><ul><li><a href={b.instagram} target="_blank" rel="noopener">Instagram</a></li><li><a href={b.facebook} target="_blank" rel="noopener">Facebook</a></li><li><Link href="/policies/terms">Terms of Service</Link></li><li><Link href="/policies/privacy">Privacy Policy</Link></li><li><Link href="/policies/refund">Refund Policy</Link></li></ul></div>
      </div>
      <p className="copy">© {new Date().getFullYear()} Thin Black Brush. All rights reserved.</p>
    </div></footer></>);
}
