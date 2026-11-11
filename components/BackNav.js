'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icons';
// One consistent "back" button under the menu on every page except the home page, so no one needs the browser's back button.
const PARENTS = [[/^\/workshops\/.+/, '/workshops', 'Workshops'], [/^\/store\/.+/, '/store', 'Store'], [/^\/cart$/, '/store', 'Store'], [/^\/checkout$/, '/cart', 'Cart']];
export default function BackNav() {
  const p = usePathname(); if (p === '/') return null;
  const hit = PARENTS.find(([re]) => re.test(p)); const [href, label] = hit ? [hit[1], hit[2]] : ['/', 'Home'];
  return (<div className="backrow"><div className="wrap"><Link href={href} className="back"><Icon n="left" size={18} /><span>{label}</span></Link></div></div>);
}
