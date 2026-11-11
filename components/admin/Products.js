'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Modal, Btn, F, PhotoField, useForm, useAction, Confirm, slugify } from './kit';
import ImportCsv from './ImportCsv';
import { money, rupeesToPaise } from '@/lib/accounting';
import { photo } from '@/lib/photo';
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);

export default function Products() {
  const sp = useSearchParams(); const [edit, setEdit] = useState(null); const [q, setQ] = useState(''); const [imp, setImp] = useState(false);
  const { data, error, reload } = useLoad(async () => must(await sb().from('products').select('*').order('sort_order').order('created_at', { ascending: false })));
  useEffect(() => { if (sp.get('new')) setEdit({}); }, [sp]);
  if (error) return <Page title="Store"><Err e={error} /></Page>; if (!data) return <Page title="Store"><Spin /></Page>;
  const rows = data.filter((p) => !q || p.title.toLowerCase().includes(q.toLowerCase()));
  return (<Page title="Store" action={<><Btn variant="ghost" icon="filein" onClick={() => setImp(true)}>Import</Btn><Btn icon="plus" onClick={() => setEdit({})}>Add product</Btn></>}>
    <input className="ad-search" type="search" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
    <Card tight>{rows.length ? <div className="ad-list">{rows.map((p) => (
      <button key={p.id} className="ad-row" onClick={() => setEdit(p)}>{p.images?.[0] ? <img className="ad-thumb" src={photo(p.images[0])} alt="" /> : <div className="ad-thumb" />}
        <div className="main"><b>{p.title}</b><small>{money(p.price_paise)}{p.allow_preorder ? ' · pre-order' : ` · ${p.stock} in stock`}</small></div>
        <div className="end">{!p.active ? <Badge>Hidden</Badge> : p.stock === 0 && !p.allow_preorder ? <Badge tone="bad">Out of stock</Badge> : p.stock <= 2 && !p.allow_preorder ? <Badge tone="warn">Low</Badge> : <Badge tone="ok">On sale</Badge>}</div></button>))}</div> : <Empty>No products yet. Tap "Add product".</Empty>}</Card>
    {imp && <ImportCsv kind="products" onClose={() => setImp(false)} onDone={reload} />}
    {edit && <ProductForm p={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
  </Page>);
}

function ProductForm({ p, onClose, onSaved }) {
  const isNew = !p.id; const [run, busy] = useAction();
  const f = useForm({ title: p.title || '', description: p.description || '', details: (p.details || []).join('\n'), price: p.price_paise != null ? String(p.price_paise / 100) : '', stock: String(p.stock ?? 0), allow_preorder: !!p.allow_preorder,
    shipping_note: p.shipping_note || '', return_note: p.return_note || '', active: p.active ?? true, images: p.images || [] });
  const save = (e, asCopy) => { e?.preventDefault(); return run(async () => {
    const v = f.v; if (!v.title.trim()) throw new Error('Please add a title.'); if (!v.price) throw new Error('Please add a price.');
    const row = { title: v.title, description: v.description || null, details: lines(v.details), price_paise: rupeesToPaise(v.price), stock: Math.max(0, parseInt(v.stock || '0', 10)), allow_preorder: v.allow_preorder, shipping_note: v.shipping_note || null, return_note: v.return_note || null, active: v.active, images: v.images };
    if (isNew || asCopy) { const base = slugify(v.title) + (asCopy ? '-copy' : ''); let r = await sb().from('products').insert({ ...row, slug: base }); if (r.error?.code === '23505') r = await sb().from('products').insert({ ...row, slug: `${base}-${Math.random().toString(36).slice(2, 6)}` }); must(r); }
    else must(await sb().from('products').update(row).eq('id', p.id));
    onSaved();
  }, 'Product saved'); };
  const remove = () => run(async () => { must(await sb().from('products').delete().eq('id', p.id)); onSaved(); }, 'Product deleted');
  return (<Modal title={isNew ? 'Add product' : 'Edit product'} onClose={onClose} wide>
    <form onSubmit={save} className="ad-form">
      <div className="full"><F form={f} k="title" label="Name" rule="title" required /></div>
      <F form={f} k="price" label="Price (₹)" type="money" rule="money" required /><F form={f} k="stock" label="In stock" rule="digits" required inputMode="numeric" />
      <F form={f} k="allow_preorder" label="Allow pre-orders when out of stock" type="check" /><F form={f} k="active" label="Show in the store" type="check" />
      <div className="full"><F form={f} k="description" label="Description" type="textarea" rule="sentence" /></div>
      <div className="full"><F form={f} k="details" label="Details" type="textarea" rule="sentence" hint="One point per line, such as size or paper" /></div>
      <F form={f} k="shipping_note" label="Shipping note" rule="sentence" /><F form={f} k="return_note" label="Return note" rule="sentence" />
      <PhotoField label="Photos" paths={f.v.images} onChange={(a) => f.set('images', a)} folder="products" max={8} />
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Btn type="button" variant="ghost" busy={busy} onClick={(e) => save(e, true)}>Copy</Btn>}{!isNew && <Confirm onYes={remove}>Delete</Confirm>}</div>
    </form></Modal>);
}
