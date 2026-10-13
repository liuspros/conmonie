'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { cycleInfo, naira } from '@/lib/utils';
import { GroupAv } from '@/components/Av';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';
import Icon from '@/components/Icon';

export default function Ajos() {
  const { user } = useRequireAuth(), [groups, setGroups] = useState(null), [paid, setPaid] = useState({});
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'groups'), where('members', 'array-contains', user.uid)), async (s) => {
      const gs = s.docs.map((d) => ({ id: d.id, ...d.data() })); setGroups(gs);
      const ex = await Promise.all(gs.map(async (g) => { const q = await getDocs(query(collection(db, 'groups', g.id, 'contributions'), where('cycle', '==', cycleInfo(g).k))).catch(() => null); return [g.id, q ? new Set(q.docs.filter((d) => d.data().status === 'confirmed').map((d) => d.data().uid)).size : 0]; }));
      setPaid(Object.fromEntries(ex));
    });
  }, [user]);
  return (
    <main className="app">
      <Link href="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: 8, alignItems: 'center' }}><Icon n="back" s={18} />Home</Link>
      <div><h1 style={{ fontSize: 28, fontWeight: 700 }}>Your Ajos</h1><p className="m" style={{ fontSize: 14 }}>Rotating group contributions. Everyone pays in and takes a turn to collect.</p></div>
      {!groups && <Skeleton />}
      {groups && groups.length === 0 && <div className="glass"><b>No Ajo yet</b><p className="m" style={{ marginTop: 4 }}>Create one for your people, scan a QR code, or find a public group in Explore.</p></div>}
      {groups && groups.map((g) => { const c = cycleInfo(g), n = paid[g.id] || 0, pct = Math.round((n / Math.max(1, g.members.length)) * 100); return (
        <Link key={g.id} href={'/g/' + g.id} className="glass" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div className="r"><div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><GroupAv g={g} size={54} /><div><b style={{ fontSize: 18 }}>{g.name}</b><div className="m" style={{ fontSize: 15 }}>{naira(g.amount)} every {g.frequencyDays} day{g.frequencyDays > 1 ? 's' : ''}</div></div></div>
            <span className={'tag' + (c.isPackingDay ? ' k' : '')} style={{ fontSize: 14, padding: '8px 14px' }}>{c.isPackingDay ? 'Due today' : 'In ' + c.daysToNext + 'd'}</span></div>
          <div style={{ height: 1, background: '#E6E8EB', margin: '14px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'center' }}>
            <div><div className="m" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>Next contribution</div><b style={{ fontSize: 20 }}>{naira(g.amount + (g.packingFee || 0))}</b></div>
            <div><div className="m" style={{ fontSize: 13 }}>Round progress</div><div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: pct + '%' }} /></div><div className="m" style={{ fontSize: 13 }}>{n} of {g.members.length} paid</div></div>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>Details<Icon n="forward" s={16} /></span>
          </div>
        </Link>); })}
      <Link href="/new"><button className="btn">Create an Ajo</button></Link>
      <TabBar />
    </main>
  );
}
