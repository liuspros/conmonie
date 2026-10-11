import { AGREEMENT } from '@/lib/agreement';
export const metadata = { title: 'Member agreement | Conmonie' };
export default function Agreement() {
  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Member agreement</h1>
      {AGREEMENT.map((s) => <div key={s.t} className="glass" style={{ fontSize: 14, lineHeight: 1.65 }}><b style={{ fontSize: 16 }}>{s.t}</b>{s.p.map((p, i) => <p key={i} style={{ marginTop: 8 }}>{p}</p>)}</div>)}
      <a href="/me" className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Back</a>
    </main>
  );
}
