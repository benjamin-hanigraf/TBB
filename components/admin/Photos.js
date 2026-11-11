'use client';
import { useRef, useState } from 'react';
import { useLoad, sb, must, Page, Spin, Err, useToast, Btn } from './kit';
import { uploadPhoto, removePhoto } from '@/lib/upload';
import { photo } from '@/lib/photo';
import Icon from '@/components/Icons';
// Every photo on the website that she can swap. "original" is the built-in photo the site uses until she uploads her own.
export const SLOTS = [
  ['Home page', [['hero', 'Main photo at the top', '/img/cb028c51a9.webp']]],
  ['Writing classes', [['teaching', 'Classes page photo (portrait)', '/img/5c8f647552.webp'], ['classes_banner', 'Home page classes banner (landscape)', '/img/31648a2db3.webp']]],
  ['Custom invitations', [['invite_1', 'Invitation photo 1', '/img/55fd8e1e6e.webp'], ['invite_2', 'Invitation photo 2', '/img/ac911ad304.webp'], ['invite_3', 'Invitation photo 3', '/img/3c20fb04cd.webp']]],
  ['Collaborations', [['memory_1', 'Memory 1', '/img/46fb7712d6.webp'], ['memory_2', 'Memory 2', '/img/b6a47a5a0d.webp'], ['memory_3', 'Memory 3', '/img/0f9b608e69.webp'], ['memory_4', 'Memory 4', '/img/80436c064f.webp']]],
  ['Studio gallery (home page)', [1, 2, 3, 4, 5, 6].map((n, i) => [`gallery_${n}`, `Gallery photo ${n}`, ['/img/cbe16ef83a.webp', '/img/d1065c139e.webp', '/img/cafdbd8687.webp', '/img/31648a2db3.webp', '/img/6f01eba695.webp', '/img/a4776a3df0.webp'][i]])],
];
export default function Photos() {
  const { data, error, reload } = useLoad(async () => Object.fromEntries(must(await sb().from('site_images').select('*')).map((r) => [r.key, r])));
  if (error) return <Page title="Website photos"><Err e={error} /></Page>; if (!data) return <Page title="Website photos"><Spin /></Page>;
  return (<Page title="Website photos">
    <p className="ad-help" style={{ marginTop: 0, marginBottom: 18 }}>Tap "Change photo" to replace a picture on the website. Photos are resized automatically, and the site updates within a minute.</p>
    {SLOTS.map(([group, items]) => (<section key={group} style={{ marginBottom: 28 }}><h2 style={{ fontSize: 19, marginBottom: 12 }}>{group}</h2>
      <div className="ad-photos">{items.map(([key, label, orig]) => <Slot key={key} k={key} label={label} orig={orig} row={data[key]} onDone={reload} />)}</div></section>))}
  </Page>);
}
function Slot({ k, label, orig, row, onDone }) {
  const toast = useToast(); const input = useRef(); const [busy, setBusy] = useState(false);
  async function pick(e) {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return; setBusy(true);
    try { const path = await uploadPhoto(file, 'site'); must(await sb().from('site_images').upsert({ key: k, label, path, alt: label, updated_at: new Date().toISOString() })); if (row?.path) await removePhoto(row.path); toast('Photo changed. The website updates within a minute.'); onDone(); }
    catch (err) { toast(err.message || 'Upload failed.', 'err'); } finally { setBusy(false); }
  }
  async function reset() { setBusy(true); try { must(await sb().from('site_images').delete().eq('key', k)); if (row?.path) await removePhoto(row.path); toast('Back to the original photo.'); onDone(); } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); } }
  return (<div className="ad-photo"><img src={photo(row?.path || orig)} alt={label} /><div><b>{label}</b>
    <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Btn className="ad-btn sm" busy={busy} icon="upload" onClick={() => input.current.click()}>{busy ? 'Uploading…' : 'Change photo'}</Btn>{row && <button className="ad-btn ghost sm" disabled={busy} onClick={reset}>Use original</button>}</div></div></div>);
}
