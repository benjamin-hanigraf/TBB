'use client';
export default function Error({ reset }) {
  return (<main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}><div>
    <h1 style={{ fontSize: 'clamp(28px,5vw,44px)', letterSpacing: '-.03em', margin: '0 0 12px' }}>Something went wrong.</h1><p style={{ color: '#6e6e73', marginBottom: 20 }}>Please try again. If it keeps happening, call or WhatsApp us on +91 99620 50962.</p>
    <button className="btn" onClick={reset}>Try again</button></div></main>);
}
