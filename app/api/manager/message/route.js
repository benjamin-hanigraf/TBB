import { q, requireAdmin, dbReady } from '@/lib/server/db';
import { sendEmail, emailReady, messageEmail } from '@/lib/server/email';
import { rateLimit, sameOrigin, readJson, str, isEmail, json } from '@/lib/server/guard';
export const runtime = 'nodejs';
const UUID = /^[0-9a-f-]{36}$/i;
// Owner-only: emails everyone who has paid for a workshop.
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'admin-message', 10)) return json({ error: 'slow_down' }, 429);
  if (!dbReady()) return json({ error: 'not_configured' }, 503);
  const admin = await requireAdmin(req).catch(() => null); if (!admin) return json({ error: 'forbidden' }, 403);
  if (!emailReady()) return json({ error: 'email_not_set_up' }, 503);
  let b; try { b = await readJson(req, 8000); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  const subject = str(b.subject, 120), body = String(b.message || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, 3000);
  if (!UUID.test(b.id) || subject.length < 3 || body.length < 5) return json({ error: 'bad_request' }, 400);
  let rows = [];
  if (b.audience === 'workshop') rows = await q(`bookings?workshop_id=eq.${b.id}&status=eq.paid&select=name,email`);
  else return json({ error: 'bad_request' }, 400);
  const seen = new Set(); const list = (rows || []).filter((r) => isEmail(String(r.email || '').toLowerCase()) && !seen.has(r.email.toLowerCase()) && seen.add(r.email.toLowerCase())).slice(0, 200);
  let sent = 0, failed = 0; for (const r of list) { try { await sendEmail(messageEmail({ to: r.email, subject, body, name: r.name })); sent++; } catch { failed++; } }
  return json({ ok: true, sent, failed, skipped: (rows || []).length - list.length });
}
