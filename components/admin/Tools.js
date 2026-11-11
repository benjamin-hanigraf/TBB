'use client';
import Link from 'next/link';
import { Page } from './kit';
import { AIcon } from './Shell';
export default function Tools() {
  const items = [['/manager/tools/calculator', 'Business calculator', 'calc', 'Prices, profit, GST, discounts and break-even'], ['/manager/tools/invoice', 'Invoice generator', 'file', 'Make, email and print invoices'], ['/manager/tools/labels', 'Address labels', 'box', 'Print labels for parcels'], ['/manager/money', 'Accounts', 'rupee', 'Money in, money out, profit and GST']];
  return (<Page title="Tools"><div className="ad-menu">{items.map(([h, t, i, d]) => <Link key={h} href={h}><AIcon n={i} /><span>{t}<small className="ad-help" style={{ display: 'block', fontWeight: 400 }}>{d}</small></span></Link>)}</div></Page>);
}
