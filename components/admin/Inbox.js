'use client';
import { useRef, useState } from 'react';
import Icon from '@/components/Icons';
import { nb, Segs, useLoad, sb, must, every, Page, Card, Fold, Badge, Empty, Spin, Err, Modal, Btn, useAction, Confirm, fmtDT } from './kit';
// Everything people send through the website forms: contact messages, custom invitation requests, service requests, collaboration offers and job applications.
// Two separate marks: read (opening a message reads it) and attended (you have dealt with it).
const KIND = { contact: 'Message', invitation: 'Invitation request', service: 'Service request', collaboration: 'Collaboration', hiring: 'Job application' };
const hasRead = (e) => e.read_at !== undefined;                        // before the database was updated there is no read_at
const isRead = (e) => (hasRead(e) ? !!e.read_at : !!e.handled);
const waNumber = (p) => String(p || '').replace(/\D/g, '').slice(-10);

export default function Inbox() {
  const [open, setOpen] = useState(null); const [, setBusy] = useState(false); const [pend, setPend] = useState({}); const timers = useRef({});   // pend: messages just marked attended: 'wait' (2 s to change your mind), then 'leaving' (slides and fades away)
  const { data, error, reload } = useLoad(async () => must(await every(() => sb().from('enquiries').select('*').order('created_at', { ascending: false }).order('id'))));
  if (error) return <Page title="Inbox"><Err e={error} /></Page>; if (!data) return <Page title="Inbox"><Spin /></Page>;
  const unread = data.filter((e) => !isRead(e)).length; const todo = data.filter((e) => !e.handled || pend[e.id]), done = data.filter((e) => e.handled && !pend[e.id]);
  const setRead = async (e, read) => { setBusy(true); await sb().from('enquiries').update(hasRead(e) ? { read_at: read ? new Date().toISOString() : null } : { handled: read }).eq('id', e.id); setBusy(false); reload(); };
  const setHandled = async (e, v) => { setBusy(true); await sb().from('enquiries').update({ handled: v }).eq('id', e.id); setBusy(false); reload(); };
  const clearPend = (id) => setPend((p) => { const n = { ...p }; delete n[id]; return n; });
  // Marking attended: the row shows as attended at once, waits 2 seconds (tap again to undo), then slides and fades away into the Attended list.
  const attend = async (e) => {
    if (pend[e.id]) { clearTimeout(timers.current[e.id]); clearTimeout(timers.current[`${e.id}x`]); clearPend(e.id); return setHandled(e, false); }
    setPend((p) => ({ ...p, [e.id]: 'wait' }));
    const { error: er } = await sb().from('enquiries').update({ handled: true }).eq('id', e.id); if (er) { clearPend(e.id); return; }
    timers.current[e.id] = setTimeout(() => { setPend((p) => ({ ...p, [e.id]: 'leaving' })); timers.current[`${e.id}x`] = setTimeout(() => { clearPend(e.id); reload(); }, 320); }, 2000);
  };
  const toggleHandled = (e) => (e.handled && !pend[e.id] ? setHandled(e, false) : attend(e));
  const view = async (e) => { setOpen(e); if (!isRead(e)) setRead(e, true); };
  const row = (e) => { const att = !!e.handled || !!pend[e.id]; return (<div key={e.id} className={`ad-row mail-row ${isRead(e) ? '' : 'unread'} ${pend[e.id] === 'leaving' ? 'leaving' : ''}`} style={{ cursor: 'default' }}>
    <button type="button" className="mail-open" onClick={() => view(e)}><span className="udot" aria-hidden="true" />
      <span className="main"><b>{nb(e.name)}</b><Segs className="mail-sub" items={[KIND[e.kind] || 'Message', new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })]} /></span></button>
    <div className="mail-tools">
      <button type="button" className="ad-x tg" aria-pressed={att} aria-label={att ? 'Mark as not attended' : 'Mark as attended'} title={att ? 'Attended. Tap to undo' : 'Mark as attended'} onClick={() => toggleHandled(e)}><Icon n={att ? 'circlecheck' : 'circle'} size={18} /></button>
      <button type="button" className="ad-x tg" aria-pressed={isRead(e)} aria-label={isRead(e) ? 'Mark as unread' : 'Mark as read'} title={isRead(e) ? 'Read. Tap to mark unread' : 'Unread. Tap to mark read'} onClick={() => setRead(e, !isRead(e))}><Icon n={isRead(e) ? 'mailopen' : 'mail'} size={18} /></button></div></div>); };
  return (<Page title={unread ? `Inbox (${unread})` : 'Inbox'}>
    <Card title={`Not attended${todo.length ? ` (${todo.length})` : ''}`} tight>{todo.length ? <div className="ad-list">{todo.map(row)}</div> : <Empty>{data.length ? 'Everything is attended.' : 'No messages yet.'}</Empty>}</Card>
    {done.length > 0 && <Fold title="Attended"><div className="ad-list">{done.map(row)}</div></Fold>}
    {open && <Detail e={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); reload(); }} onAttend={() => { const e = open; setOpen(null); attend(e); }} />}
  </Page>);
}

function Detail({ e, onClose, onDone, onAttend }) {
  const [run, busy] = useAction(); const wa = waNumber(e.phone);
  const attended = () => { if (!e.handled) return onAttend(); return run(async () => { must(await sb().from('enquiries').update({ handled: !e.handled }).eq('id', e.id)); onDone(); }, e.handled ? 'Moved back to Not attended' : 'Marked as attended'); };
  const del = () => run(async () => { must(await sb().from('enquiries').delete().eq('id', e.id)); onDone(); }, 'Deleted');
  return (<Modal title={e.name} onClose={onClose}>
    <p style={{ marginTop: 0 }}><Badge tone="info">{KIND[e.kind] || 'Message'}</Badge> {e.handled && <Badge tone="ok">Attended</Badge>} <span className="ad-help">{fmtDT(e.created_at)}</span></p>
    <p style={{ whiteSpace: 'pre-wrap' }}>{e.message}</p>
    {Object.entries(e.details || {}).filter(([, v]) => v).map(([k, v]) => <p key={k} className="ad-help" style={{ margin: '2px 0' }}><b>{k.replace(/_/g, ' ')}:</b> {v}</p>)}
    <p className="ad-help">{e.email}{e.phone && <>{e.email ? ' · ' : ''}<a href={`tel:${e.phone}`} className="plainlink">{e.phone}</a></>}</p>
    <div className="ad-actions full eq">
      {e.email && <a className="ad-btn" href={`mailto:${e.email}`}><Icon n="mail" size={16} /><span>Reply</span></a>}
      {wa.length === 10 && <a className={`ad-btn ${e.email ? 'ghost' : ''}`} target="_blank" rel="noopener" href={`https://wa.me/91${wa}`}><Icon n="whatsapp" size={16} /><span>WhatsApp</span></a>}
      <Btn variant="ghost" busy={busy} icon={e.handled ? 'circle' : 'circlecheck'} onClick={attended}>{e.handled ? 'Not attended' : 'Attended'}</Btn>
      <Confirm icon="trash" onYes={del}>Delete</Confirm></div>
  </Modal>);
}
