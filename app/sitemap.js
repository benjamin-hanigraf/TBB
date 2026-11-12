import { getWorkshops, getProducts } from '@/lib/db';
export const revalidate = 3600;
export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thinblackbrush.com';
  const fixed = ['', '/workshops', '/writing-classes', '/store', '/custom-invitations', '/collaborations', '/contact', '/policies/terms', '/policies/privacy', '/policies/refund'];
  const [w, p] = await Promise.all([getWorkshops(), getProducts()]);
  return [...fixed.map((x) => ({ url: base + x, changeFrequency: 'weekly', priority: x === '' ? 1 : 0.7 })),
    ...w.map((x) => ({ url: `${base}/workshops/${x.slug}`, changeFrequency: 'weekly', priority: 0.6 })), ...p.map((x) => ({ url: `${base}/store/${x.slug}`, changeFrequency: 'weekly', priority: 0.6 }))];
}
