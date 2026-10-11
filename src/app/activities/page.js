'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { naira } from '@/lib/utils';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';
import Icon, { IconBadge } from '@/components/Icon';

const ST = { confirmed: ['ok', 'check', 'st-ok', 'Confirmed'], pending: ['wait', 'clock', 'st-wait', 'Awaiting'], rejected: ['rej', 'x', 'st-rej', 'Rejected'] };
export default function Activities() {
  const { user } = useRequireAuth(), [rows, setRows] = useState(null);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const gs = await getDocs(query(collection(db, 'groups'), where('members', 'array-contains', user.uid)));
      const all = await Promise.all(gs.docs.map(async (g) => (await getDocs(query(collection(db, 'groups', g.id, 'contributions'), where('uid', '==', user.uid)))).docs.map((d) => ({ id: d.id, gid: g.id, group: g.data().name, ...d.data() }))));
      setRows(all.flat().sort((a, b) => b.createdAt - a.createdAt));
    })().catch(() => setRows([]));
  }, [user]);
  return (
    <main className="app">
      <div><h1 style={{ fontSize: 28, fontWeight: 700 }}>Transactions</h1><p className="m" style={{ fontSize: 14 }}>Tap a payment to share or download its receipt.</p></div>
      {!rows && <Skeleton />}
      {rows && !rows.length && <div className="glass"><b>Nothing yet</b><p className="m">Your payments will show here.</p></div>}
      {rows && rows.map((c) => { const [tone, ic, cls, lab] = ST[c.status] || ST.pending; return (
        <Link key={c.id} href={'/receipt/' + c.gid + '/' + c.id} className="glass" style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          <IconBadge n={ic} tone={tone} />
          <div style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.group}</b><div className="m" style={{ fontSize: 13 }}>{c.count} &times; &middot; {new Date(c.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
          <div style={{ textAlign: 'right' }}><b>{naira(c.required)}</b><div><span className={'st ' + cls}>{lab}</span></div></div>
          <Icon n="right" s={18} c="#6B7076" />
        </Link>); })}
      <TabBar />
    </main>
  );
}
