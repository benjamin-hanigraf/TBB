'use client';
import Link from 'next/link';
import { Page } from './kit';
import { AIcon } from './Shell';
export default function More() {
  const items = [['/manager/calendar', 'Calendar', 'calendardays'], ['/manager/todo', 'To-do', 'listcheck'], ['/manager/classes', 'Classes', 'chair'], ['/manager/products', 'Store', 'bag'], ['/manager/customers', 'Customers', 'user'], ['/manager/invoices', 'Invoices', 'file'], ['/manager/inbox', 'Inbox', 'mail'], ['/manager/calculator', 'Calculator', 'calc'], ['/manager/labels', 'Label printer', 'tag'], ['/manager/settings', 'Settings', 'gear']];
  return (<Page title="More"><div className="ad-menu">{items.map(([h, t, i]) => <Link key={h} href={h}><AIcon n={i} />{t}</Link>)}</div></Page>);
}
