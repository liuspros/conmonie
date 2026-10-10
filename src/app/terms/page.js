import { TERMS } from '@/lib/terms';
export const metadata = { title: 'Terms | Conmonie' };
export default function Terms() {
  return (
    <main className="app">
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Terms and conditions</h1>
      <div className="glass" style={{ fontSize: 14, lineHeight: 1.7 }}><ol style={{ margin: 0, paddingLeft: 18 }}>{TERMS.map((t) => <li key={t}>{t}</li>)}</ol></div>
      <a href="/me" className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Back</a>
    </main>
  );
}
