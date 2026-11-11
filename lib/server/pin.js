// Device PIN for the admin app. The PIN itself is never stored: only a salted scrypt hash. Until she changes it, the PIN is 0000.
import crypto from 'node:crypto';
export const DEFAULT_PIN = '0000';
const sec = () => crypto.createHash('sha256').update('tbb-pin|' + (process.env.SUPABASE_SECRET_KEY || '')).digest();
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
export const isPin = (v) => /^\d{4}$/.test(String(v ?? ''));
export const newSalt = () => crypto.randomBytes(16).toString('hex');
export const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex');
export const makeRecord = (pin, version) => { const salt = newSalt(); return { salt, hash: hashPin(pin, salt), version }; };
/** rec = saved record, or undefined while the default PIN is still in use */
export const pinVersion = (rec) => (rec?.version ?? 0);
export const verifyPin = (pin, rec) => isPin(pin) && (rec?.hash ? eq(hashPin(pin, rec.salt), rec.hash) : eq(pin, DEFAULT_PIN));
const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (payload) => crypto.createHmac('sha256', sec()).update(payload).digest('base64url');
export function makeToken(uid, device, version, days = 365, now = Date.now()) { const p = b64(`${uid}|${device}|${version}|${now + days * 864e5}`); return `${p}.${sign(p)}`; }
export function checkToken(token, uid, device, version, now = Date.now()) {
  const [p, s] = String(token || '').split('.'); if (!p || !s || !eq(sign(p), s)) return false;
  const [u, d, v, exp] = Buffer.from(p, 'base64url').toString().split('|');
  return u === uid && d === String(device) && Number(v) === version && Number(exp) > now;
}
// guess limiter: 5 wrong PINs, then locked for 15 minutes (per owner account)
const fails = new Map();
export const locked = (uid, now = Date.now()) => { const f = fails.get(uid); return !!f && f.n >= 5 && now - f.t < 15 * 60_000; };
export const noteFail = (uid, now = Date.now()) => { const f = fails.get(uid); fails.set(uid, !f || now - f.t > 15 * 60_000 ? { n: 1, t: now } : { n: f.n + 1, t: now }); };
export const clearFails = (uid) => fails.delete(uid);
