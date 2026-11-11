const MANIFEST = {
  name: 'Thin Black Brush Studio', short_name: 'TBB Studio', description: 'Manage workshops, orders, customers and accounts for Thin Black Brush.',
  id: '/admin', start_url: '/admin', scope: '/admin', display: 'standalone', orientation: 'portrait', background_color: '#ffffff', theme_color: '#000000',
  icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
  shortcuts: [{ name: 'Orders', url: '/admin/orders' }, { name: 'Add expense', url: '/admin/money' }, { name: 'New invoice', url: '/admin/tools/invoice' }],
};
export const dynamic = 'force-static';
export function GET() { return new Response(JSON.stringify(MANIFEST), { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } }); }
