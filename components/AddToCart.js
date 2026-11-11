'use client';
import Link from 'next/link';
import Icon from './Icons';
import { useCart } from './Cart';
// One control that is a button until the item is in the bag, then a − 1 + pill of the same size.
export default function AddToCart({ product, label }) {
  const { items, add, setQty } = useCart();
  const qty = items.find((i) => i.slug === product.slug)?.qty || 0;
  const blocked = product.stock <= 0 && !product.preorder;
  const max = product.preorder ? 10 : Math.min(10, product.stock);
  if (qty > 0) return (<div className="addwrap">
    <div className="qty big" role="group" aria-label={`${product.title} in your bag`}>
      <button type="button" aria-label="One less" onClick={() => setQty(product.slug, qty - 1)}>−</button>
      <span aria-live="polite">{qty}</span>
      <button type="button" aria-label="One more" disabled={qty >= max} onClick={() => add({ slug: product.slug, title: product.title, price: product.price, image: product.image, gstMode: product.gstMode })}>+</button>
    </div>
    <Link href="/bag" className="small viewbag">View bag</Link></div>);
  return (<button className="btn fixw" disabled={blocked} onClick={() => add({ slug: product.slug, title: product.title, price: product.price, image: product.image, gstMode: product.gstMode })}>
    <Icon n="bag" size={18} /><span>{blocked ? 'Sold out' : label}</span></button>);
}
