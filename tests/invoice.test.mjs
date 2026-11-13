import assert from 'node:assert/strict'; import { test } from 'node:test'; import { calcInvoice } from '../lib/invoiceCalc.js'; import { nextNumberInList, formatNumber } from '../lib/numbering.js';
test('a blank quantity counts as one and hides the Qty column when blank everywhere', () => {
  const a = calcInvoice([{ desc: 'Design', qty: null, unit_paise: 500000 }], 0, false); assert.equal(a.total, 500000); assert.equal(a.noQty, true);
  const b = calcInvoice([{ desc: 'Design', qty: null, unit_paise: 500000 }, { desc: 'Prints', qty: 3, unit_paise: 10000 }], 0, false); assert.equal(b.total, 530000); assert.equal(b.noQty, false);
  const c = calcInvoice([{ desc: 'Prints', qty: 2, unit_paise: 10000 }], 0, false); assert.equal(c.total, 20000); assert.equal(c.noQty, false);
});
test('the suggested number follows the series', () => {
  assert.equal(nextNumberInList(['TBB/2026-27/003', 'TBB/2026-27/004'], 'TBB/YYYY-YY/###', '2026-11-12', 1), 'TBB/2026-27/005');
  assert.equal(formatNumber('TBB/YYYY-YY/###', 42, '2026-11-12'), 'TBB/2026-27/042');
});
