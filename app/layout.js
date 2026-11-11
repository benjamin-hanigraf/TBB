import '@fontsource-variable/inter';
import './globals.css';
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thinblackbrush.com'),
  title: { default: "Thin Black Brush - The Artists' Commonroom", template: '%s | Thin Black Brush' },
  description: 'Calligraphy and art workshops, handwriting classes, custom invitations and handcrafted art supplies in Chennai.',
  openGraph: { type: 'website', siteName: 'Thin Black Brush', locale: 'en_IN', images: ['/img/cb028c51a9.webp'] },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/img/9ec99f62d1.webp', apple: '/icons/icon-192.png' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };
export default function RootLayout({ children }) {
  return (<html lang="en-IN"><body>{children}</body></html>);
}
