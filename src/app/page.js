'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { cycleInfo, naira } from '@/lib/utils';
import Av from '@/components/Av';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';

export default function Home() {
  const { user, profile } = useRequireAuth(), r = useRouter();
  const [groups, setGroups] = useState(null), [streak, setStreak] = useState(0), [link, setLink] = useState(''), [open, setOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'groups'), where('members', 'array-contains', user.uid)), async (s) => {
      const gs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setGroups(gs);
      const ms = await Promise.all(gs.map((g) => getDoc(doc(db, 'groups', g.id, 'members', user.uid)).catch(() => null)));
      setStreak(Math.max(0, ...ms.map((m) => (m && m.exists() ? m.data().streak || 0 : 0))));
    });
  }, [user]);
  const hour = new Date().getHours(), hi = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const goJoin = () => { const c = link.trim().split('/').filter(Boolean).pop(); if (c) r.push('/join/' + c); };
  return (
    <main className="app">
      <div className="r"><div><div className="m">{hi}</div><h1 style={{ fontSize: 28, fontWeight: 700 }}>{profile ? profile.name.split(' ')[0] : '\u00A0'}</h1></div><Link href="/me"><Av i={profile?.avatar} size={44} /></Link></div>
      <div className="dark r"><div><div style={{ fontSize: 12, color: '#B8BCC2' }}>On-time streak</div><div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.1 }}>{streak}</div><div style={{ fontSize: 13, color: '#B8BCC2' }}>contributions in a row</div></div>
        <div style={{ width: 92, height: 92, borderRadius: 24, background: '#ECECEC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/3d/rocket.jpg" width="76" height="76" alt="" /></div></div>
      <div className="r"><h2 style={{ fontSize: 18 }}>Your Ajos</h2><span className="m">{groups ? groups.length + ' active' : ''}</span></div>
      {!groups && <Skeleton />}
      {groups && groups.length === 0 && <div className="glass"><b>No Ajo yet</b><p className="m" style={{ marginTop: 4 }}>Create one for your people, or join with a link.</p></div>}
      {groups && groups.map((g) => { const c = cycleInfo(g); return (
        <Link key={g.id} href={'/g/' + g.id} className="glass r" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Av i={g.avatar || 0} size={42} /><div><b>{g.name}</b><div className="m">{naira(g.amount)} every {g.frequencyDays} day{g.frequencyDays > 1 ? 's' : ''}</div></div></div>
          <span className={'tag' + (c.isPackingDay ? ' k' : '')}>{c.isPackingDay ? 'Due today' : 'In ' + c.daysToNext + 'd'}</span>
        </Link>); })}
      <Link href="/new"><button className="btn">Create an Ajo</button></Link>
      {open ? <div style={{ display: 'flex', gap: 8 }}><input className="inp" placeholder="Paste invite link" value={link} onChange={(e) => setLink(e.target.value)} /><button className="btn" style={{ width: 90 }} onClick={goJoin}>Go</button></div>
        : <button className="btn2" onClick={() => setOpen(true)}>Join with a link</button>}
      <TabBar />
    </main>
  );
}
