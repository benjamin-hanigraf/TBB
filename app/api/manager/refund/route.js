import { requireAdmin, dbReady } from '@/lib/server/db';
import { refundItems, KINDS } from '@/lib/server/refunds';
import { rateLimit, sameOrigin, readJson, json } from '@/lib/server/guard';
export const runtime = 'nodejs';
const UUID = /^[0-9a-f-]{36}$/i;
// Owner-only: refunds paid bookings, class enrolments or orders, online or as "I sent it back myself". See lib/server/refunds.js.
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'admin-refund', 10)) return json({ error: 'slow_down' }, 429);
  if (!dbReady()) return json({ error: 'not_configured' }, 503);
  const admin = await requireAdmin(req).catch(() => null); if (!admin) return json({ error: 'forbidden' }, 403);
  let b; try { b = await readJson(req, 8000); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  const ids = Array.isArray(b.ids) ? [...new Set(b.ids.filter((x) => UUID.test(x)))].slice(0, 100) : []; const how = b.how === 'online' ? 'online' : b.how === 'sent' ? 'sent' : null;
  if (!KINDS[b.kind] || !ids.length || !how) return json({ error: 'bad_request' }, 400);
  const results = await refundItems({ ...b, ids, how, restock: b.restock === true });
  return json({ ok: true, results });
}
