// Service worker for the admin app. Caches only the app's own files so it opens fast and shows a friendly page offline.
// It never stores customer, order or payment data.
const SW = `
const V = 'tbb-admin-v1';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(['/admin/offline', '/icons/icon-192.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;     // never touch data requests
  if (r.mode === 'navigate') { e.respondWith(fetch(r).catch(() => caches.match('/admin/offline'))); return; }
  if (u.pathname.startsWith('/_next/static/') || u.pathname.startsWith('/icons/') || u.pathname.startsWith('/img/')) {
    e.respondWith(caches.open(V).then(async (c) => { const hit = await c.match(r); const net = fetch(r).then((res) => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit); return hit || net; }));
  }
});`;
export const dynamic = 'force-static';
export function GET() { return new Response(SW, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/admin' } }); }
