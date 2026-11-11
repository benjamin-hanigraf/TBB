'use client';
import { useState } from 'react';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Modal, Btn, useAction, Confirm, fmtDT } from './kit';
const KIND = { contact: 'Message', invitation: 'Invitation', service: 'Service request', collaboration: 'Collaboration', hiring: 'Job application' };
export default function Inbox() {
  const [tab, setTab] = useState('new'); const [open, setOpen] = useState(null);
  const { data, error, reload } = useLoad(async () => must(await sb().from('enquiries').select('*').order('created_at', { ascending: false }).limit(500)));
  if (error) return <Page title="Inbox"><Err e={error} /></Page>; if (!data) return <Page title="Inbox"><Spin /></Page>;
  const rows = tab === 'new' ? data.filter((e) => !e.handled) : data;
  return (<Page title="Inbox">
    <div className="ad-tabsbar">{[['new', `New (${data.filter((e) => !e.handled).length})`], ['all', 'All']].map(([k, t]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>)}</div>
    <Card tight>{rows.length ? <div className="ad-list">{rows.map((e) => (
      <button key={e.id} className="ad-row" onClick={() => setOpen(e)}><div className="main"><b>{e.name}</b><small>{(e.message || '').slice(0, 90)}</small><small>{fmtDT(e.created_at)}</small></div><div className="end"><Badge tone={e.handled ? '' : 'warn'}>{KIND[e.kind]}</Badge></div></button>))}</div> : <Empty>{tab === 'new' ? 'No new messages.' : 'Nothing here yet.'}</Empty>}</Card>
    {open && <Detail e={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload(); }} />}
  </Page>);
}
function Detail({ e, onClose, onDone }) {
  const [run, busy] = useAction(); const wa = String(e.phone || '').replace(/\D/g, '').slice(-10);
  const toggle = () => run(async () => { must(await sb().from('enquiries').update({ handled: !e.handled }).eq('id', e.id)); onDone(); }, e.handled ? 'Marked as new' : 'Marked as done');
  const del = () => run(async () => { must(await sb().from('enquiries').delete().eq('id', e.id)); onDone(); }, 'Deleted');
  return (<Modal title={e.name} onClose={onClose}>
    <p style={{ marginTop: 0 }}><Badge tone="info">{KIND[e.kind]}</Badge> <span className="ad-help">{fmtDT(e.created_at)}</span></p>
    <p style={{ whiteSpace: 'pre-wrap' }}>{e.message}</p>
    {Object.entries(e.details || {}).filter(([, v]) => v).map(([k, v]) => <p key={k} className="ad-help" style={{ margin: '2px 0' }}><b>{k.replace(/_/g, ' ')}:</b> {v}</p>)}
    <p className="ad-help">{e.email}{e.phone ? ` · ${e.phone}` : ''}</p>
    <div className="ad-actions"><a className="ad-btn" href={`mailto:${e.email}`}>Reply by email</a>{e.phone && <a className="ad-btn ghost" href={`tel:${e.phone}`}>Call</a>}{wa.length === 10 && <a className="ad-btn ghost" target="_blank" rel="noopener" href={`https://wa.me/91${wa}`}>WhatsApp</a>}</div>
    <div className="ad-actions"><Btn variant="ghost" busy={busy} onClick={toggle} icon="check">{e.handled ? 'Mark as new' : 'Mark as done'}</Btn><Confirm onYes={del}>Delete</Confirm></div>
  </Modal>);
}
