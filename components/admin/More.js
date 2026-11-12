'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Page } from './kit';
import { AIcon, unreadCount } from './Shell';
export default function More() {
  const [unread, setUnread] = useState(0); useEffect(() => { unreadCount().then(setUnread).catch(() => {}); }, []);
  const items = [['/manager/planner', 'Planner', 'calendardays'], ['/manager/products', 'Store', 'bag'], ['/manager/customers', 'Customers', 'user'], ['/manager/inbox', unread ? `Inbox (${unread})` : 'Inbox', 'mail'], ['/manager/settings', 'Settings', 'gear']];
  return (<Page title="More"><div className="ad-menu">{items.map(([h, t, i]) => <Link key={h} href={h}><AIcon n={i} />{t}</Link>)}</div></Page>);
}
