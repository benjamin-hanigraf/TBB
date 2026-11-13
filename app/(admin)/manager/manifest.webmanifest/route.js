const MANIFEST = {
  name: 'Thin Black Brush Manager', short_name: 'TBB Manager', description: 'Manage workshops, orders, customers and accounts for Thin Black Brush.',
  id: '/manager', start_url: '/manager', scope: '/manager', display: 'standalone', orientation: 'portrait', background_color: '#ffffff', theme_color: '#000000',
  icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
  shortcuts: [{ name: 'Orders', url: '/manager/orders' }, { name: 'Planner', url: '/manager/planner' }, { name: 'New invoice', url: '/manager/money?tab=invoices' }],
};
export const dynamic = 'force-static';
export function GET() { return new Response(JSON.stringify(MANIFEST), { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } }); }
