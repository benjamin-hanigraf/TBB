import { q, requireAdmin, getSettings, dbReady } from '@/lib/server/db';
import { sendEmail, shippedEmail, invoiceEmail } from '@/lib/server/email';
import { rateLimit, sameOrigin, readJson, str, isEmail, json } from '@/lib/server/guard';
import { cleanEmail } from '@/lib/format';
import { buildManualInvoice } from '@/lib/server/invoice';
export const runtime = 'nodejs';
const UUID = /^[0-9a-f-]{36}$/i;
// Owner-only: emails a shipping update or an invoice to a customer.
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'admin-email', 30)) return json({ error: 'slow_down' }, 429);
  if (!dbReady()) return json({ error: 'not_configured' }, 503);
  const admin = await requireAdmin(req).catch(() => null); if (!admin) return json({ error: 'forbidden' }, 403);
  let b; try { b = await readJson(req, 5000); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  try {
    if (b.type === 'shipped' && UUID.test(b.order_id)) {
      const [o] = await q(`orders?id=eq.${b.order_id}&select=name,email,tracking_carrier,tracking_number`); if (!o) return json({ error: 'not_found' }, 404);
      await sendEmail(shippedEmail(o, o.tracking_carrier, o.tracking_number)); return json({ ok: true });
    }
    if (b.type === 'invoice' && UUID.test(b.invoice_id)) {
      const [i] = await q(`invoices?id=eq.${b.invoice_id}&select=*`); if (!i) return json({ error: 'not_found' }, 404);
      const to = cleanEmail(str(b.to || i.customer_email)); if (!isEmail(to)) return json({ error: 'invalid_email' }, 400);
      const st = await getSettings(); const inv = buildManualInvoice(i, st, to);
      await sendEmail(invoiceEmail(inv, to, str(b.note, 500))); await q(`invoices?id=eq.${i.id}&status=eq.draft`, { method: 'PATCH', body: { status: 'sent' } }); return json({ ok: true });
    }
    return json({ error: 'bad_request' }, 400);
  } catch (e) { console.error('admin email', e.message); return json({ error: 'email_failed' }, 502); }
}
