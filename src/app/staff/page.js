'use client';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import Skeleton from '@/components/Skeleton';

// Reviewer screen. Anyone with staff: true on their user document in Firestore can open it.
export default function Staff() {
  const { user } = useRequireAuth(), [items, setItems] = useState(null), [sel, setSel] = useState(null), [files, setFiles] = useState(null), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const load = () => api('/api/staff/queue').then((j) => setItems(j.items)).catch(() => setItems(false));
  useEffect(() => { if (user) load(); }, [user]);
  async function open(v) { setSel(v); setFiles(null); setNote(''); setFiles((await api('/api/staff/queue?uid=' + v.uid)).files); }
  async function decide(decision) {
    if (decision === 'reject' && !note.trim()) return window.alert('Add a short reason for the member.');
    setBusy(true); try { await api('/api/staff/review', { uid: sel.uid, decision, note }); setSel(null); await load(); } catch { window.alert('Could not save. Try again.'); } setBusy(false);
  }
  if (items === false) return <main className="app"><h1 style={{ fontSize: 26, fontWeight: 700 }}>Staff only</h1></main>;
  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>Identity reviews</h1>
      {!items && <Skeleton />}
      {items && !items.length && !sel && <div className="glass"><b>Nothing waiting</b></div>}
      {!sel && items && items.map((v) => <button key={v.uid} className="glass r" style={{ width: '100%', textAlign: 'left' }} onClick={() => open(v)}><div><b>{v.legalName}</b><div className="m">{v.flags.length ? v.flags.length + ' flag(s)' : 'No flags'}</div></div><span className="m">&rsaquo;</span></button>)}
      {sel && <>
        <button className="m" style={{ background: 'none', textAlign: 'left' }} onClick={() => setSel(null)}>&lsaquo; Back to list</button>
        <div className="glass" style={{ fontSize: 14, lineHeight: 1.7 }}>
          <b>{sel.legalName}</b><br />Face distance: {sel.scores.distance != null ? sel.scores.distance.toFixed(2) : 'n/a'} (under 0.5 is a strong match) &middot; Live check: {sel.scores.liveness ? 'passed' : 'not completed'}<br />
          Statement name: {sel.statement.name || 'none'}<br />Address: {sel.statement.address || 'none'}<br />Date: {sel.statement.date || 'none'} &middot; PDF: {sel.statement.isPdf ? 'yes' : 'no'}<br />Producer: {sel.statement.producer || 'unknown'}
          {sel.flags.length > 0 && <div style={{ marginTop: 6, fontWeight: 600 }}>Flags: {sel.flags.join('; ')}</div>}
        </div>
        {!files ? <Skeleton n={2} h={160} /> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{['id', 'selfie', 'statement'].map((k) => files[k] && <div key={k}><div className="m" style={{ marginBottom: 4 }}>{k === 'id' ? 'ID' : k === 'selfie' ? 'Selfie' : 'Statement (first page)'}</div><img src={files[k]} alt={k} style={{ width: '100%', borderRadius: 14 }} /></div>)}</div>}
        <input className="inp" placeholder="Note (required if rejecting)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}><button className="btn" disabled={busy || !files} onClick={() => decide('approve')}>Approve</button><button className="btn2" disabled={busy || !files} onClick={() => decide('reject')}>Reject</button></div>
      </>}
    </main>
  );
}
