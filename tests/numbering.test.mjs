import test from 'node:test'; import assert from 'node:assert/strict';
const N = await import('../lib/numbering.js');
test('numbers get their financial year and leading zeros', () => {
  assert.equal(N.formatNumber('TBB/YYYY-YY/####', 42, '2026-11-12'), 'TBB/2026-27/0042');
  assert.equal(N.formatNumber('TBB/YYYY-YY/####', 7, '2027-02-10'), 'TBB/2026-27/0007', 'January to March belong to the year that started in April');
  assert.equal(N.formatNumber('TBB/YYYY-YY/####', 7, '2027-04-01'), 'TBB/2027-28/0007');
  assert.equal(N.formatNumber('ORD-###', 12345, '2026-11-12'), 'ORD-12345', 'a number longer than the zeros is never cut');
  assert.equal(N.formatNumber('INV-YY-##', 3, '2026-11-12'), 'INV-26-03');
});
test('the format is checked', () => {
  assert.equal(N.validFormat('ORD-####'), ''); assert.match(N.validFormat('ORD'), /#/); assert.match(N.validFormat('A#-B#'), /one group/); assert.match(N.validFormat(' '), /type/);
});
test('older prefix settings still work', () => {
  assert.equal(N.formatFor('invoice', { invoice: { prefix: 'TBB/YYYY-YY' } }), 'TBB/YYYY-YY/###');
  assert.equal(N.formatFor('invoice', { invoice: { format: 'X-####', prefix: 'old' } }), 'X-####');
  assert.equal(N.formatFor('quotation', {}), 'TBB-Q/YYYY-YY/###'); assert.equal(N.formatFor('order', {}), 'ORD-####'); assert.equal(N.formatFor('order', { order: { format: 'bad' } }), 'ORD-####');
});
test('the next number follows the highest one used', () => {
  const f = 'TBB-Q/YYYY-YY/###'; const have = ['TBB-Q/2026-27/001', 'TBB-Q/2026-27/009', 'TBB-Q/2025-26/050', 'something else'];
  assert.equal(N.nextNumberInList(have, f, '2026-11-12', 1), 'TBB-Q/2026-27/010'); assert.equal(N.nextNumberInList(have, f, '2026-11-12', 100), 'TBB-Q/2026-27/100');
  assert.equal(N.nextNumberInList([], f, '2026-11-12', 1), 'TBB-Q/2026-27/001'); assert.equal(N.nextNumberInList(have, f, '2027-04-02', 1), 'TBB-Q/2027-28/001', 'a new financial year starts again');
});
test('an order shows its number in the chosen format', () => {
  assert.equal(N.orderNumber({ order_no: 7, created_at: '2026-11-12T05:00:00Z' }, { order: { format: 'TBB-ORD-####' } }), 'TBB-ORD-0007'); assert.equal(N.orderNumber({ created_at: 'x' }, {}), '');
});
