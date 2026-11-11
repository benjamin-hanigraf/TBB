export const metadata = { title: 'Page not found', robots: { index: false } };
export default function NotFound() {
  return (<main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}><div>
    <p style={{ color: '#6e6e73' }}>404</p><h1 style={{ fontSize: 'clamp(32px,6vw,56px)', letterSpacing: '-.03em', margin: '8px 0 16px' }}>We could not find that page.</h1>
    <a className="btn" href="/" style={{ marginTop: 8 }}>Go home</a></div></main>);
}
