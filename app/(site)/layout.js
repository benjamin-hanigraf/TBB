import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Typeset from '@/components/Typeset';
import { CartProvider } from '@/components/Cart';
export default function SiteLayout({ children }) {
  return (<CartProvider><a className="skip" href="#main">Skip to content</a><Nav /><div id="main">{children}</div><Footer /><Typeset /></CartProvider>);
}
