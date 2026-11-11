'use client';
import Link from 'next/link';
import { Page } from './kit';
import { AIcon } from './Shell';
export default function More() {
  const items = [['/admin/classes', 'Classes', 'ticket'], ['/admin/products', 'Store', 'basket'], ['/admin/customers', 'Customers', 'user'], ['/admin/inbox', 'Inbox', 'mail'], ['/admin/tools', 'Tools', 'tool'], ['/admin/photos', 'Website photos', 'image'], ['/admin/settings', 'Settings', 'gear']];
  return (<Page title="More"><div className="ad-menu">{items.map(([h, t, i]) => <Link key={h} href={h}><AIcon n={i} />{t}</Link>)}</div></Page>);
}
