'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icons';
import { Page, Btn, clearCache } from './kit';
import { lockDevice } from '@/lib/adminApi';
import { AIcon, unreadCount, MORE } from './Shell';
// The pages that are not on the phone's bottom bar.
export default function More() {
  const [unread, setUnread] = useState(0); useEffect(() => { unreadCount().then(setUnread).catch(() => {}); }, []);
  return (<Page title="More"><div className="ad-menu">{MORE.map(([h, t, i]) => <Link key={h} href={h}><AIcon n={i} />{h === '/manager/inbox' && unread ? `${t} (${unread})` : t}</Link>)}</div>
    <div className="more-session ad-actions"><a className="ad-btn ghost" href="/" target="_blank" rel="noopener"><Icon n="arrow" size={16} /><span>Visit website</span></a>
      <Btn variant="ghost" icon="logout" onClick={async () => { await lockDevice(); clearCache(); location.reload(); }}>Log out</Btn></div></Page>);
}
