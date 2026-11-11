// Receives website forms and stores them in the database (server only, uses the secret key).
const KINDS = ['contact', 'invitation', 'service', 'collaboration', 'hiring'];
const clean = (v, n = 2000) => String(v ?? '').trim().slice(0, n);
export async function POST(req) {
  let b; try { b = await req.json(); } catch { return Response.json({ error: 'bad' }, { status: 400 }); }
  if (b.website) return Response.json({ ok: true });            // spam trap
  if (!KINDS.includes(b.kind)) return Response.json({ error: 'bad' }, { status: 400 });
  const name = clean(b.name, 120), email = clean(b.email, 200), phone = clean(b.phone, 20), message = clean(b.message || b.experience);
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ error: 'invalid' }, { status: 400 });
  if (['hiring', 'invitation', 'contact', 'service'].includes(b.kind) && !/^[0-9+\s-]{10,16}$/.test(phone)) return Response.json({ error: 'invalid' }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return Response.json({ error: 'not configured' }, { status: 503 });
  const { kind, website, name: _n, email: _e, phone: _p, message: _m, ...rest } = b;
  const details = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, clean(v, 500)]));
  const r = await fetch(`${url}/rest/v1/enquiries`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ kind, name, email, phone, message, details }) });
  return r.ok ? Response.json({ ok: true }) : Response.json({ error: 'failed' }, { status: 502 });
}
