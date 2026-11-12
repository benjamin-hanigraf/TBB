'use client';
import Link from 'next/link';
import { Page } from './kit';
import { AIcon } from './Shell';
export default function More() {
  const items = [['/manager/planner', 'Planner', 'calendardays'], ['/manager/products', 'Store', 'bag'], ['/manager/customers', 'Customers', 'user'], ['/manager/inbox', 'Inbox', 'mail'], ['/manager/settings', 'Settings', 'gear']];
  return (<Page title="More"><div className="ad-menu">{items.map(([h, t, i]) => <Link key={h} href={h}><AIcon n={i} />{t}</Link>)}</div></Page>);
}
