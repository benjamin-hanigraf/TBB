import test from 'node:test'; import assert from 'node:assert/strict';
import * as A from '../lib/accounting.js';
test('financial year runs April to March', () => {
  assert.equal(A.fyOf('2026-04-01'), '2026-27'); assert.equal(A.fyOf('2027-03-31'), '2026-27');
  assert.equal(A.fyOf('2026-03-31'), '2025-26'); assert.equal(A.fyOf('2026-11-11'), '2026-27');
  assert.deepEqual(A.fyRange('2026-27'), { start: '2026-04-01', end: '2027-03-31' });
  assert.equal(A.fyOf('2099-12-31'), '2099-00'); // century wrap is formatted, not crashed
});
test('GST inside and on top', () => {
  assert.equal(A.gstInside(118000, 18), 18000); assert.equal(A.gstOnTop(100000, 18), 18000); assert.equal(A.gstInside(500, 0), 0);
  const h = A.gstHalves(18001); assert.equal(h.cgst + h.sgst, 18001);
});
test('invoice totals', () => {
  const t = A.invoiceTotals([{ qty: 2, unit_paise: 230000 }, { qty: 1, unit_paise: 45000 }], 5000, true, 18);
  assert.equal(t.subtotal, 505000); assert.equal(t.taxable, 500000); assert.equal(t.gst, 90000); assert.equal(t.total, 590000);
  assert.equal(A.invoiceTotals([{ qty: 1, unit_paise: 1000 }], 99999, false).total, 0);   // discount cannot exceed subtotal
});
test('invoice numbers count up per financial year', () => {
  assert.equal(A.nextInvoiceNo([], 'TBB/YYYY-YY', '2026-11-11'), 'TBB/2026-27/001');
  assert.equal(A.nextInvoiceNo(['TBB/2026-27/001', 'TBB/2026-27/009', 'TBB/2025-26/050'], 'TBB/YYYY-YY', '2026-12-01'), 'TBB/2026-27/010');
  assert.equal(A.nextInvoiceNo(['TBB/2026-27/009'], 'TBB/YYYY-YY', '2027-04-02'), 'TBB/2027-28/001');
});
test('summary: profit, categories and GST', () => {
  const e = [
    { entry_date: '2026-10-31', kind: 'in', category: 'Workshops', amount_paise: 230000, gst_paise: 35085 },
    { entry_date: '2026-11-02', kind: 'in', category: 'Store sales', amount_paise: 80000, gst_paise: 0 },
    { entry_date: '2026-11-03', kind: 'out', category: 'Materials and supplies', amount_paise: 50000, gst_paise: 7627 },
    { entry_date: '2026-03-30', kind: 'in', category: 'Workshops', amount_paise: 999999, gst_paise: 0 }, // previous FY, ignored
  ];
  const s = A.summarise(e, '2026-27');
  assert.equal(s.moneyIn, 310000); assert.equal(s.moneyOut, 50000); assert.equal(s.profit, 260000);
  assert.equal(s.gstCollected, 35085); assert.equal(s.gstPaid, 7627); assert.equal(s.gstPayable, 27458);
  assert.equal(s.inByCategory[0].category, 'Workshops'); assert.equal(s.months.length, 2); assert.equal(s.months[1].profit, 30000);
});
test('calculator', () => {
  assert.equal(A.calc.markupPrice(10000, 50), 15000); assert.equal(Math.round(A.calc.marginPct(10000, 15000)), 33);
  assert.equal(A.calc.priceForMargin(6000, 40), 10000); assert.equal(A.calc.discounted(80000, 10), 72000);
  assert.equal(A.calc.breakEvenUnits(100000, 8000, 3000), 20); assert.equal(A.calc.breakEvenUnits(1, 100, 200), Infinity);
});
test('money parsing and CSV', () => {
  assert.equal(A.rupeesToPaise('₹1,650.50'), 165050); assert.equal(A.rupeesToPaise('abc'), 0); assert.equal(A.money(165000), '₹1,650');
  assert.equal(A.csvEscape('a,"b"'), '"a,""b"""');
});
