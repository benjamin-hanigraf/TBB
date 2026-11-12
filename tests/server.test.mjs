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
  assert.ok(calls.includes('POST rpc/order_stock_internal'), 'stock is taken through the function that remembers how much'); assert.ok(calls.includes('POST ledger_entries')); assert.ok(calls.includes('POST customers'), 'the buyer is added to the customers list'); assert.equal(calls.filter((c) => c === 'POST emails').length + calls.filter((c) => c.includes('resend')).length >= 0, true);
  const again = await P.finalizePayment('rzp_o1', 'pay_1', 125000);
  assert.equal(again.already, true); assert.equal(calls.filter((c) => c === 'POST rpc/order_stock_internal').length, 1);   // stock reduced only once
});
test('invoice html escapes customer text', () => {
  const inv = I.buildInvoice({ kind: 'order', row: { name: '<script>alert(1)</script>', email: 'a@b.co', phone: '1', total_paise: 11800, shipping_paise: 0, status: 'paid', invoice_no: 1, created_at: '2026-11-11T00:00:00Z' }, items: [{ title: 'X"><img>', qty: 1, unit_paise: 11800 }], settings: { gst: { enabled: true, rate_percent: 18 }, business: {} } });
  const h = I.renderInvoiceHTML(inv); assert.ok(!h.includes('<script>')); assert.ok(!h.includes('<img>')); assert.equal(inv.gstAmount, 1800); assert.equal(inv.no, 'TBB/2026-27/001');
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
  let st; const t0 = 1_000_000_000_000;
  for (let i = 1; i <= 4; i++) { st = N.nextFailState(st, t0 + i); assert.equal(N.isLocked(st, t0 + i), false, `try ${i} is not locked`); }
  st = N.nextFailState(st, t0 + 5); assert.equal(N.isLocked(st, t0 + 6), true, '5th wrong PIN locks'); assert.equal(N.isLocked(st, t0 + 16 * 60e3), false, '15 minutes later it opens');
  for (let i = 6; i <= 10; i++) st = N.nextFailState(st, t0 + 20 * 60e3 + i); assert.ok(st.locked_until - (t0 + 20 * 60e3) >= 3600e3 - 1000, '10 wrong tries lock for an hour');
  for (let i = 11; i <= 15; i++) st = N.nextFailState(st, t0 + 3 * 3600e3 + i); assert.ok(st.locked_until - (t0 + 3 * 3600e3) >= 24 * 3600e3 - 1000, '15 wrong tries lock for a day');
  assert.equal(N.nextFailState(st, t0 + 3 * 864e5).fails, 1, 'counting starts fresh after a quiet day');
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
  const b = await P.finalizePayment('rzp_e1', 'pay_9', 600000); assert.equal(b.already, true); assert.equal(calls.filter((c) => c === 'POST ledger_entries').length, 2, 'accounts entries (income and gateway fee) only once');
});

test('receipts link the studio address to Google Maps', () => {
  const inv = I.buildInvoice({ kind: 'order', row: { name: 'A', email: 'a@b.co', phone: '1', total_paise: 100, shipping_paise: 0, status: 'paid', invoice_no: 1, created_at: '2026-11-11T00:00:00Z' }, items: [{ title: 'X', qty: 1, unit_paise: 100 }], settings: { business: { address: '2nd Floor, Chennai' } } });
  const h = I.renderInvoiceHTML(inv); assert.ok(h.includes('href="https://maps.app.goo.gl/WMv8SSuAmd6C3mjK7"')); assert.ok(h.includes('2nd Floor, Chennai'));
});

