import test from 'node:test'; import assert from 'node:assert/strict';
import * as C from '../lib/csv.js';
test('reads commas, semicolons, tabs, quotes and a BOM', () => {
  assert.deepEqual(C.parseCSV('﻿a,b\r\n1,"x, y"\r\n"he said ""hi""",3\r\n'), [['a', 'b'], ['1', 'x, y'], ['he said "hi"', '3']]);
  assert.deepEqual(C.parseCSV('a;b\n1;2'), [['a', 'b'], ['1', '2']]); assert.deepEqual(C.parseCSV('a\tb\n1\t2'), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(C.parseCSV('a,b\n\n1,2\n,\n'), [['a', 'b'], ['1', '2']], 'blank lines are skipped');
  assert.deepEqual(C.parseCSV('a,b\n"line1\nline2",2'), [['a', 'b'], ['line1\nline2', '2']]);
});
test('headings are matched loosely', () => {
  const o = C.toObjects(C.parseCSV('Product Name,Price (₹),In stock\nPlanner,800,5')); assert.equal(o[0].productname, 'Planner'); assert.equal(o[0].price, '800'); assert.equal(o[0].instock, '5');
});
test('value readers', () => {
  assert.equal(C.yes('Yes'), true); assert.equal(C.yes('no'), false); assert.deepEqual(C.asList('a | b;c'), ['a', 'b', 'c']);
  assert.equal(C.asDate('25/12/2026'), '2026-12-25'); assert.equal(C.asDate('5-1-2027'), '2027-01-05'); assert.equal(C.asDate('2026-12-25'), '2026-12-25'); assert.equal(C.asDate('31/02/2026'), null); assert.equal(C.asDate('hello'), null);
  assert.equal(C.asTime('10:30 AM'), '10:30'); assert.equal(C.asTime('2pm'), '14:00'); assert.equal(C.asTime(''), '10:00'); assert.equal(C.asTime('25:00'), null);
  assert.equal(C.istISO('2026-12-25', '10:00'), '2026-12-25T04:30:00.000Z');
  assert.equal(C.writeCSV(['a', 'b'], ['x,y', 'z"']), 'a,b\r\n"x,y","z"""');
});

import { SPECS, readSheet } from '../lib/importSpecs.js';
test('products sheet: cleans rows and reports the bad ones by line number', () => {
  const sheet = C.toObjects(C.parseCSV('Name,Price,In stock,Pre-order,Details\nwooden oblique holder,"₹1,000",5,no,Length: 20 cm | Hand turned\n,500,1,,\nBad price,abc,1,,\nwooden oblique holder,1200,7,yes,'));
  const { rows, errors } = readSheet(SPECS.products, sheet);
  assert.equal(rows.length, 1, 'the two good rows share one name, so the later one wins'); assert.equal(rows[0].price_paise, 120000); assert.equal(rows[0].stock, 7); assert.equal(rows[0].allow_preorder, true); assert.equal(rows[0].slug, 'wooden-oblique-holder'); assert.equal(rows[0].title, 'Wooden oblique holder'.replace('oblique', 'oblique'));
  assert.deepEqual(errors.map((e) => e.line), [3, 4]); assert.match(errors[0].message, /Name/); assert.match(errors[1].message, /Price/);
});
test('workshops sheet: date and time become India time', () => {
  const { rows, errors } = readSheet(SPECS.workshops, C.toObjects(C.parseCSV('Title,Date,Time,Venue,Price,Status\nhand lettering,25/12/2026,10:00 AM,tbb studio,2300,Published\nBad date,32/13/2026,,Studio,100,\nNo venue,01/01/2027,,,100,')));
  assert.equal(rows.length, 1); assert.equal(rows[0].starts_at, '2026-12-25T04:30:00.000Z'); assert.equal(rows[0].status, 'published'); assert.equal(rows[0].price_paise, 230000); assert.equal(rows[0].venue_name, 'Tbb Studio'); assert.equal(errors.length, 2);
});
test('customers sheet: old Wix export style columns, duplicates by email merged', () => {
  const { rows, errors } = readSheet(SPECS.customers, C.toObjects(C.parseCSV('First name,Last name,Email,Phone,Source\nanita,RAO,Anita@X.com,9876543210,wix\nAnita,Rao,anita@x.com,,\nNo Email,,,,\nBroken,Mail,not-an-email,,')));
  assert.equal(errors.length, 1); assert.match(errors[0].message, /does not look right/); const a = rows.find((r) => r.email === 'anita@x.com'); assert.equal(a.name, 'Anita Rao'); assert.equal(rows.length, 2, 'two rows with the same email become one, and the row with no email is kept');
});
test('classes sheet', () => {
  const { rows } = readSheet(SPECS.classes, C.toObjects(C.parseCSV('Course name,Level,Type,Price,Covers\nHandwriting and Calligraphy,Level 2,Calligraphy,10000,Brush lettering | Dip pen')));
  assert.equal(rows[0].track, 'Calligraphy'); assert.equal(rows[0].price_paise, 1000000); assert.deepEqual(rows[0].covers, ['Brush lettering', 'Dip pen']); assert.equal(rows[0].sessions, 8);
});
