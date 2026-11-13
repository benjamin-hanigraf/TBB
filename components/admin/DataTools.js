'use client';
// All spreadsheet import, export and backup in one place (Settings > Data). A list can be downloaded as a spreadsheet; products, workshops, classes,
// customers and invoices can also be uploaded. The downloaded sheets use the same columns as the upload template, so a sheet can be downloaded, edited and uploaded back.
import { useState } from 'react';
import { sb, must, every, Btn, useAction, useToast, download, isoToDMY } from './kit';
import ImportCsv from './ImportCsv';
import { toCSV } from '@/lib/accounting';
import { orderNumber } from '@/lib/numbering';

const ist = (iso) => new Date(new Date(iso).getTime() + 5.5 * 3600e3);
const dmy = (iso) => (iso ? isoToDMY(ist(iso).toISOString().slice(0, 10)) : '');
const clock = (iso) => { const d = ist(iso); const h = d.getUTCHours(); return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const bar = (a) => (a || []).join(' | ');
const rup = (p) => (p || 0) / 100;
const get = async (q) => must(await every(q));

// Each list: what it is called, how to read it, and which columns go in the sheet. up = the kind of upload it supports (if any).
const LISTS = [
  { key: 'products', name: 'Products', note: 'Name, price, stock and photos', up: 'products', file: 'products.csv',
    rows: () => get(() => sb().from('products').select('*').order('sort_order').order('id')),
    cols: [{ label: 'Name', key: 'title' }, { label: 'Price', get: (r) => rup(r.price_paise) }, { label: 'In stock', key: 'stock' }, { label: 'Pre-order', get: (r) => (r.allow_preorder ? 'yes' : 'no') }, { label: 'Show in store', get: (r) => (r.active ? 'yes' : 'no') },
      { label: 'GST', key: 'gst_mode' }, { label: 'Description', key: 'description' }, { label: 'Details', get: (r) => bar(r.details) }, { label: 'Shipping note', key: 'shipping_note' }, { label: 'Return note', key: 'return_note' }, { label: 'Photos', get: (r) => bar(r.images) }, { label: 'Code', key: 'slug' }] },
  { key: 'workshops', name: 'Workshops', note: 'Dates, venue, price and seats', up: 'workshops', file: 'workshops.csv',
    rows: () => get(() => sb().from('workshops').select('*').order('starts_at').order('id')),
    cols: [{ label: 'Title', key: 'title' }, { label: 'Date', get: (r) => dmy(r.starts_at) }, { label: 'Time', get: (r) => clock(r.starts_at) }, { label: 'Venue', key: 'venue_name' }, { label: 'Venue address', key: 'venue_address' }, { label: 'Price', get: (r) => rup(r.price_paise) },
      { label: 'Friend price', get: (r) => (r.friend_price_paise ? rup(r.friend_price_paise) : '') }, { label: 'Seats', key: 'capacity' }, { label: 'Status', key: 'status' }, { label: 'Summary', key: 'summary' }, { label: 'Description', key: 'description' },
      { label: 'What participants learn', get: (r) => bar(r.learn) }, { label: 'Kit includes', get: (r) => bar(r.includes) }, { label: 'Note', key: 'note' }, { label: 'Photo', key: 'image_path' }, { label: 'Code', key: 'slug' }] },
  { key: 'classes', name: 'Classes', note: 'Levels, prices and what they cover', up: 'classes', file: 'classes.csv',
    rows: () => get(() => sb().from('class_levels').select('*').order('sort_order').order('id')),
    cols: [{ label: 'Course name', key: 'title' }, { label: 'Level', key: 'level' }, { label: 'Type', key: 'track' }, { label: 'Price', get: (r) => rup(r.price_paise) }, { label: 'Number of classes', key: 'sessions' }, { label: 'Description', key: 'description' },
      { label: 'Covers', get: (r) => bar(r.covers) }, { label: 'Show on website', get: (r) => (r.active ? 'yes' : 'no') }, { label: 'Order', key: 'sort_order' }, { label: 'Code', key: 'slug' }] },
  { key: 'customers', name: 'Customers', note: 'Names, contact details and addresses', up: 'customers', file: 'customers.csv',
    rows: () => get(() => sb().from('customers').select('*').order('name').order('id')),
    cols: [{ label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Address line 1', key: 'address_line1' }, { label: 'Address line 2', key: 'address_line2' }, { label: 'City', key: 'city' }, { label: 'State', key: 'state' }, { label: 'Pincode', key: 'pincode' },
      { label: 'Notes', key: 'notes' }, { label: 'Source', key: 'source' }, { label: 'Marketing OK', get: (r) => (r.marketing_opt_in ? 'yes' : 'no') }] },
  { key: 'invoices', name: 'Invoices and quotations', note: 'Numbers, customers, amounts and status', up: 'invoices', file: 'invoices.csv',
    rows: async () => { const [i, p] = await Promise.all([get(() => sb().from('invoices').select('*').order('issue_date').order('id')), get(() => sb().from('invoice_payments').select('invoice_id,amount_paise').order('id'))]);
      const paid = {}; p.forEach((x) => (paid[x.invoice_id] = (paid[x.invoice_id] || 0) + x.amount_paise)); return i.map((r) => ({ ...r, _paid: paid[r.id] || (r.status === 'paid' ? r.total_paise : 0) })); },
    cols: [{ label: 'Invoice no', key: 'invoice_no' }, { label: 'Date', get: (r) => isoToDMY(r.issue_date) }, { label: 'Customer', key: 'customer_name' }, { label: 'Email', key: 'customer_email' }, { label: 'Phone', key: 'customer_phone' }, { label: 'Address', key: 'customer_address' },
      { label: 'Amount', get: (r) => rup(r.total_paise) }, { label: 'Status', get: (r) => (r.doc_type === 'quotation' ? `quotation (${r.status})` : r._paid >= r.total_paise && r._paid > 0 ? 'paid' : r._paid > 0 ? 'part paid' : 'unpaid') },
      { label: 'Type', get: (r) => (r.doc_type === 'quotation' ? 'Quotation' : r.doc_type === 'credit_note' ? 'Credit note' : 'Invoice') }, { label: 'GST', get: (r) => rup(r.gst_paise) }, { label: 'Paid', get: (r) => rup(r._paid) }, { label: 'Due date', get: (r) => isoToDMY(r.due_date) }] },
  { key: 'orders', name: 'Orders', note: 'Order numbers, items, totals and addresses', file: 'orders.csv',
    rows: async () => { const [o, s] = await Promise.all([get(() => sb().from('orders').select('*,order_items(*)').order('created_at').order('id')), sb().from('settings').select('key,value')]); const st = Object.fromEntries((s.data || []).map((x) => [x.key, x.value])); return o.map((r) => ({ ...r, _no: orderNumber(r, st) })); },
    cols: [{ label: 'Order no', key: '_no' }, { label: 'Date', get: (r) => dmy(r.created_at) }, { label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Items', get: (r) => (r.order_items || []).map((i) => `${i.title} x${i.qty}`).join('; ') },
      { label: 'Total', get: (r) => rup(r.total_paise) }, { label: 'Status', get: (r) => (['shipped', 'delivered'].includes(r.status) ? 'shipped' : ['paid', 'packed'].includes(r.status) ? 'paid' : r.status === 'pending' ? 'not paid' : r.status) },
      { label: 'Address', get: (r) => [r.shipping_address?.recipient, r.shipping_address?.line1, r.shipping_address?.line2, r.shipping_address?.city, r.shipping_address?.state, r.shipping_address?.pincode].filter(Boolean).join(', ') }, { label: 'Courier', key: 'tracking_carrier' }, { label: 'Tracking number', key: 'tracking_number' }] },
  { key: 'accounts', name: 'Accounts', note: 'Every money in and money out entry', file: 'accounts.csv',
    rows: () => get(() => sb().from('ledger_entries').select('*').order('entry_date').order('id')),
    cols: [{ label: 'Date', get: (r) => isoToDMY(r.entry_date) }, { label: 'Type', get: (r) => (r.kind === 'in' ? 'Income' : 'Expense') }, { label: 'Category', key: 'category' }, { label: 'Party', key: 'party' }, { label: 'Description', key: 'description' },
      { label: 'Amount', get: (r) => rup(r.amount_paise) }, { label: 'GST included', get: (r) => rup(r.gst_paise) }, { label: 'Paid by', key: 'method' }] },
  { key: 'bookings', name: 'Workshop participants', note: 'Everyone who booked, for every workshop', file: 'workshop-participants.csv',
    rows: () => get(() => sb().from('bookings').select('*,workshops(title,starts_at)').order('created_at').order('id')),
    cols: [{ label: 'Workshop', get: (r) => r.workshops?.title }, { label: 'Workshop date', get: (r) => dmy(r.workshops?.starts_at) }, { label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' }, { label: 'Seats', key: 'seats' },
      { label: 'Status', key: 'status' }, { label: 'Amount', get: (r) => rup(r.amount_paise) }, { label: 'Booked on', get: (r) => dmy(r.created_at) }] },
  { key: 'students', name: 'Class students', note: 'Everyone enrolled, for every class', file: 'class-students.csv',
    rows: async () => { const [e, s] = await Promise.all([get(() => sb().from('class_enrolments').select('*,class_levels(title,level)').order('created_at').order('id')), get(() => sb().from('class_sessions').select('enrolment_id,status').order('id'))]);
      const done = {}, all = {}; s.forEach((x) => { if (x.status !== 'cancelled') all[x.enrolment_id] = (all[x.enrolment_id] || 0) + 1; if (x.status === 'done') done[x.enrolment_id] = (done[x.enrolment_id] || 0) + 1; }); return e.map((r) => ({ ...r, _done: done[r.id] || 0, _all: all[r.id] || 0 })); },
    cols: [{ label: 'Class', get: (r) => `${r.class_levels?.title || ''} (${r.class_levels?.level || ''})` }, { label: 'Student', key: 'student_name' }, { label: 'Group', key: 'student_group' }, { label: 'Age', key: 'student_age' }, { label: 'Contact name', key: 'name' }, { label: 'Email', key: 'email' },
      { label: 'Phone', key: 'phone' }, { label: 'Status', key: 'status' }, { label: 'Amount', get: (r) => rup(r.amount_paise) }, { label: 'Classes attended', key: '_done' }, { label: 'Classes scheduled', key: '_all' }] },
];

// Everything in the database as one file (kept private: it has customer details). Photos stay in Supabase storage and are not inside.
const BACKUP_TABLES = ['settings', 'site_images', 'workshops', 'bookings', 'class_types', 'class_levels', 'class_sessions', 'class_enrolments', 'products', 'orders', 'order_items', 'customers', 'enquiries', 'invoices', 'invoice_payments', 'ledger_entries', 'events', 'rentouts', 'todos', 'profiles'];

export default function DataTools() {
  const toast = useToast(); const [busyKey, setBusyKey] = useState(''); const [up, setUp] = useState(null); const [note, setNote] = useState(''); const [run, busy] = useAction();
  const grab = async (l) => { setBusyKey(l.key); try { const rows = await l.rows(); if (!rows.length) { toast('Nothing to download yet.'); return; } download(l.file, toCSV(rows, l.cols)); toast(`Downloaded ${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`); } catch (e) { console.error(e); toast(e?.message || 'Could not download.', 'err'); } finally { setBusyKey(''); } };
  const backup = () => run(async () => {
    const tables = {}; const skipped = [];
    for (const t of BACKUP_TABLES) { setNote(`Reading ${t.replace(/_/g, ' ')}…`); try { tables[t] = must(await every(() => sb().from(t).select('*').order(t === 'settings' || t === 'site_images' ? 'key' : 'id'))); } catch { skipped.push(t); } }
    const day = new Date().toISOString().slice(0, 10); const n = Object.values(tables).reduce((a, r) => a + r.length, 0);
    download(`thin-black-brush-backup-${day}.json`, JSON.stringify({ made: new Date().toISOString(), note: 'Thin Black Brush Manager backup. Keep it private: it has customer details.', skipped, tables }, null, 1), 'application/json');
    setNote(`Downloaded ${n} rows from ${Object.keys(tables).length} lists${skipped.length ? `. Could not read: ${skipped.join(', ')}` : ''}.`); }, 'Backup downloaded');
  return (<>
    <p className="ad-help" style={{ marginTop: 0 }}>Download any list as a spreadsheet. Lists with Upload can be filled or updated from a spreadsheet: download one, change it in Excel, Numbers or Google Sheets, and upload it back.</p>
    <div className="ad-list">{LISTS.map((l) => (<div key={l.key} className="ad-row" style={{ cursor: 'default' }}><div className="main"><b>{l.name}</b><small>{l.note}</small></div>
      <div className="end row-actions" style={{ display: 'flex', margin: 0 }}><Btn variant="ghost" icon="fileout" busy={busyKey === l.key} onClick={() => grab(l)}>Download</Btn>{l.up && <Btn variant="ghost" icon="filein" onClick={() => setUp(l.up)}>Upload</Btn>}</div></div>))}</div>
    <p className="ad-section-t" style={{ marginTop: 22 }}>Backup</p>
    <p className="ad-help">Everything in one file. The free database plan keeps no backups, so download one every week or two and keep it somewhere safe and private. Photos are not included.</p>
    <div className="row-actions"><Btn busy={busy} icon="download" onClick={backup}>Download everything</Btn></div>{note && <p className="ad-help">{note}</p>}
    {up && <ImportCsv kind={up} onClose={() => setUp(null)} onDone={() => {}} />}
  </>);
}
