import Link from 'next/link';
import Icon from './Icons';
import { business as b, images } from '@/lib/data';
export default function Footer() {
  return (<>
    <footer><div className="wrap">
      <div className="cols">
        <div className="fl"><img className="flogo" src={images.logo} alt="Thin Black Brush" width="144" height="54" /><p>{b.tagline}.<br />Art workshops, writing classes and handcrafted art supplies.</p></div>
        <div className="fr"><p className="fh">Thin Black Brush Studio</p><p><a href={b.map} target="_blank" rel="noopener noreferrer" className="maplink">{b.address.map((l) => <span key={l} className="al">{l}</span>)}</a></p>
          <p className="ficons"><a href={`tel:${b.phone.replace(/\s/g,'')}`} aria-label={`Call ${b.phone}`} title={b.phone}><Icon n="phone" size={20} /></a><a href={b.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp"><Icon n="whatsapp" size={20} /></a><a href={`mailto:${b.email}`} aria-label={`Email ${b.email}`} title={b.email}><Icon n="mail" size={20} /></a><a href={b.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram"><Icon n="instagram" size={20} /></a><a href={b.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook"><Icon n="facebook" size={20} /></a></p></div>
      </div>
      <div className="fbase"><p className="copy">© {new Date().getFullYear()} Thin Black Brush. All rights reserved.</p>
        <p className="flinks"><Link href="/policies/terms">Terms</Link><Link href="/policies/privacy">Privacy</Link><Link href="/policies/refund">Refunds</Link></p></div>
    </div></footer></>);
}
