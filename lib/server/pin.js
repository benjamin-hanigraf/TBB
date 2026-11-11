// Device PIN for the admin app. The PIN itself is never stored: only a salted scrypt hash. Until she changes it, the PIN is 0000.
import crypto from 'node:crypto';
import { q } from './db.js';
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
// Wrong-guess protection, kept in the database so restarting the server cannot reset it.
// 5 wrong PINs lock for 15 minutes, 10 for 1 hour, 15 or more for 24 hours. A correct PIN clears the count.
export const lockDuration = (fails) => (fails >= 15 ? 24 * 3600e3 : fails >= 10 ? 3600e3 : fails >= 5 ? 15 * 60e3 : 0);
export function nextFailState(prev, now = Date.now()) {
  const fresh = !prev?.first_at || now - prev.first_at > 24 * 3600e3;
  const fails = fresh ? 1 : (prev.fails || 0) + 1; const d = lockDuration(fails);
  return { fails, first_at: fresh ? now : prev.first_at, locked_until: d ? now + d : 0 };
}
export const isLocked = (rec, now = Date.now()) => !!rec?.locked_until && rec.locked_until > now;
export async function getRec(key) { const r = await q(`admin_security?key=eq.${encodeURIComponent(key)}&select=value`); return r?.[0]?.value; }
export const setRec = (key, value) => q('admin_security?on_conflict=key', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { key, value } });
