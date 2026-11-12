# Thin Black Brush: website and Manager app

Next.js website (`app/(site)`), installable owner app at `/manager` (`app/(admin)`), Supabase database, Razorpay payments, Resend emails. Hosted on **Vercel** (Mumbai region, set in `vercel.json`) until the site goes live; `netlify.toml` is kept in case it moves back.

## Settings (Vercel, Project Settings, Environment Variables)
Public (safe in browsers): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`
Secret (server only, never share): `SUPABASE_SECRET_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `BUSINESS_EMAIL`
Optional: `OWNER_EMAIL` (internal address of the Manager owner account; never used to log in), `INSTAGRAM_FEED_URL` (Behold JSON feed), `NEXT_PUBLIC_GOOGLE_LOGIN=1` (shows the Google sign-in button once Google is set up in Supabase)

## Hosting address checklist
Whenever the web address changes (Vercel address now, real domain at launch), update it in all of these:
- Vercel: `NEXT_PUBLIC_SITE_URL` (sitemap, robots, link previews)
- Supabase, Authentication, URL Configuration: **Site URL** and **Redirect URLs** (e.g. `https://<address>/**`), or emailed sign-in links will not work
- Razorpay, Webhooks: `https://<address>/api/payments/webhook`
- Google Cloud console (only if Google login is on): authorised origins

## Database
**One file:** `supabase/database.sql` is the complete, latest database (tables, security rules, functions, starting data). Paste it into the Supabase SQL Editor and press Run. It works on a brand-new project and on the existing database, never deletes or resets anything you entered, and is safe to run again. Whenever the database changes, this same file is edited and run again (no new files).

**Test data:** `supabase/dummy.sql` fills every table with at least 10 varied rows (every status, part-paid invoices, a sold-out workshop, one-on-one classes, rent-outs, and so on) so each screen can be tried. Run it once after the file above. `supabase/dummy-remove.sql` takes all of it out again, including anything made while testing with `@example.com` emails: **run it before the site goes live**, because the dummy workshops, products and classes show on the public website. To change the data, edit `tools/make_dummy_sql.py` and run `python3 tools/make_dummy_sql.py`.

Make the owner an admin: `update profiles set role='admin' where email='owner@example.com';`

## Tests
- `node --test tests/accounting.test.mjs tests/format.test.mjs tests/server.test.mjs`
- `bash tests/run-db-tests.sh` (database security rules, needs local Postgres)

## Photos
`tools/grade_photos.py` gives every photograph the same brightness, contrast and colour.

## Manager app access (PIN only)
`/manager` has no email login. A new device enters a 4-digit PIN once (starts as 0000, changed in Settings). The server checks it, keeps the wrong-guess lockout in the database (`admin_security`), remembers the device, and signs in a dedicated owner account for the app. Only a salted hash of the PIN is stored.

## Spreadsheets
In the Manager app, Products, Workshops, Classes and Customers each have an **Import** button: download the template, fill one row per item, save as CSV and upload. The `customers` table can also be loaded straight from the Supabase table editor.
