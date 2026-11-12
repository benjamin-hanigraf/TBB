import { q, requireAdmin, dbReady } from '@/lib/server/db';
import { refundPayment, razorpayReady } from '@/lib/server/razorpay';
import { sendEmail, cancellationEmail } from '@/lib/server/email';
import { rateLimit, sameOrigin, readJson, str, json, iso } from '@/lib/server/guard';
export const runtime = 'nodejs';
const UUID = /^[0-9a-f-]{36}$/i;
const KINDS = { booking: { table: 'bookings', select: '*,workshops(title)', title: (r) => r.workshops?.title || 'Your workshop', category: 'Workshops' }, enrolment: { table: 'class_enrolments', select: '*,class_levels(title,level)', title: (r) => `${r.class_levels?.title || 'Your class'}${r.class_levels?.level ? `, ${r.class_levels.level}` : ''}`, category: 'Classes' } };
// Owner-only: refunds the chosen paid bookings or enrolments. Online payments go back through Razorpay; payments taken in cash or UPI are only marked, because the owner returns that money herself.
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'admin-refund', 10)) return json({ error: 'slow_down' }, 429);
  if (!dbReady()) return json({ error: 'not_configured' }, 503);
  const admin = await requireAdmin(req).catch(() => null); if (!admin) return json({ error: 'forbidden' }, 403);
  let b; try { b = await readJson(req, 8000); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  const k = KINDS[b.kind]; const ids = Array.isArray(b.ids) ? [...new Set(b.ids.filter((x) => UUID.test(x)))].slice(0, 100) : []; if (!k || !ids.length) return json({ error: 'bad_request' }, 400);
  const reason = str(b.reason, 200); const results = [];
  for (const id of ids) {
    try {
      const [r] = await q(`${k.table}?id=eq.${id}&select=${encodeURIComponent(k.select)}`); if (!r) { results.push({ id, ok: false, error: 'Not found' }); continue; }
      if (r.status !== 'paid') { results.push({ id, ok: false, error: `Already ${r.status}` }); continue; }
      let mode = 'manual';
      if (r.razorpay_payment_id) { if (!razorpayReady()) { results.push({ id, ok: false, error: 'Razorpay is not connected' }); continue; } await refundPayment(r.razorpay_payment_id, r.amount_paise, reason || 'Cancelled by the studio'); mode = 'razorpay'; }
      await q(`${k.table}?id=eq.${id}&status=eq.paid`, { method: 'PATCH', body: { status: 'refunded' } });
      try { await q('ledger_entries', { method: 'POST', prefer: 'return=minimal', body: { entry_date: iso(), kind: 'out', category: 'Refunds', description: `Refund: ${k.title(r)}`, amount_paise: r.amount_paise, gst_paise: r.gst_paise || 0, method: mode === 'razorpay' ? 'razorpay' : (r.payment_method || 'other'), party: r.name, source: 'refund', source_id: id } }); } catch (e) { if (e.detail?.code !== '23505') console.error('refund ledger', e.message); }
      if (r.email) { try { await sendEmail(cancellationEmail({ to: r.email, name: r.name, what: k.title(r), refunded: mode, reason })); } catch (e) { console.error('refund email', e.message); } }
      results.push({ id, ok: true, mode });
    } catch (e) { console.error('refund', e.message, e.detail); results.push({ id, ok: false, error: e.detail?.error?.description || e.message || 'Failed' }); }
  }
  return json({ ok: true, results });
}
