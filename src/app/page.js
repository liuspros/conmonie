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
import Tour from '@/components/Tour';
import InstallBanner from '@/components/InstallBanner';
import { isStandalone } from '@/context/InstallContext';

const HSTEPS = [
  { title: 'Welcome to Conmonie', body: 'Run your Ajo with confidence. This quick tour shows you around. You can skip it anytime.' },
  { target: 'bell', title: 'Notifications', body: 'Reminders and confirmations arrive here. A number shows what is new.' },
  { target: 'streak', title: 'Your streak', body: 'Pay on time and your streak grows. Paying late resets it.' },
  { target: 'ajos', title: 'Your Ajos', body: 'Every group you are in is listed below. Tap one to open its chat, checklist and payments.' },
  { target: 'create', title: 'Create an Ajo', body: 'Start your own group, set the amount and payment day, then invite members with a link.' },
  { target: 'join', title: 'Join with a link', body: 'Got an invite from someone? Paste the link here. We will ask you to confirm that you trust them.' },
  { target: 'tab-activities', noScroll: true, title: 'Activities', body: 'Every payment you have sent and whether it was confirmed.' },
  { target: 'tab-me', noScroll: true, title: 'Me', body: 'Your photo, payout account, lock, the install button and this guide again.' },
];

export default function Home() {
  const { user, profile } = useRequireAuth(), r = useRouter();
  const [hi, setHi] = useState('Hello'), [unread, setUnread] = useState(0), [tourDone, setTourDone] = useState(false), [showInstall, setShowInstall] = useState(false), [groups, setGroups] = useState(null), [streak, setStreak] = useState(0), [link, setLink] = useState(''), [open, setOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'groups'), where('members', 'array-contains', user.uid)), async (s) => {
      const gs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setGroups(gs);
      const ms = await Promise.all(gs.map((g) => getDoc(doc(db, 'groups', g.id, 'members', user.uid)).catch(() => null)));
      setStreak(Math.max(0, ...ms.map((m) => (m && m.exists() ? m.data().streak || 0 : 0))));
    });
  }, [user]);
  useEffect(() => { if (user) return onSnapshot(query(collection(db, 'users', user.uid, 'notifications'), where('read', '==', false)), (s) => setUnread(s.size), () => {}); }, [user]);
  useEffect(() => { // install card: shown once, on the first visit, after the guide
    if (!tourDone || isStandalone()) return;
    try { if (!localStorage.getItem('conmonie-install-seen')) { localStorage.setItem('conmonie-install-seen', '1'); setShowInstall(true); } } catch {}
  }, [tourDone]);
  useEffect(() => { const h = new Date().getHours(); setHi(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'); }, []);
  const goJoin = () => { const c = link.trim().split('/').filter(Boolean).pop(); if (c) r.push('/join/' + c); };
  return (
    <main className="app">
      <div className="r"><div><div className="m">{hi}</div><h1 style={{ fontSize: 28, fontWeight: 700 }}>{profile ? profile.name.split(' ')[0] : '\u00A0'}</h1></div><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Link data-tour="bell" href="/notifications" aria-label={unread ? unread + ' unread notifications' : 'Notifications'} style={{ position: 'relative', width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,.8)', border: '1px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>{unread > 0 && <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, background: '#0A0A0A', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{unread > 9 ? '9+' : unread}</span>}</Link><Link href="/me"><Av i={profile?.avatar} size={44} /></Link></div></div>
      {showInstall && <InstallBanner onClose={() => setShowInstall(false)} />}
      <div className="dark r" data-tour="streak"><div><div style={{ fontSize: 12, color: '#B8BCC2' }}>On-time streak</div><div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.1 }}>{streak}</div><div style={{ fontSize: 13, color: '#B8BCC2' }}>contributions in a row</div></div>
        <div style={{ width: 92, height: 92, borderRadius: 24, background: '#ECECEC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src="/3d/rocket.jpg" width="76" height="76" alt="" /></div></div>
      <div className="r" data-tour="ajos"><h2 style={{ fontSize: 18 }}>Your Ajos</h2><span className="m">{groups ? groups.length + ' active' : ''}</span></div>
      {!groups && <Skeleton />}
      {groups && groups.length === 0 && <div className="glass"><b>No Ajo yet</b><p className="m" style={{ marginTop: 4 }}>Create one for your people, or join with a link.</p></div>}
      {groups && groups.map((g) => { const c = cycleInfo(g); return (
        <Link key={g.id} href={'/g/' + g.id} className="glass r" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Av i={g.avatar || 0} src={g.dp} size={42} /><div><b>{g.name}</b><div className="m">{naira(g.amount)} every {g.frequencyDays} day{g.frequencyDays > 1 ? 's' : ''}</div></div></div>
          <span className={'tag' + (c.isPackingDay ? ' k' : '')}>{c.isPackingDay ? 'Due today' : 'In ' + c.daysToNext + 'd'}</span>
        </Link>); })}
      <Link href="/new"><button className="btn" data-tour="create">Create an Ajo</button></Link>
      {open ? <div data-tour="join" style={{ display: 'flex', gap: 8 }}><input className="inp" placeholder="Paste invite link" value={link} onChange={(e) => setLink(e.target.value)} /><button className="btn" style={{ width: 90 }} onClick={goJoin}>Go</button></div>
        : <button className="btn2" data-tour="join" onClick={() => setOpen(true)}>Join with a link</button>}
      <TabBar />
      <Tour id="home" steps={HSTEPS} enabled={groups !== null} onDone={() => setTourDone(true)} />
    </main>
  );
}
