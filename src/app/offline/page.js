export const metadata = { title: 'Offline | Conmonie' };
export default function Offline() {
  return (
    <main className="app" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <img src="/icon-192.png" width="72" height="72" alt="" style={{ borderRadius: 18 }} />
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>You are offline</h1>
      <p className="m" style={{ fontSize: 15, lineHeight: 1.5, maxWidth: 280 }}>This page has not been saved on your phone yet. Pages you have opened before still work offline. Connect to the internet to load this one.</p>
      <a href="/" className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Go to Home</a>
    </main>
  );
}
