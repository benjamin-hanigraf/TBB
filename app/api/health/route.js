// A plain report of what is and is not set up. It shows yes/no only, never any secret.
import { dbReady } from '@/lib/server/db';
export const dynamic = 'force-dynamic';
const has = (k) => !!process.env[k];
async function tableOk(table, url, key) {
  try { const r = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(6000) }); return r.status === 200 || r.status === 206; } catch { return false; }
}
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; const connected = !!(url && key);
  const t = connected ? await Promise.all([tableOk('workshops', url, key), tableOk('ledger_entries', url, key), tableOk('class_levels', url, key), tableOk('admin_security', url, key)]) : [false, false, false, false];
  const missing = [];
  if (!connected) missing.push('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Netlify (Site configuration, Environment variables), then redeploy.');
  if (!has('SUPABASE_SECRET_KEY')) missing.push('Add SUPABASE_SECRET_KEY in Netlify. The Studio app PIN, payments and emails need it. Then redeploy.');
  if (connected && !t[0]) missing.push('Database part 1 is missing: run schema.sql and seed.sql in Supabase.');
  if (connected && t[0] && !t[1]) missing.push('Database part 2 is missing (accounts and invoices): run the second SQL block.');
  if (connected && t[0] && !t[2]) missing.push('Database part 3 is missing (writing-class payments): run the class levels SQL block.');
  if (connected && t[0] && !t[3]) missing.push('Database part 4 is missing (Studio PIN): run the admin_security SQL block.');
  const later = [];
  if (!(has('RAZORPAY_KEY_ID') && has('RAZORPAY_KEY_SECRET'))) later.push('Payments are off until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are added.');
  if (!has('RAZORPAY_WEBHOOK_SECRET')) later.push('Add RAZORPAY_WEBHOOK_SECRET so payments are confirmed even if a customer closes the page.');
  if (!has('RESEND_API_KEY')) later.push('Emails are off until RESEND_API_KEY and EMAIL_FROM are added.');
  return Response.json({
    website: 'running',
    studioApp: { ready: connected && has('SUPABASE_SECRET_KEY') && t[3], needs: missing },
    database: { connected, part1_site: t[0], part2_accounts: t[1], part3_classes: t[2], part4_pin: t[3] },
    payments: has('RAZORPAY_KEY_ID') && has('RAZORPAY_KEY_SECRET') && dbReady(), webhook: has('RAZORPAY_WEBHOOK_SECRET'), emails: has('RESEND_API_KEY'), googleLogin: process.env.NEXT_PUBLIC_GOOGLE_LOGIN === '1',
    laterSteps: later,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
