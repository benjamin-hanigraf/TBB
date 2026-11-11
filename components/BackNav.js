'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icons';
// A back button on pages that sit inside another page (a workshop, a product, the basket, checkout). Main pages use the menu.
const PARENTS = [[/^\/workshops\/.+/, '/workshops', 'Workshops'], [/^\/store\/.+/, '/store', 'Store'], [/^\/basket$/, '/store', 'Store'], [/^\/checkout$/, '/basket', 'Basket']];
export default function BackNav() {
  const p = usePathname();
  const hit = PARENTS.find(([re]) => re.test(p)); if (!hit) return null;          // main pages have no back button, the menu has Home
  const [, href, label] = hit;
  return (<nav className="backrow" aria-label="Back"><div className="wrap"><Link href={href} className="back"><Icon n="left" size={18} /><span>{label}</span></Link></div></nav>);
}
