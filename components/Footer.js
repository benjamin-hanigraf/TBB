import Link from 'next/link';
import { business as b, images } from '@/lib/data';
export default function Footer() {
  return (<>
    <footer><div className="wrap">
      <div className="cols">
        <div><img className="flogo" src={images.logoLine} alt="Thin Black Brush" width="168" height="38" /><p>{b.tagline}.<br />Art workshops, writing classes and handcrafted art supplies.</p></div>
        <div><p className="fh">Studio</p><p><a href={b.map} target="_blank" rel="noopener noreferrer" className="maplink">{b.address.join(' ')}</a></p><p style={{marginTop:8}}><a href={`tel:${b.phone.replace(/\s/g,'')}`}>{b.phone}</a><br /><a href={`mailto:${b.email}`}>{b.email}</a></p></div>
        <div><p className="fh">Explore</p><ul><li><Link href="/workshops">Workshops</Link></li><li><Link href="/writing-classes">Classes</Link></li><li><Link href="/store">Store</Link></li><li><Link href="/custom-invitations">Invitations</Link></li><li><Link href="/services">Services</Link></li></ul></div>
        <div><p className="fh">More</p><ul><li><a href={b.instagram} target="_blank" rel="noopener noreferrer">Instagram</a></li><li><a href={b.facebook} target="_blank" rel="noopener noreferrer">Facebook</a></li><li><Link href="/policies/terms">Terms of Service</Link></li><li><Link href="/policies/privacy">Privacy Policy</Link></li><li><Link href="/policies/refund">Refund Policy</Link></li></ul></div>
      </div>
      <p className="copy">© {new Date().getFullYear()} Thin Black Brush. All rights reserved.</p>
    </div></footer></>);
}
