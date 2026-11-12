import { q, dbReady } from '@/lib/server/db';
import { sendEmail, waitlistThanks, waitlistAlert } from '@/lib/server/email';
import { rateLimit, sameOrigin, readJson, str, isEmail, isPhone, intIn, json } from '@/lib/server/guard';
import { titleCase, cleanEmail, cleanPhone } from '@/lib/format';
export const runtime = 'nodejs';
// A visitor asks to be told if a seat opens up in a sold-out workshop.
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'waitlist', 5)) return json({ error: 'slow_down' }, 429);
  if (!dbReady()) return json({ error: 'not_configured' }, 503);
  let b; try { b = await readJson(req, 4000); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  if (b.website) return json({ ok: true });                                       // hidden spam-trap field
  const name = titleCase(str(b.name, 120)), email = cleanEmail(str(b.email)), phone = b.phone ? cleanPhone(str(b.phone, 20)) : '', seats = intIn(b.seats, 1, 10) || 1, slug = str(b.slug, 100);
  if (!name || !isEmail(email) || (phone && !isPhone(phone)) || !slug) return json({ error: 'invalid' }, 400);
  try {
    const [w] = await q(`workshops?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,title,starts_at`); if (!w || new Date(w.starts_at) <= new Date()) return json({ error: 'closed' }, 409);
    const dup = await q(`workshop_waitlist?workshop_id=eq.${w.id}&email=eq.${encodeURIComponent(email)}&select=id`); if (!dup?.length) await q('workshop_waitlist', { method: 'POST', prefer: 'return=minimal', body: { workshop_id: w.id, name, email, phone: phone || null, seats } });
    try { await sendEmail(waitlistAlert({ name, email, phone, seats, title: w.title })); await sendEmail(waitlistThanks({ to: email, name, title: w.title })); } catch (e) { console.error('waitlist email', e.message); }
    return json({ ok: true });
  } catch (e) { console.error('waitlist', e.status, e.detail || e.message); return json({ error: 'failed' }, 502); }
}