test('owner session: creates the owner once, signs in, makes it admin', async () => {
  const O = await import('../lib/server/owner.js'); process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'pub'; const calls = []; let created = false;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url); calls.push(`${opts.method || 'GET'} ${u.replace('https://db.test', '').split('?')[0]}`); const ok = (d, st = 200) => new Response(JSON.stringify(d), { status: st });
    if (u.includes('/auth/v1/token')) { const b = JSON.parse(opts.body); assert.equal(b.email, 'tbb-studio-owner@example.com'); assert.ok(b.password.length >= 40, 'strong derived password'); return created ? ok({ access_token: 'AT', refresh_token: 'RT', user: { id: 'owner-id' } }) : ok({ error: 'invalid' }, 400); }
    if (u.endsWith('/auth/v1/admin/users')) { created = true; assert.equal(JSON.parse(opts.body).email_confirm, true); return ok({ id: 'owner-id' }); }
    if (u.includes('/profiles?id=eq.owner-id')) { assert.equal(JSON.parse(opts.body).role, 'admin'); return ok([{ id: 'owner-id' }]); }
    return ok(null);
  };
  const s = await O.mintOwnerSession(); assert.deepEqual(s, { access_token: 'AT', refresh_token: 'RT' }); assert.ok(calls.includes('POST /auth/v1/admin/users'), 'created on first use');
  calls.length = 0; await O.mintOwnerSession(); assert.ok(!calls.includes('POST /auth/v1/admin/users'), 'not created again');
});

const F = await import('../lib/server/refunds.js');
function fakeDb(row, { refundFails = false } = {}) {
  const calls = []; let status = row.status; const ledger = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url); const m = opts.method || 'GET'; calls.push(`${m} ${u.replace('https://db.test/rest/v1/', '').split('?')[0]}`);
    const ok = (d) => new Response(JSON.stringify(d), { status: 200 });
    if (u.includes('api.razorpay.com') && u.includes('/refunds')) return refundFails ? new Response(JSON.stringify({ error: { description: 'Refund window over' } }), { status: 400 }) : ok({ id: 'rfnd_1' });
    if (u.includes(`/orders?id=eq.${row.id}`) && m === 'GET') return ok([{ ...row, status }]);
    if (u.includes(`/orders?id=eq.${row.id}`) && m === 'PATCH') { const want = /status=eq\.(\w+)/.exec(u)?.[1]; if (want && want !== status) return ok([]); status = JSON.parse(opts.body).status; return ok([{ ...row, status }]); }
    if (u.includes('/ledger_entries') && m === 'POST') { ledger.push(JSON.parse(opts.body)); return ok(null); }
    return ok(null);
  };
  return { calls, ledger, status: () => status };
}
const order = { id: '11111111-1111-1111-1111-111111111111', status: 'delivered', total_paise: 90000, name: 'Meera', email: 'm@x.com', invoice_no: 1005, payment_method: 'upi', order_items: [{ gst_paise: 0 }] };

test('refund sent back by hand: recorded with the chosen method, stock returned, once only', async () => {
  const db = fakeDb(order);
  const [r] = await F.refundItems({ kind: 'order', ids: [order.id], how: 'sent', method: 'bank', notify: false });
  assert.equal(r.ok, true); assert.equal(db.status(), 'refunded');
  assert.equal(db.ledger.length, 1); assert.equal(db.ledger[0].method, 'bank', 'the method chosen, not the payment provider'); assert.equal(db.ledger[0].amount_paise, 90000); assert.equal(db.ledger[0].kind, 'out');
  assert.ok(db.calls.includes('POST rpc/order_stock_internal'), 'stock is given back');
  const [again] = await F.refundItems({ kind: 'order', ids: [order.id], how: 'sent', method: 'bank', notify: false });
  assert.equal(again.ok, false); assert.equal(db.ledger.length, 1, 'no second refund entry');
});
test('online refund: only for online payments; if the provider says no, nothing changes', async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_key';
  let db = fakeDb(order);
  const [notOnline] = await F.refundItems({ kind: 'order', ids: [order.id], how: 'online', notify: false });
  assert.equal(notOnline.ok, false); assert.equal(db.status(), 'delivered');
  db = fakeDb({ ...order, razorpay_payment_id: 'pay_9' }, { refundFails: true });
  const [failed] = await F.refundItems({ kind: 'order', ids: [order.id], how: 'online', notify: false });
  assert.equal(failed.ok, false); assert.match(failed.error, /Refund window over/); assert.equal(db.status(), 'delivered', 'status put back'); assert.equal(db.ledger.length, 0);
  db = fakeDb({ ...order, razorpay_payment_id: 'pay_9' });
  const [done] = await F.refundItems({ kind: 'order', ids: [order.id], how: 'online', notify: false });
  assert.equal(done.ok, true); assert.equal(db.ledger[0].method, 'razorpay'); delete process.env.RAZORPAY_KEY_ID;
});
