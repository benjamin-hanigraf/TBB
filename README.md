# Thin Black Brush: website and Studio app

Next.js website (`app/(site)`), installable owner app at `/admin` (`app/(admin)`), Supabase database, Razorpay payments, Resend emails.

## Settings (Netlify, Site configuration, Environment variables)
Public (safe in browsers): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`
Secret (server only, never share): `SUPABASE_SECRET_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `BUSINESS_EMAIL`
Optional: `OWNER_EMAIL` (internal address of the Studio owner account; never used to log in), `INSTAGRAM_FEED_URL` (Behold JSON feed), `NEXT_PUBLIC_GOOGLE_LOGIN=1` (shows the Google sign-in button once Google is set up in Supabase)

## Database
Run in the Supabase SQL Editor, in order: `supabase/schema.sql`, `supabase/seed.sql`, `supabase/v2.sql`, `supabase/v3.sql`, `supabase/v4.sql`.
Make the owner an admin: `update profiles set role='admin' where email='owner@example.com';`

## Tests
- `node --test tests/accounting.test.mjs tests/format.test.mjs tests/server.test.mjs`
- `bash tests/run-db-tests.sh` (database security rules, needs local Postgres)

## Photos
`tools/grade_photos.py` gives every photograph the same brightness, contrast and colour.

## Studio app access (PIN only)
`/admin` has no email login. A new device enters a 4-digit PIN once (starts as 0000, changed in Settings). The server checks it, keeps the wrong-guess lockout in the database (`admin_security`), remembers the device, and signs in a dedicated owner account for the app. Only a salted hash of the PIN is stored.
