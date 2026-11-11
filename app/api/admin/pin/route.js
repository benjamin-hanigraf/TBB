import { q, requireAdmin, dbReady } from '@/lib/server/db';
import { rateLimit, sameOrigin, readJson, str, json } from '@/lib/server/guard';
import { isPin, verifyPin, makeRecord, pinVersion, makeToken, checkToken, locked, noteFail, clearFails } from '@/lib/server/pin';
export const runtime = 'nodejs';
async function record() { const r = await q('settings?key=eq.admin_pin&select=value'); return r?.[0]?.value; }
// Owner-only. Checks the device PIN, remembers trusted devices, and lets the owner change the PIN.
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'pin', 30)) return json({ error: 'slow_down' }, 429);
  if (!dbReady()) return json({ error: 'not_configured' }, 503);
  const admin = await requireAdmin(req).catch(() => null); if (!admin) return json({ error: 'forbidden' }, 403);
  let b; try { b = await readJson(req, 2000); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  const device = str(b.device, 64); if (!device) return json({ error: 'bad_request' }, 400);
  try {
    const rec = await record(); const version = pinVersion(rec);
    if (b.action === 'status') return json({ trusted: checkToken(b.token, admin.id, device, version), defaultPin: !rec?.hash });
    if (b.action === 'verify' || b.action === 'change') {
      if (locked(admin.id)) return json({ error: 'locked' }, 429);
      const given = b.action === 'verify' ? b.pin : b.current;
      if (!verifyPin(given, rec)) { noteFail(admin.id); return json({ error: 'wrong_pin' }, 401); }
      clearFails(admin.id);
      if (b.action === 'verify') return json({ ok: true, token: makeToken(admin.id, device, version), defaultPin: !rec?.hash });
      if (!isPin(b.next)) return json({ error: 'invalid_pin' }, 400);
      const next = makeRecord(b.next, version + 1);
      await q('settings?on_conflict=key', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { key: 'admin_pin', value: next, is_public: false } });
      return json({ ok: true, token: makeToken(admin.id, device, next.version) });          // every other device must enter the new PIN
    }
    return json({ error: 'bad_request' }, 400);
  } catch (e) { console.error('pin', e.message); return json({ error: 'server' }, 500); }
}
