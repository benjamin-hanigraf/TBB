import { q, dbReady, userFromRequest } from '@/lib/server/db';
import { createRzpOrder, razorpayReady } from '@/lib/server/razorpay';
import { rateLimit, sameOrigin, readJson, str, isEmail, isPhone, intIn, json } from '@/lib/server/guard';
import { titleCase, cleanEmail, cleanPhone } from '@/lib/format';
export const runtime = 'nodejs';
// Pay to enrol in a writing-class level. The price always comes from the database, never from the browser.
export async function POST(req) {
  if (!sameOrigin(req)) return json({ error: 'forbidden' }, 403);
  if (!rateLimit(req, 'class', 8)) return json({ error: 'slow_down' }, 429);
  if (!dbReady() || !razorpayReady()) return json({ error: 'payments_not_configured' }, 503);
  let b; try { b = await readJson(req); } catch (e) { return json({ error: 'bad_request' }, e.status || 400); }
  const name = titleCase(str(b.name, 120)), email = cleanEmail(str(b.email)), phone = cleanPhone(str(b.phone, 20)), student = titleCase(str(b.student_name, 120));
  const group = b.group === 'child' ? 'child' : b.group === 'adult' ? 'adult' : null; const age = group === 'child' ? intIn(b.age, 1, 99) : null;
  const slug = str(b.level, 60);
  const student2 = group === 'adult' ? name : student;
  if (!name || !student2 || !group || !isEmail(email) || !isPhone(phone) || !slug || (group === 'child' && !age)) return json({ error: 'invalid_details' }, 400);
  try {
    const [lv] = await q(`class_levels?slug=eq.${encodeURIComponent(slug)}&active=eq.true&select=id,title,level,price_paise`); if (!lv) return json({ error: 'unavailable' }, 409);
    if (group === 'child' && age < 5) return json({ error: 'too_young' }, 400);
    if (group === 'child' && age > 15) return json({ error: 'too_old' }, 400);
    if (lv.price_paise <= 0) return json({ error: 'free_not_supported' }, 400);
    // at most 2 unpaid attempts per email or phone in 30 minutes
    const since = new Date(Date.now() - 30 * 60_000).toISOString();
    const open = await q(`class_enrolments?status=eq.pending&created_at=gte.${encodeURIComponent(since)}&or=(email.eq.${encodeURIComponent(email)},phone.eq.${encodeURIComponent(phone)})&select=id`);
    if ((open || []).length >= 3) return json({ error: 'slow_down' }, 429);
    const user = await userFromRequest(req).catch(() => null);
    const [row] = await q('class_enrolments', { method: 'POST', prefer: 'return=representation', body: { class_id: lv.id, user_id: user?.id || null, student_name: student2, student_group: group, student_age: age, name, email, phone, amount_paise: lv.price_paise } });
    let rzp; try { rzp = await createRzpOrder({ amountPaise: lv.price_paise, receipt: row.id.slice(0, 8), notes: { enrolment_id: row.id } }); }
    catch (e) { await q(`class_enrolments?id=eq.${row.id}`, { method: 'PATCH', body: { status: 'cancelled' } }); console.error('rzp', e.detail); return json({ error: 'payment_provider' }, 502); }
    await q(`class_enrolments?id=eq.${row.id}`, { method: 'PATCH', body: { razorpay_order_id: rzp.id } });
    return json({ enrolment_id: row.id, razorpay_order_id: rzp.id, amount: lv.price_paise, currency: 'INR', key_id: process.env.RAZORPAY_KEY_ID, name, email, phone, title: `${lv.title}, ${lv.level}` });
  } catch (e) { console.error('class', e.status, e.detail || e.message); return json({ error: 'server' }, 500); }
}
