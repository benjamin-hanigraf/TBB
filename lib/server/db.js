// Server-only database access using the secret key. Never import this from browser code.
const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = () => process.env.SUPABASE_SECRET_KEY;
export const dbReady = () => !!(url() && secret());
const H = (extra = {}) => ({ apikey: secret(), Authorization: `Bearer ${secret()}`, 'Content-Type': 'application/json', ...extra });

export async function q(path, { method = 'GET', body, prefer } = {}) {
  const r = await fetch(`${url()}/rest/v1/${path}`, { method, headers: H(prefer ? { Prefer: prefer } : {}), body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
  const text = await r.text(); let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) { const e = new Error(`db ${method} ${path.split('?')[0]} ${r.status}`); e.status = r.status; e.detail = data; throw e; }
  return data;
}
export const rpc = (name, args) => q(`rpc/${name}`, { method: 'POST', body: args });

/** Who is calling? Returns the Supabase user for a Bearer token, or null. */
export async function userFromRequest(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const r = await fetch(`${url()}/auth/v1/user`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!r.ok) return null;
  const u = await r.json(); return u?.id ? u : null;
}
export async function requireAdmin(req) {
  const u = await userFromRequest(req); if (!u) return null;
  const rows = await q(`profiles?id=eq.${u.id}&select=role`);
  return rows?.[0]?.role === 'admin' ? u : null;
}
export async function getSettings() {
  const rows = await q('settings?select=key,value'); const m = {}; for (const r of rows || []) m[r.key] = r.value; return m;
}
