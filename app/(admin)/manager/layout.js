import '../../admin.css';
import AdminShell from '@/components/admin/Shell';
export const metadata = {
  title: { default: 'TBB Manager', template: '%s | TBB Manager' }, manifest: '/manager/manifest.webmanifest', robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'TBB Manager', statusBarStyle: 'black-translucent' }, icons: { apple: '/icons/icon-192.png' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#000000', viewportFit: 'cover' };
const WATCHDOG = `(function(){var errs=[];window.addEventListener('error',function(e){errs.push((e.message||'error')+(e.filename?' @'+String(e.filename).split('/').pop()+':'+e.lineno:''))});window.addEventListener('unhandledrejection',function(e){errs.push('promise: '+((e.reason&&e.reason.message)||e.reason))});
setTimeout(function(){if(window.__adminReady)return;var d=document.createElement('div');d.setAttribute('style','position:fixed;top:0;right:0;bottom:0;left:0;background:#fff;z-index:99999;padding:24px;font:16px -apple-system,system-ui,sans-serif;color:#1d1d1f;overflow:auto');
d.innerHTML='<h1 style="font-size:26px;margin:48px 0 8px">The Manager app could not start</h1><p style="color:#6e6e73">Please reload the page. If it keeps happening, send a screenshot of this message.</p><pre style="white-space:pre-wrap;word-break:break-word;background:#f5f5f7;padding:12px;border-radius:12px;font-size:12px"></pre>';d.querySelector('pre').textContent=(errs.join('\\n')||'No error was reported.')+'\\n\\n'+navigator.userAgent;document.body.appendChild(d)},6000)})();`;
export default function AdminLayout({ children }) {
  return (<><script dangerouslySetInnerHTML={{ __html: WATCHDOG }} /><noscript><div style={{ padding: 24, fontFamily: 'system-ui' }}><h1>JavaScript is turned off</h1><p>The Manager app needs JavaScript. Please turn it on in your browser settings.</p></div></noscript><AdminShell>{children}</AdminShell></>);
}
