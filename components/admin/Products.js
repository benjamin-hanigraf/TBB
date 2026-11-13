'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Icon from '@/components/Icons';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Modal, ViewModal, Btn, F, PhotoField, useForm, useAction, useToast, Confirm, Sortable, slugify } from './kit';
import { GST_MODES } from '@/lib/gst';
import { money, rupeesToPaise } from '@/lib/accounting';
import { photo } from '@/lib/photo';
import { returnPolicy } from '@/lib/data';
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);

export default function Products() {
  const sp = useSearchParams(); const toast = useToast(); const [edit, setEdit] = useState(null); const [view, setView] = useState(null); const [q, setQ] = useState('');
  const { data: all, error, reload } = useLoad(async () => { const [p, st] = await Promise.all([sb().from('products').select('*').order('sort_order').order('created_at', { ascending: false }), sb().from('settings').select('value').eq('key', 'store').maybeSingle()]); return { rows: must(p), store: st.data?.value || {} }; });
  const data = all?.rows;
  useEffect(() => { if (sp.get('new')) setEdit({}); }, [sp]);
  useEffect(() => { const id = sp.get('open'); const p = id && data?.find((x) => x.id === id); if (p) setView(p); }, [sp, data]);   // a link from Home opens that product
  if (error) return <Page title="Store"><Err e={error} /></Page>; if (!data) return <Page title="Store"><Spin /></Page>;
  const rows = data.filter((p) => !q || p.title.toLowerCase().includes(q.toLowerCase()));
  const reorder = async (arr) => { try { for (let i = 0; i < arr.length; i++) if (arr[i].sort_order !== i + 1) must(await sb().from('products').update({ sort_order: i + 1 }).eq('id', arr[i].id)); toast('Order saved'); reload(); } catch (e) { toast(e.message || 'Could not save the order.', 'err'); } };
  const item = (p, grip) => (<div className="ad-row prod-row">{grip && <span {...grip}><Icon n="grip" size={18} /></span>}
    <button type="button" className="prod-main" onClick={() => setView(p)}>{p.images?.[0] ? <img className="ad-thumb" src={photo(p.images[0])} alt="" /> : <div className="ad-thumb" />}
      <span className="main"><b>{p.title}</b><small>{money(p.price_paise)}{p.gst_mode === 'add' ? ' + GST' : p.gst_mode === 'included' ? ' incl. GST' : ''}{p.allow_preorder ? ' · pre-order' : ` · ${p.stock} in stock`}</small></span></button>
    <div className="end">{!p.active ? <Badge>Hidden</Badge> : p.stock === 0 && !p.allow_preorder ? <Badge tone="bad">Out of stock</Badge> : p.stock <= 2 && !p.allow_preorder ? <Badge tone="warn">Low</Badge> : <Badge tone="ok">On sale</Badge>}</div></div>);
  return (<Page title="Store" action={<><Btn icon="plus" onClick={() => setEdit({})}>Add product</Btn></>}>
    <input className="ad-search" type="search" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
    <Card tight>{rows.length ? (q ? <div className="ad-list">{rows.map((p) => <div key={p.id}>{item(p, null)}</div>)}</div> : <Sortable className="ad-list" items={data} onReorder={reorder} render={(p, grip) => item(p, grip)} />) : <Empty>No products yet. Tap "Add product".</Empty>}</Card>
    {!q && data.length > 1 && <p className="ad-help" style={{ textAlign: 'center' }}>Drag the handle to change the order in the store.</p>}
    {view && <ViewModal title={view.title} wide onClose={() => setView(null)} onEdit={() => { setEdit(view); setView(null); }}
      rows={[['Price', `${money(view.price_paise)}${view.gst_mode === 'add' ? ' + GST' : view.gst_mode === 'included' ? ' incl. GST' : ''}`], ['In stock', view.allow_preorder ? `${view.stock} (pre-orders allowed)` : String(view.stock)], ['In the store', view.active ? 'Shown' : 'Hidden'],
        ['Description', view.description], ['Details', (view.details || []).join('\n')], ['Shipping note', view.shipping_note || all.store?.shipping_note], ['Return note', view.return_note || all.store?.return_note || returnPolicy]]}>
      {view.images?.length > 0 && <div className="ad-imgs" style={{ marginBottom: 16 }}>{view.images.map((x) => <div className="it" key={x}><img src={photo(x)} alt="" /></div>)}</div>}</ViewModal>}
    {edit && <ProductForm rowsCount={data.length} store={all.store} p={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
  </Page>);
}

function ProductForm({ p, rowsCount, store, onClose, onSaved }) {
  const isNew = !p.id; const [run, busy] = useAction();
  const f = useForm({ title: p.title || '', description: p.description || '', details: (p.details || []).join('\n'), price: p.price_paise != null ? String(p.price_paise / 100) : '', stock: String(p.stock ?? 0), allow_preorder: !!p.allow_preorder,
    gst_mode: p.gst_mode || 'none', shipping_note: p.shipping_note || store?.shipping_note || '', return_note: p.return_note || store?.return_note || returnPolicy, active: p.active ?? true, images: p.images || [] });   // the notes start from Settings and can still be changed here
  const save = (e, asCopy) => { e?.preventDefault(); return run(async () => {
    const v = f.v; if (!v.title.trim()) throw new Error('Please add a title.'); if (!v.price) throw new Error('Please add a price.');
    const row = { title: v.title, description: v.description || null, details: lines(v.details), price_paise: rupeesToPaise(v.price), stock: Math.max(0, parseInt(v.stock || '0', 10)), allow_preorder: v.allow_preorder, gst_mode: v.gst_mode, shipping_note: v.shipping_note && v.shipping_note !== (store?.shipping_note || '') ? v.shipping_note : null, return_note: v.return_note && v.return_note !== (store?.return_note || returnPolicy) ? v.return_note : null, active: v.active, images: v.images };
    if (isNew || asCopy) { const base = slugify(v.title) + (asCopy ? '-copy' : ''); if (isNew || asCopy) row.sort_order = (rowsCount || 0) + 1; let r = await sb().from('products').insert({ ...row, slug: base }); if (r.error?.code === '23505') r = await sb().from('products').insert({ ...row, slug: `${base}-${Math.random().toString(36).slice(2, 6)}` }); must(r); }
    else must(await sb().from('products').update(row).eq('id', p.id));
    onSaved();
  }, 'Product saved'); };
  const [blocked, setBlocked] = useState(0);
  const remove = () => run(async () => {
    const { count } = await sb().from('order_items').select('id', { count: 'exact', head: true }).eq('product_id', p.id);
    if (count > 0) { setBlocked(count); return; }                                           // it was ordered: offer to hide it instead of failing
    must(await sb().from('products').delete().eq('id', p.id)); onSaved(); }, 'Product deleted');
  const hide = () => run(async () => { must(await sb().from('products').update({ active: false }).eq('id', p.id)); onSaved(); }, 'Product hidden from the store');
  return (<Modal title={isNew ? 'Add product' : 'Edit product'} onClose={onClose} wide>
    <form onSubmit={save} className="ad-form">
      <div className="full"><F form={f} k="title" label="Name" rule="title" required /></div>
      <F form={f} k="price" label="Price (₹)" type="money" rule="money" required /><F form={f} k="stock" label="In stock" rule="digits" required inputMode="numeric" />
      <F form={f} k="gst_mode" label="GST" type="select" required options={GST_MODES} />
      <F form={f} k="allow_preorder" label="Allow pre-orders when out of stock" type="check" /><F form={f} k="active" label="Show in the store" type="check" />
      <div className="full"><F form={f} k="description" label="Description" type="textarea" rule="sentence" /></div>
      <div className="full"><F form={f} k="details" label="Details" type="textarea" rule="sentence" hint="One point per line, such as size or paper" /></div>
      <F form={f} k="shipping_note" label="Shipping note" rule="sentence" hint="Comes from Settings. Change it here only for this product." /><F form={f} k="return_note" label="Return note" rule="sentence" hint="Comes from Settings. Change it here only for this product." />
      <PhotoField label="Photos" paths={f.v.images} onChange={(a) => f.set('images', a)} folder="products" max={8} />
      <div className="ad-actions full"><Btn busy={busy} icon="check">Save</Btn>{!isNew && <Btn type="button" variant="ghost" busy={busy} onClick={(e) => save(e, true)}>Copy</Btn>}{!isNew && <Confirm onYes={remove}>Delete</Confirm>}</div>
    </form>
    {blocked > 0 && <Modal title="This product cannot be deleted" onClose={() => setBlocked(0)}><p style={{ marginTop: 0 }}>It is in <b>{blocked}</b> {blocked === 1 ? 'order' : 'orders'}, and your records and receipts need it. You can hide it from the store instead. Nothing is lost.</p><div className="ad-actions full"><Btn busy={busy} onClick={hide}>Hide it</Btn><Btn variant="ghost" onClick={() => setBlocked(0)}>Keep it</Btn></div></Modal>}</Modal>);
}
