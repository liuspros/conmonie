'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import Skeleton from '@/components/Skeleton';
import TabBar from '@/components/TabBar';

const ago = (t) => { const s = (Date.now() - t) / 1000; return s < 60 ? 'now' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd'; };

export default function Notifications() {
  const { user } = useRequireAuth(), r = useRouter(), [rows, setRows] = useState(null);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'users', user.uid, 'notifications'), orderBy('at', 'desc'), limit(50)), (s) => setRows(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setRows([]));
  }, [user]);
  const open = async (n) => { if (!n.read) await updateDoc(doc(db, 'users', user.uid, 'notifications', n.id), { read: true }); r.push(n.link || '/'); };
  const readAll = async () => { const b = writeBatch(db); rows.filter((n) => !n.read).forEach((n) => b.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true })); await b.commit(); };
  return (
    <main className="app">
      <div className="r"><h1 style={{ fontSize: 28, fontWeight: 700 }}>Notifications</h1>{rows && rows.some((n) => !n.read) && <button className="pill" style={{ background: '#E3E5E8' }} onClick={readAll}>Mark all read</button>}</div>
      {!rows && <Skeleton />}
      {rows && !rows.length && <div className="glass"><b>Nothing yet</b><p className="m">Reminders to confirm receipts, pay the packer or pay on time show up here.</p></div>}
      {rows && rows.map((n) => (
        <button key={n.id} className="glass" onClick={() => open(n)} style={{ textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%' }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: n.read ? 'transparent' : '#0A0A0A', border: '1px solid #0A0A0A', marginTop: 6, flex: 'none' }} aria-label={n.read ? 'Read' : 'Unread'} />
          <div style={{ flex: 1 }}><div className="r"><b style={{ fontSize: 15 }}>{n.title}</b><span className="m" style={{ fontSize: 12 }}>{ago(n.at)}</span></div><div className="m" style={{ fontSize: 14, marginTop: 2 }}>{n.body}</div></div>
        </button>))}
      <Link href="/" className="m" style={{ textAlign: 'center' }}>Back to home</Link>
      <TabBar />
    </main>
  );
}
