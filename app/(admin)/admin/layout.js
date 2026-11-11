import '../../admin.css';
import AdminShell from '@/components/admin/Shell';
export const metadata = {
  title: { default: 'TBB Studio', template: '%s | TBB Studio' }, manifest: '/admin.webmanifest', robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'TBB Studio', statusBarStyle: 'black-translucent' }, icons: { apple: '/icons/icon-192.png' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#000000', viewportFit: 'cover' };
export default function AdminLayout({ children }) { return <AdminShell>{children}</AdminShell>; }
