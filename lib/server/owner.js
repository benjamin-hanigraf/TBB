// The owner's sign-in. The owner never types an email: after the right PIN, the server signs in a dedicated owner account
// (whose password is derived from the server's secret key and never shown to anyone) and hands the browser a normal session.
import crypto from 'node:crypto';
import { q } from './db.js';
const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = () => process.env.SUPABASE_SECRET_KEY;
export const OWNER_EMAIL = () => process.env.OWNER_EMAIL || 'tbb-studio-owner@example.com';
const password = () => crypto.createHmac('sha256', secret() || '').update('tbb-owner-password-v1').digest('base64url');
const authAdmin = (path, method, body) => fetch(`${url()}/auth/v1${path}`, { method, headers: { apikey: secret(), Authorization: `Bearer ${secret()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
const signIn = () => fetch(`${url()}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: OWNER_EMAIL(), password: password() }), cache: 'no-store' });

export async function mintOwnerSession() {
  let r = await signIn();
  if (!r.ok) {                                              // first ever use (or secret key rotated): create / repair the owner account
    const c = await authAdmin('/admin/users', 'POST', { email: OWNER_EMAIL(), password: password(), email_confirm: true, user_metadata: { full_name: 'Studio owner' } });
    if (!c.ok) {
      const rows = await q(`profiles?email=eq.${encodeURIComponent(OWNER_EMAIL())}&select=id`);
      if (!rows?.[0]) throw new Error(`owner create failed ${c.status}`);
      const u = await authAdmin(`/admin/users/${rows[0].id}`, 'PUT', { password: password(), email_confirm: true }); if (!u.ok) throw new Error(`owner repair failed ${u.status}`);
    }
    r = await signIn(); if (!r.ok) throw new Error(`owner sign-in failed ${r.status}`);
  }
  const j = await r.json(); const id = j.user?.id; if (!id || !j.access_token) throw new Error('owner session incomplete');
  const upd = await q(`profiles?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation', body: { role: 'admin', email: OWNER_EMAIL() } });
  if (!upd?.length) await q('profiles', { method: 'POST', prefer: 'return=minimal', body: { id, role: 'admin', email: OWNER_EMAIL(), full_name: 'Studio owner' } });
  try { await q(`customers?user_id=eq.${id}`, { method: 'DELETE' }); } catch {}          // the owner account is not a customer
  return { access_token: j.access_token, refresh_token: j.refresh_token };
}

/** Ends every sign-in of the owner account on every device (used when the PIN changes). Sign-ins already open stop working
 *  when their current access expires (Supabase's setting, usually within an hour); they cannot be renewed. */
export async function signOutOwnerEverywhere() {
  const r = await signIn(); if (!r.ok) return false; const j = await r.json();
  const out = await fetch(`${url()}/auth/v1/logout?scope=global`, { method: 'POST', headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${j.access_token}` }, cache: 'no-store' });
  return out.ok || out.status === 204;
}
