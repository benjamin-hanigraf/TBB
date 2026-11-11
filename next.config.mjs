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
  async redirects() { return [{ source: '/cart', destination: '/basket', permanent: true }]; },
  images: { remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }] },
  async headers() {
    return [
      { source: '/:path*', headers: security },
      { source: '/(admin|api|invoice|checkout|basket|cart|account)/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '/admin/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/admin' }] },
    ];
  },
};
