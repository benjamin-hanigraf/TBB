import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Typeset from '@/components/Typeset';
import { CartProvider } from '@/components/Cart';
import BackNav from '@/components/BackNav';
export default function SiteLayout({ children }) {
  return (<CartProvider><a className="skip" href="#main">Skip to content</a><Nav /><BackNav /><div id="main">{children}</div><Footer /><Typeset /></CartProvider>);
}
