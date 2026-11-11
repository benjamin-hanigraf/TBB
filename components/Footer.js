import Link from 'next/link';
import { business as b, images } from '@/lib/data';
import Icon from './Icons';
export default function Footer() {
  return (<>
    <a className="wa" href={b.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"><Icon n="chat" size={24} /></a>
    <footer><div className="wrap">
      <div className="cols">
        <div><img className="flogo" src={images.logo} alt="Thin Black Brush" /><p>{b.tagline}.<br />Workshops, classes and handcrafted art supplies.</p></div>
        <div><h4>Explore</h4><ul><li><Link href="/workshops">Workshops</Link></li><li><Link href="/writing-classes">Classes</Link></li><li><Link href="/store">Store</Link></li><li><Link href="/custom-invitations">Invitations</Link></li><li><Link href="/services">Services</Link></li></ul></div>
        <div><h4>Studio</h4><p>{b.address.join(' ')}</p><p style={{marginTop:8}}><a href={`tel:${b.phone.replace(/\s/g,'')}`}>{b.phone}</a><br /><a href={`mailto:${b.email}`}>{b.email}</a></p></div>
        <div><h4>More</h4><ul><li><a href={b.instagram} target="_blank" rel="noopener noreferrer">Instagram</a></li><li><a href={b.facebook} target="_blank" rel="noopener noreferrer">Facebook</a></li><li><Link href="/policies/terms">Terms of Service</Link></li><li><Link href="/policies/privacy">Privacy Policy</Link></li><li><Link href="/policies/refund">Refund Policy</Link></li></ul></div>
      </div>
      <p className="copy">© {new Date().getFullYear()} Thin Black Brush. All rights reserved.</p>
    </div></footer></>);
}
