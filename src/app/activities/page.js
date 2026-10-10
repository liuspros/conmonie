'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { naira } from '@/lib/utils';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';

export default function Activities() {
  const { user } = useRequireAuth(), [rows, setRows] = useState(null);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const gs = await getDocs(query(collection(db, 'groups'), where('members', 'array-contains', user.uid)));
      const all = await Promise.all(gs.docs.map(async (g) => (await getDocs(query(collection(db, 'groups', g.id, 'contributions'), where('uid', '==', user.uid)))).docs.map((d) => ({ id: d.id, group: g.data().name, ...d.data() }))));
      setRows(all.flat().sort((a, b) => b.createdAt - a.createdAt));
    })();
  }, [user]);
  return (
    <main className="app">
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Activities</h1>
      {!rows && <Skeleton />}
      {rows && !rows.length && <div className="glass"><b>Nothing yet</b><p className="m">Your payments will show here.</p></div>}
      {rows && rows.map((c) => <div key={c.id} className="glass r"><div><b>{c.group}</b><div className="m">{c.count} contribution(s) &middot; {naira(c.required)} &middot; {new Date(c.createdAt).toLocaleDateString('en-NG')}</div></div><span className={'tag' + (c.status === 'confirmed' ? ' k' : '')}>{c.status === 'confirmed' ? 'Confirmed' : c.status === 'rejected' ? 'Rejected' : 'Awaiting admin'}</span></div>)}
      <TabBar />
    </main>
  );
}
