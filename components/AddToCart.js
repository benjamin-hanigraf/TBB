'use client';
import { useState } from 'react';
import Link from 'next/link';
import Icon from './Icons';
import { useCart } from './Cart';
export default function AddToCart({ product, label }) {
  const { add } = useCart(); const [done, setDone] = useState(false);
  const blocked = product.stock <= 0 && !product.preorder;
  return (<>
    <button className="btn" disabled={blocked} onClick={() => { add({ slug: product.slug, title: product.title, price: product.price, image: product.image }); setDone(true); }}>
      <Icon n="paperbag" size={18} /><span>{blocked ? 'Out of stock' : label}</span></button>
    {done && <p className="fine" role="status">Added to your cart. <Link href="/cart" style={{ textDecoration: 'underline' }}>View cart</Link></p>}
  </>);
}
