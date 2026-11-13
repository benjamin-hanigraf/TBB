import { requireAdmin, dbReady } from '@/lib/server/db';
import { loadReceipt } from '@/lib/server/receipt';
import { rateLimit, sameOrigin, readJson, json } from '@/lib/server/guard';
export const runtime = 'nodejs';
const UUID = /^[0-9a-f-]{36}$/i;
// Owner-only: the receipt page data for an order, workshop booking or class enrolment, so the Manager can show it in a window and make a PDF.
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'admin-receipt', 30)) return json({ error: 'slow_down' }, 429);
  if (!dbReady()) return json({ error: 'not_configured' }, 503);
  const admin = await requireAdmin(req).catch(() => null); if (!admin) return json({ error: 'forbidden' }, 403);
  let b; try { b = await readJson(req, 1000); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  if (!UUID.test(b.id || '')) return json({ error: 'bad_request' }, 400);
  const r = await loadReceipt(b.id, { manager: true }).catch(() => null); if (!r) return json({ error: 'not_found' }, 404);
  return json({ ok: true, ...r });
}
