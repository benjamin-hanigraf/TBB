// Service worker for the admin app. It only speeds up app images and icons. It never touches page loads, data or payments,
// so it cannot cause a blank page. Old versions of itself (and their caches) are removed.
const SW = `
const V = 'tbb-admin-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.startsWith('/icons/') || u.pathname.startsWith('/img/')) {
    e.respondWith(caches.open(V).then(async (c) => { const hit = await c.match(r); const net = fetch(r).then((res) => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit); return hit || net; }));
  }
});`;
export const dynamic = 'force-static';
export function GET() { return new Response(SW, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/manager' } }); }
