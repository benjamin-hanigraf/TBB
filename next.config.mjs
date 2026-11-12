const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://*.razorpay.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.razorpay.com",
  "frame-src https://*.razorpay.com",
  "worker-src 'self'", "manifest-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self' https://*.razorpay.com", "frame-ancestors 'none'", 'upgrade-insecure-requests',
].join('; ');
const security = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), usb=(), payment=(self "https://checkout.razorpay.com")' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];
/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  async redirects() { return [{ source: '/cart', destination: '/bag', permanent: true }, { source: '/services', destination: '/custom-invitations#services', permanent: true }, { source: '/basket', destination: '/bag', permanent: true }, { source: '/manager/tools', destination: '/manager', permanent: true }, { source: '/manager/calendar', destination: '/manager/planner', permanent: true }, { source: '/manager/todo', destination: '/manager/planner', permanent: true }, { source: '/manager/invoices', destination: '/manager/money?tab=invoices', permanent: true }, { source: '/manager/calculator', destination: '/manager/money?tab=calculator', permanent: true }, { source: '/manager/tools/invoice', destination: '/manager/money?tab=invoices', permanent: true }, { source: '/manager/tools/calculator', destination: '/manager/money?tab=calculator', permanent: true }, { source: '/manager/tools/labels', destination: '/manager/labels', permanent: true }, { source: '/manager/photos', destination: '/manager', permanent: true }, { source: '/admin', destination: '/manager', permanent: true }, { source: '/admin/:path*', destination: '/manager/:path*', permanent: true }]; },
  images: { remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }] },
  async headers() {
    return [
      { source: '/:path*', headers: security },
      { source: '/(manager|admin|api|invoice|checkout|bag|cart|account)/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '/manager/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/manager' }] },
    ];
  },
};
