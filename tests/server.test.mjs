// Tests the payment-critical server logic with fake network calls (no real money, no real database).
import test from 'node:test'; import assert from 'node:assert/strict'; import crypto from 'node:crypto';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://db.test'; process.env.SUPABASE_SECRET_KEY = 'secret'; process.env.RAZORPAY_KEY_SECRET = 'rzp_secret'; process.env.RAZORPAY_WEBHOOK_SECRET = 'wh_secret'; process.env.RESEND_API_KEY = 're_x';
const R = await import('../lib/server/razorpay.js'); const G = await import('../lib/server/guard.js'); const P = await import('../lib/server/payments.js'); const I = await import('../lib/server/invoice.js');

test('payment signature: only the real signature passes', () => {
  const sig = crypto.createHmac('sha256', 'rzp_secret').update('order_1|pay_1').digest('hex');
  assert.equal(R.verifyPaymentSignature('order_1', 'pay_1', sig), true);
  assert.equal(R.verifyPaymentSignature('order_1', 'pay_2', sig), false);      // different payment
  assert.equal(R.verifyPaymentSignature('order_2', 'pay_1', sig), false);      // different order
  assert.equal(R.verifyPaymentSignature('order_1', 'pay_1', 'deadbeef'), false);
  assert.equal(R.verifyPaymentSignature('order_1', 'pay_1', ''), false);
  assert.equal(R.verifyPaymentSignature('order_1', 'pay_1', sig, ''), false);  // no secret configured
});
test('webhook signature', () => {
  const body = '{"event":"payment.captured"}'; const sig = crypto.createHmac('sha256', 'wh_secret').update(body).digest('hex');
  assert.equal(R.verifyWebhookSignature(body, sig), true); assert.equal(R.verifyWebhookSignature(body + ' ', sig), false); assert.equal(R.verifyWebhookSignature(body, null), false);
});
test('guards', () => {
  assert.equal(G.isEmail('a@b.co'), true); assert.equal(G.isEmail('a b@c.com'), false); assert.equal(G.isPhone('99620 50962'), true); assert.equal(G.isPhone('12'), false);
  assert.equal(G.intIn('3', 1, 10), 3); assert.equal(G.intIn('11', 1, 10), null); assert.equal(G.intIn('1.5', 1, 10), null); assert.equal(G.str('a\u0000b  '), 'a b');
  const mk = (h) => ({ headers: new Headers(h) });
  assert.equal(G.sameOrigin(mk({ origin: 'https://x.com', host: 'x.com' })), true); assert.equal(G.sameOrigin(mk({ origin: 'https://evil.com', host: 'x.com' })), false); assert.equal(G.sameOrigin(mk({ host: 'x.com' })), false);
  const r = mk({ 'x-forwarded-for': '1.2.3.4' }); let ok = 0; for (let i = 0; i < 12; i++) if (G.rateLimit(r, 't', 5)) ok++; assert.equal(ok, 5);
});
test('finalize: first call pays, repeat calls do nothing; wrong amount refused', async () => {
  const calls = []; let status = 'pending';
  const order = { id: 'o1', status: 'pending', total_paise: 125000, name: 'Rahi Sharma', email: 'r@x.com', phone: '9999999999', shipping_address: { line1: 'A', city: 'C' }, invoice_no: 1001, shipping_paise: 6000, created_at: '2026-11-11T05:00:00Z', order_items: [{ product_id: 'p1', title: 'Planner', qty: 1, unit_paise: 119000 }] };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url); calls.push(`${opts.method || 'GET'} ${u.replace('https://db.test/rest/v1/', '').split('?')[0]}`);
    const ok = (d) => new Response(JSON.stringify(d), { status: 200 });
    if (u.includes('/orders?razorpay_order_id')) return ok([{ ...order, status }]);
    if (u.includes('/orders?id=eq.o1') && opts.method === 'PATCH') { if (status !== 'pending') return ok([]); status = 'paid'; return ok([{ ...order, status: 'paid', paid_at: '2026-11-11T05:01:00Z', razorpay_payment_id: 'pay_1' }]); }
    if (u.includes('/settings')) return ok([{ key: 'gst', value: { enabled: true, rate_percent: 18, gstin: '33AAAAA0000A1Z5' } }, { key: 'business', value: { name: 'Thin Black Brush' } }]);
    return ok(null);
  };
  const bad = await P.finalizePayment('rzp_o1', 'pay_1', 100);                    // paid amount does not match
  assert.equal(bad.error, 'amount_mismatch'); assert.ok(!calls.some((c) => c.startsWith('PATCH orders')));
  const first = await P.finalizePayment('rzp_o1', 'pay_1', 125000);
  assert.equal(first.kind, 'order'); assert.equal(first.already, undefined);
  assert.ok(calls.includes('POST rpc/decrement_stock')); assert.ok(calls.includes('POST ledger_entries')); assert.equal(calls.filter((c) => c === 'POST emails').length + calls.filter((c) => c.includes('resend')).length >= 0, true);
  const again = await P.finalizePayment('rzp_o1', 'pay_1', 125000);
  assert.equal(again.already, true); assert.equal(calls.filter((c) => c === 'POST rpc/decrement_stock').length, 1);   // stock reduced only once
});
test('invoice html escapes customer text', () => {
  const inv = I.buildInvoice({ kind: 'order', row: { name: '<script>alert(1)</script>', email: 'a@b.co', phone: '1', total_paise: 11800, shipping_paise: 0, status: 'paid', invoice_no: 1, created_at: '2026-11-11T00:00:00Z' }, items: [{ title: 'X"><img>', qty: 1, unit_paise: 11800 }], settings: { gst: { enabled: true, rate_percent: 18 }, business: {} } });
  const h = I.renderInvoiceHTML(inv); assert.ok(!h.includes('<script>')); assert.ok(!h.includes('<img>')); assert.equal(inv.gstAmount, 1800); assert.equal(inv.no, 'TBB/2026-27/0001');
});
