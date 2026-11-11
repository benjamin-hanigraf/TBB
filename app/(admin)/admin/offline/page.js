export const metadata = { title: { absolute: 'Offline | TBB Studio' } };
export default function Offline() {
  return (<div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, fontFamily: 'system-ui' }}><div><h1 style={{ fontSize: 28 }}>You are offline</h1><p style={{ color: '#6e6e73', marginTop: 8 }}>Connect to the internet and try again. Nothing has been lost.</p></div></div>);
}
