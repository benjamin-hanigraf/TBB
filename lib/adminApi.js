'use client';
import { adminClient } from './supabase-admin';
export const deviceId = () => { try { let d = localStorage.getItem('tbb-device-id'); if (!d) { d = crypto.randomUUID(); localStorage.setItem('tbb-device-id', d); } return d; } catch { return 'no-storage'; } };
export const getToken = () => { try { return localStorage.getItem('tbb-device-token') || ''; } catch { return ''; } };
export const setToken = (t) => { try { t ? localStorage.setItem('tbb-device-token', t) : localStorage.removeItem('tbb-device-token'); } catch {} };
export async function pinApi(body) {
  const r = await fetch('/api/manager/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device: deviceId(), token: getToken(), ...body }) });
  let j = {}; try { j = await r.json(); } catch {} return { ok: r.ok, status: r.status, ...j };
}
export const applySession = async (session) => { const c = adminClient(); const { error } = await c.auth.setSession(session); if (error) throw error; };
/** Forget this device: the next visit asks for the PIN again. */
export async function lockDevice() { setToken(''); try { await adminClient().auth.signOut(); } catch {} }
