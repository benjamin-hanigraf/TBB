'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Btn from './Btn';
import { useCart } from './Cart';
import { rupees } from '@/lib/data';
import { supabase } from '@/lib/supabase-browser';
export function useShipping() {
  const [s, setS] = useState(null);   // null = still loading
  useEffect(() => { const sb = supabase(); if (!sb) { setS({ flat_paise: 0, free_above_paise: 0 }); return; } sb.from('settings').select('value').eq('key', 'shipping').single().then(({ data }) => setS(data?.value || { flat_paise: 0, free_above_paise: 0 }), () => setS({ flat_paise: 0, free_above_paise: 0 })); }, []);
  return (subtotal) => (s === null ? null : s.free_above_paise && subtotal * 100 >= s.free_above_paise ? 0 : (s.flat_paise || 0) / 100);
}
export default function CartView() {
  const { items, subtotal, setQty, remove } = useCart(); const ship = useShipping()(subtotal);
  if (!items.length) return (<div className="center"><p className="lead" style={{ marginTop: 0 }}>Your cart is empty.</p><div className="row c"><Btn href="/store" icon="bag">Shop</Btn></div></div>);
  return (<>
    <div className="acct-list">{items.map((i) => (
      <div key={i.slug} className="acct-row"><div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>{i.image && <img src={i.image} alt="" width="56" height="56" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 12 }} />}
        <div><Link href={`/store/${i.slug}`}><b>{i.title}</b></Link><p className="small">{rupees(i.price)} each</p></div></div>
        <div className="end"><div className="qty"><button aria-label="One less" onClick={() => setQty(i.slug, i.qty - 1)}>−</button><span>{i.qty}</span><button aria-label="One more" onClick={() => setQty(i.slug, i.qty + 1)}>+</button></div>
          <p><button className="link" onClick={() => remove(i.slug)}>Remove</button></p></div></div>))}</div>
    <div className="sum"><div><span>Subtotal</span><span>{rupees(subtotal)}</span></div><div><span>Shipping</span><span>{ship === null ? '…' : ship ? rupees(ship) : 'Free'}</span></div><div className="tot"><span>Total</span><span>{rupees(subtotal + (ship || 0))}</span></div></div>
    <div className="row c"><Btn href="/checkout" icon="arrow">Checkout</Btn></div></>);
}
