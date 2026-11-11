import Link from 'next/link';
import { business as b, images } from '@/lib/data';
export default function Footer() {
  return (<>
    <footer><div className="wrap">
      <div className="cols">
        <div><img className="flogo" src={images.logoLine} alt="Thin Black Brush" width="168" height="38" /><p>{b.tagline}.<br />Art workshops, writing classes and handcrafted art supplies.</p></div>
        <div><p className="fh">Studio</p><p><a href={b.map} target="_blank" rel="noopener noreferrer" className="maplink">{b.address.join(' ')}</a></p>
          <p className="flinks"><a href={`tel:${b.phone.replace(/\s/g,'')}`}>{b.phone}</a><a href={`mailto:${b.email}`}>{b.email}</a><a href={b.instagram} target="_blank" rel="noopener noreferrer">Instagram</a><a href={b.facebook} target="_blank" rel="noopener noreferrer">Facebook</a></p></div>
      </div>
      <div className="fbase"><p className="copy">© {new Date().getFullYear()} Thin Black Brush. All rights reserved.</p>
        <p className="flinks"><Link href="/policies/terms">Terms</Link><Link href="/policies/privacy">Privacy</Link><Link href="/policies/refund">Refunds</Link></p></div>
    </div></footer></>);
}
