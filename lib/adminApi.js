'use client';
import { supabase } from './supabase-browser';
export const deviceId = () => { try { let d = localStorage.getItem('tbb-device-id'); if (!d) { d = crypto.randomUUID(); localStorage.setItem('tbb-device-id', d); } return d; } catch { return 'no-storage'; } };
export const getToken = () => { try { return localStorage.getItem('tbb-device-token') || ''; } catch { return ''; } };
export const setToken = (t) => { try { t ? localStorage.setItem('tbb-device-token', t) : localStorage.removeItem('tbb-device-token'); } catch {} };
export async function pinApi(body) {
  const { data } = await supabase().auth.getSession(); const at = data.session?.access_token; if (!at) return { ok: false, status: 401 };
  const r = await fetch('/api/admin/pin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${at}` }, body: JSON.stringify({ device: deviceId(), ...body }) });
  let j = {}; try { j = await r.json(); } catch {} return { ok: r.ok, status: r.status, ...j };
}
