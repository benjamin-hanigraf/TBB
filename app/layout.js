import '@fontsource-variable/inter';
import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Typeset from '@/components/Typeset';
export const metadata = {
  title: { default: "Thin Black Brush - The Artists' Commonroom", template: '%s | Thin Black Brush' },
  description: 'Calligraphy and art workshops, handwriting classes, custom invitations and handcrafted art supplies.',
  icons: { icon: '/img/9ec99f62d1.webp' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };
export default function RootLayout({ children }) {
  return (<html lang="en-IN"><body><Nav />{children}<Footer /><Typeset /></body></html>);
}
