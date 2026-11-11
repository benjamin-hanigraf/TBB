// Small safety helpers for API routes: same-site check, rate limit, bounded JSON, input validators.
const hits = new Map();
export function rateLimit(req, key, limit = 10, windowMs = 60_000) {
  const ip = (req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const k = `${key}:${ip}`, now = Date.now(); const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) return false; arr.push(now); hits.set(k, arr); if (hits.size > 5000) hits.clear(); return true;
}
export function sameOrigin(req) {
  const o = req.headers.get('origin'); if (!o) return false;
  try { return new URL(o).host === (req.headers.get('x-forwarded-host') || req.headers.get('host')); } catch { return false; }
}
export async function readJson(req, max = 20_000) {
  const t = await req.text(); if (t.length > max) throw Object.assign(new Error('too large'), { status: 413 });
  try { return JSON.parse(t); } catch { throw Object.assign(new Error('bad json'), { status: 400 }); }
}
export const str = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
export const isEmail = (v) => /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/.test(v) && v.length <= 200;
export const isPhone = (v) => /^[0-9+\s-]{10,16}$/.test(v);
export const isPin = (v) => /^[0-9]{6}$/.test(v);
export const intIn = (v, lo, hi) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
export const json = (obj, status = 200) => Response.json(obj, { status, headers: { 'Cache-Control': 'no-store' } });
export const iso = (d = new Date()) => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);   // today in India
