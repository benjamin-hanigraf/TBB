export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thinblackbrush.com';
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/manager', '/admin', '/api/', '/invoice/', '/checkout', '/bag', '/cart', '/account'] }], sitemap: `${base}/sitemap.xml` };
}
