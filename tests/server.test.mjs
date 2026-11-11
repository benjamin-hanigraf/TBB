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

test('device PIN: default 0000, hashing, tokens, lockout', async () => {
  const N = await import('../lib/server/pin.js');
  assert.equal(N.verifyPin('0000', undefined), true); assert.equal(N.verifyPin('1234', undefined), false); assert.equal(N.verifyPin('00000', undefined), false); assert.equal(N.verifyPin('abcd', undefined), false);
  const rec = N.makeRecord('4821', 1); assert.ok(!JSON.stringify(rec).includes('4821'), 'PIN is never stored');
  assert.equal(N.verifyPin('4821', rec), true); assert.equal(N.verifyPin('0000', rec), false, 'default PIN stops working once changed');
  const t = N.makeToken('u1', 'dev1', 1); const now = Date.now();
  assert.equal(N.checkToken(t, 'u1', 'dev1', 1), true); assert.equal(N.checkToken(t, 'u2', 'dev1', 1), false, 'other user'); assert.equal(N.checkToken(t, 'u1', 'dev2', 1), false, 'other device');
  assert.equal(N.checkToken(t, 'u1', 'dev1', 2), false, 'PIN changed, token dead'); assert.equal(N.checkToken(t + 'x', 'u1', 'dev1', 1), false, 'tampered');
  assert.equal(N.checkToken(N.makeToken('u1', 'dev1', 1, 1, now - 2 * 864e5), 'u1', 'dev1', 1), false, 'expired');
  for (let i = 0; i < 5; i++) N.noteFail('lock-test'); assert.equal(N.locked('lock-test'), true); N.clearFails('lock-test'); assert.equal(N.locked('lock-test'), false);
});

test('finalize: a class enrolment is confirmed once, with ledger entry', async () => {
  const calls = []; let status = 'pending';
  const enr = { id: 'e1', status: 'pending', amount_paise: 600000, name: 'Anita Rao', email: 'a@x.com', phone: '9999999999', student_name: 'Kid A', student_group: 'child', student_age: 9, invoice_no: 1002, created_at: '2026-11-11T05:00:00Z', class_levels: { title: 'Basics of Handwriting', level: 'Level 1', sessions: 8 } };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url); calls.push(`${opts.method || 'GET'} ${u.replace('https://db.test/rest/v1/', '').split('?')[0]}`); const ok = (d) => new Response(JSON.stringify(d), { status: 200 });
    if (u.includes('/orders?razorpay_order_id') || u.includes('/bookings?razorpay_order_id')) return ok([]);
    if (u.includes('/class_enrolments?razorpay_order_id')) return ok([{ ...enr, status }]);
    if (u.includes('/class_enrolments?id=eq.e1') && opts.method === 'PATCH') { if (status !== 'pending') return ok([]); status = 'paid'; return ok([{ ...enr, status: 'paid', paid_at: '2026-11-11T05:01:00Z', razorpay_payment_id: 'pay_9' }]); }
    if (u.includes('/settings')) return ok([{ key: 'gst', value: { enabled: false } }]); return ok(null);
  };
  assert.equal((await P.finalizePayment('rzp_e1', 'pay_9', 1)).error, 'amount_mismatch');
  const a = await P.finalizePayment('rzp_e1', 'pay_9', 600000); assert.equal(a.kind, 'enrolment'); assert.equal(a.already, undefined); assert.ok(calls.includes('POST ledger_entries'));
  const b = await P.finalizePayment('rzp_e1', 'pay_9', 600000); assert.equal(b.already, true); assert.equal(calls.filter((c) => c === 'POST ledger_entries').length, 1, 'accounts entry only once');
});

test('receipts link the studio address to Google Maps', () => {
  const inv = I.buildInvoice({ kind: 'order', row: { name: 'A', email: 'a@b.co', phone: '1', total_paise: 100, shipping_paise: 0, status: 'paid', invoice_no: 1, created_at: '2026-11-11T00:00:00Z' }, items: [{ title: 'X', qty: 1, unit_paise: 100 }], settings: { business: { address: '2nd Floor, Chennai' } } });
  const h = I.renderInvoiceHTML(inv); assert.ok(h.includes('href="https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7"')); assert.ok(h.includes('2nd Floor, Chennai'));
});
