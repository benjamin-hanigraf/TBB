// Receives website forms, tidies them, stores them in the database and emails both sides.
import { titleCase, cleanEmail, cleanPhone, cleanInstagram, sentenceCase } from '@/lib/format';
import { rateLimit, sameOrigin, readJson, str, isEmail, isPhone, json } from '@/lib/server/guard';
import { q, dbReady } from '@/lib/server/db';
import { sendEmail, enquiryAlert, enquiryThanks } from '@/lib/server/email';
export const runtime = 'nodejs';
const KINDS = { contact: ['name', 'email', 'phone', 'message'], invitation: ['name', 'email', 'phone', 'message'], service: ['name', 'email', 'phone', 'message'], collaboration: ['name', 'email', 'message'], hiring: ['name', 'email', 'phone', 'message'] };
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'enquiry', 5)) return json({ error: 'slow_down' }, 429);
  let b; try { b = await readJson(req, 10_000); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  if (b.website) return json({ ok: true });                                   // hidden spam-trap field was filled
  const need = KINDS[b.kind]; if (!need) return json({ error: 'bad_request' }, 400);
  const e = { kind: b.kind, name: titleCase(str(b.name, 120)), email: cleanEmail(str(b.email)), phone: b.phone ? cleanPhone(str(b.phone, 20)) : '', message: sentenceCase(str(b.message || b.experience, 2000)) };
  if (!e.name || !isEmail(e.email) || (need.includes('phone') && !isPhone(e.phone)) || (b.phone && !isPhone(e.phone)) || (need.includes('message') && e.message.length < 10)) return json({ error: 'invalid' }, 400);
  const skip = new Set(['kind', 'website', 'name', 'email', 'phone', 'message', 'experience']);
  e.details = Object.fromEntries(Object.entries(b).filter(([k]) => !skip.has(k) && /^[a-z_]{1,30}$/.test(k)).slice(0, 12).map(([k, v]) => [k, k === 'instagram' ? cleanInstagram(str(v, 60)) : /name|organisation|address|city/.test(k) ? titleCase(str(v, 300)) : str(v, 300)]));
  if (!dbReady()) return json({ error: 'not_configured' }, 503);
  try { await q('enquiries', { method: 'POST', prefer: 'return=minimal', body: e }); } catch (err) { console.error('enquiry', err.status, err.detail); return json({ error: 'failed' }, 502); }
  try { await sendEmail(enquiryAlert(e)); await sendEmail(enquiryThanks(e)); } catch (err) { console.error('enquiry email', err.message); }
  return json({ ok: true });
}
