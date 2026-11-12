'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Page } from './kit';
import { AIcon, unreadCount, MORE } from './Shell';
// The pages that are not on the phone's bottom bar.
export default function More() {
  const [unread, setUnread] = useState(0); useEffect(() => { unreadCount().then(setUnread).catch(() => {}); }, []);
  return (<Page title="More"><div className="ad-menu">{MORE.map(([h, t, i]) => <Link key={h} href={h}><AIcon n={i} />{h === '/manager/inbox' && unread ? `${t} (${unread})` : t}</Link>)}</div></Page>);
}
