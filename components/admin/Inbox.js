'use client';
import { useState } from 'react';
import { useLoad, sb, must, Page, Card, Badge, Empty, Spin, Err, Modal, Btn, useAction, Confirm, fmtDT, fmtD } from './kit';
// Everything people send through the website forms: contact messages, custom invitation requests, service requests, collaboration offers and job applications.
const KIND = { contact: 'Message', invitation: 'Invitation request', service: 'Service request', collaboration: 'Collaboration', hiring: 'Job application' };
export default function Inbox() {
  const [open, setOpen] = useState(null);
  const { data, error, reload } = useLoad(async () => must(await sb().from('enquiries').select('*').order('created_at', { ascending: false }).limit(500)));
  if (error) return <Page title="Inbox"><Err e={error} /></Page>; if (!data) return <Page title="Inbox"><Spin /></Page>;
  const unread = data.filter((e) => !e.handled).length;
  const view = async (e) => { setOpen(e); if (!e.handled) { await sb().from('enquiries').update({ handled: true }).eq('id', e.id); reload(); } };
  return (<Page title={unread ? `Inbox (${unread})` : 'Inbox'}>
    <Card tight>{data.length ? <div className="ad-list">{data.map((e) => (
      <button key={e.id} className={`ad-row mail-row ${e.handled ? '' : 'unread'}`} onClick={() => view(e)}><span className="udot" aria-hidden="true" />
        <div className="main"><b>{e.name}</b><small className="mail-sub"><span>{KIND[e.kind] || 'Message'}</span> · {(e.message || '').slice(0, 90)}</small></div><div className="end"><small>{fmtD(e.created_at)}</small></div></button>))}</div> : <Empty>No messages yet.</Empty>}</Card>
    {open && <Detail e={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload(); }} />}
  </Page>);
}
function Detail({ e, onClose, onDone }) {
  const [run, busy] = useAction(); const wa = String(e.phone || '').replace(/\D/g, '').slice(-10);
  const unread = () => run(async () => { must(await sb().from('enquiries').update({ handled: false }).eq('id', e.id)); onDone(); }, 'Marked as unread');
  const del = () => run(async () => { must(await sb().from('enquiries').delete().eq('id', e.id)); onDone(); }, 'Deleted');
  return (<Modal title={e.name} onClose={onClose}>
    <p style={{ marginTop: 0 }}><Badge tone="info">{KIND[e.kind] || 'Message'}</Badge> <span className="ad-help">{fmtDT(e.created_at)}</span></p>
    <p style={{ whiteSpace: 'pre-wrap' }}>{e.message}</p>
    {Object.entries(e.details || {}).filter(([, v]) => v).map(([k, v]) => <p key={k} className="ad-help" style={{ margin: '2px 0' }}><b>{k.replace(/_/g, ' ')}:</b> {v}</p>)}
    <p className="ad-help">{e.email}{e.phone ? ` · ${e.phone}` : ''}</p>
    <div className="ad-actions full"><a className="ad-btn" href={`mailto:${e.email}`}>Reply</a>{e.phone && <a className="ad-btn ghost" href={`tel:${e.phone}`}>Call</a>}{wa.length === 10 && <a className="ad-btn ghost" target="_blank" rel="noopener" href={`https://wa.me/91${wa}`}>WhatsApp</a>}
      <Btn variant="ghost" busy={busy} onClick={unread}>Mark unread</Btn><Confirm onYes={del}>Delete</Confirm></div>
  </Modal>);
}
