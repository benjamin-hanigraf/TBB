import { dbReady } from '@/lib/server/db';
import { rateLimit, sameOrigin, readJson, str, json } from '@/lib/server/guard';
import { isPin, verifyPin, makeRecord, pinVersion, makeToken, checkToken, getRec, setRec, isLocked, nextFailState } from '@/lib/server/pin';
import { mintOwnerSession } from '@/lib/server/owner';
export const runtime = 'nodejs';
const OWNER = 'owner';
// The only way into the Manager app: a 4-digit PIN. Right PIN: this device is remembered and the owner session is issued.
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'pin', 20)) return json({ error: 'slow_down' }, 429);
  if (!dbReady()) return json({ error: 'not_configured' }, 503);
  let b; try { b = await readJson(req, 2000); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  const device = str(b.device, 64); if (!device) return json({ error: 'bad_request' }, 400);
  try {
    const rec = await getRec('pin'); const version = pinVersion(rec); const trusted = checkToken(b.token, OWNER, device, version);
    if (b.action === 'status') return json({ trusted, defaultPin: !rec?.hash });
    if (b.action === 'session') { if (!trusted) return json({ error: 'forbidden' }, 401); return json({ ok: true, session: await mintOwnerSession() }); }
    if (b.action === 'verify' || b.action === 'change') {
      if (b.action === 'change' && !trusted) return json({ error: 'forbidden' }, 401);
      const lock = await getRec('lock'); const now = Date.now();
      if (isLocked(lock, now)) return json({ error: 'locked', retry_minutes: Math.ceil((lock.locked_until - now) / 60000) }, 429);
      if (!verifyPin(b.action === 'verify' ? b.pin : b.current, rec)) { await setRec('lock', nextFailState(lock, now)); return json({ error: 'wrong_pin' }, 401); }
      if (lock?.fails) await setRec('lock', { fails: 0, first_at: 0, locked_until: 0 });
      if (b.action === 'verify') return json({ ok: true, token: makeToken(OWNER, device, version), session: await mintOwnerSession(), defaultPin: !rec?.hash });
      if (!isPin(b.next)) return json({ error: 'invalid_pin' }, 400);
      const next = makeRecord(b.next, version + 1); await setRec('pin', next);
      return json({ ok: true, token: makeToken(OWNER, device, next.version) });            // every other device must enter the new PIN
    }
    return json({ error: 'bad_request' }, 400);
  } catch (e) { console.error('pin', e.message); return json({ error: 'server' }, 500); }
}
