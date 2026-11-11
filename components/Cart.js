'use client';
import { gstLine } from '@/lib/gst';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
const Ctx = createContext(null);
const KEY = 'tbb-cart-v1';
export const useCart = () => useContext(Ctx) || { items: [], count: 0, subtotal: 0, gstAdd: 0, itemsTotal: 0, add() {}, setQty() {}, remove() {}, clear() {} };
export function CartProvider({ children }) {
  const [items, setItems] = useState([]); const [ready, setReady] = useState(false);
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(v)) setItems(v.filter((i) => i && i.slug && i.qty > 0).slice(0, 20)); } catch {} setReady(true); }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} }, [items, ready]);
  const add = useCallback((p, qty = 1) => setItems((cur) => { const f = cur.find((i) => i.slug === p.slug); return f ? cur.map((i) => i.slug === p.slug ? { ...i, qty: Math.min(10, i.qty + qty) } : i) : [...cur, { slug: p.slug, title: p.title, price: p.price, image: p.image, gstMode: p.gstMode || 'none', qty }]; }), []);
  const setQty = useCallback((slug, qty) => setItems((cur) => qty <= 0 ? cur.filter((i) => i.slug !== slug) : cur.map((i) => i.slug === slug ? { ...i, qty: Math.min(10, qty) } : i)), []);
  const remove = useCallback((slug) => setItems((cur) => cur.filter((i) => i.slug !== slug)), []);
  const clear = useCallback(() => setItems([]), []);
  const count = items.reduce((s, i) => s + i.qty, 0), lines = items.map((i) => gstLine(i.price, i.qty, i.gstMode)), gstAdd = items.reduce((s, i, n) => s + (i.gstMode === 'add' ? lines[n].gst : 0), 0), subtotal = items.reduce((s, i) => s + i.qty * i.price, 0) + gstAdd, itemsTotal = subtotal - gstAdd;
  return <Ctx.Provider value={{ items, count, subtotal, gstAdd, itemsTotal, add, setQty, remove, clear }}>{children}</Ctx.Provider>;
}
