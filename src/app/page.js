'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, getDoc, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { cycleInfo, naira } from '@/lib/utils';
import Av, { GroupAv } from '@/components/Av';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';
import Icon from '@/components/Icon';
import Tour from '@/components/Tour';
import InstallBanner from '@/components/InstallBanner';
import { isStandalone } from '@/context/InstallContext';

const HSTEPS = [
  { title: 'Welcome to Conmonie', body: 'Run your Ajo with confidence. This quick tour shows you around. You can skip it anytime.' },
  { target: 'bell', title: 'Notifications', body: 'Reminders and confirmations arrive here. A dot shows when there is something new.' },
  { target: 'streak', title: 'Your contributions', body: 'The total of all your confirmed payments, and your on-time streak. Tap View Transactions for receipts you can share.' },
  { target: 'create', title: 'Create an Ajo', body: 'Start your own group, set the amount and payment day, then invite members with a link or a QR code.' },
  { target: 'join', title: 'Join with a link', body: 'Got an invite link? Paste it here.' },
  { target: 'scan', title: 'Scan a QR code', body: 'Scan a group QR code from the admin to join in seconds.' },
  { target: 'ajos', title: 'Your Ajos', body: 'Every group you are in is listed below. Tap one to open its chat, checklist and payments.' },
  { target: 'tab-explore', noScroll: true, title: 'Explore', body: 'Find public Ajos and request to join. The admin decides after checking your record.' },
  { target: 'tab-activities', noScroll: true, title: 'Activities', body: 'Every payment you have made, with a receipt you can share or download.' },
  { target: 'tab-me', noScroll: true, title: 'Me', body: 'Your photo, payout account, lock, how it works, and this guide again.' },
];

export default function Home() {
  const { user, profile } = useRequireAuth(), r = useRouter();
  const [hi, setHi] = useState('Hello'), [unread, setUnread] = useState(0), [groups, setGroups] = useState(null), [streak, setStreak] = useState(0), [total, setTotal] = useState(0), [paid, setPaid] = useState({});
  const [hide, setHide] = useState(false), [link, setLink] = useState(''), [open, setOpen] = useState(false), [tourDone, setTourDone] = useState(false), [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'groups'), where('members', 'array-contains', user.uid)), async (s) => {
      const gs = s.docs.map((d) => ({ id: d.id, ...d.data() })); setGroups(gs);
      const ex = await Promise.all(gs.map(async (g) => {
        const ci = cycleInfo(g);
        const [m, mine, round] = await Promise.all([
          getDoc(doc(db, 'groups', g.id, 'members', user.uid)).catch(() => null),
          getDocs(query(collection(db, 'groups', g.id, 'contributions'), where('uid', '==', user.uid))).catch(() => null),
          getDocs(query(collection(db, 'groups', g.id, 'contributions'), where('cycle', '==', ci.k))).catch(() => null)]);
        return { id: g.id, streak: m && m.exists() ? m.data().streak || 0 : 0,
          total: mine ? mine.docs.reduce((t, d) => (d.data().status === 'confirmed' ? t + (d.data().required || 0) : t), 0) : 0,
          paid: round ? new Set(round.docs.filter((d) => d.data().status === 'confirmed').map((d) => d.data().uid)).size : 0 };
      }));
      setStreak(Math.max(0, ...ex.map((e) => e.streak))); setTotal(ex.reduce((t, e) => t + e.total, 0)); setPaid(Object.fromEntries(ex.map((e) => [e.id, e.paid])));
    });
  }, [user]);
  useEffect(() => { if (user) return onSnapshot(query(collection(db, 'users', user.uid, 'notifications'), where('read', '==', false)), (s) => setUnread(s.size), () => {}); }, [user]);
  useEffect(() => { try { setHide(localStorage.getItem('conmonie-hide') === '1'); } catch {} }, []);
  useEffect(() => {
    if (!tourDone || isStandalone()) return;
    try { if (!localStorage.getItem('conmonie-install-seen')) { localStorage.setItem('conmonie-install-seen', '1'); setShowInstall(true); } } catch {}
  }, [tourDone]);
  useEffect(() => { const h = new Date().getHours(); setHi(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'); }, []);
  const toggle = () => { const n = !hide; setHide(n); try { localStorage.setItem('conmonie-hide', n ? '1' : '0'); } catch {} };
  const goJoin = () => { const c = link.trim().split('/').filter(Boolean).pop(); if (c) r.push('/join/' + c); };

  return (
    <main className="app">
      <div className="r">
        <div><div className="m" style={{ fontSize: 16 }}>{hi}</div><h1 style={{ fontSize: 30, fontWeight: 700 }}>{profile ? profile.name.split(' ')[0] : '\u00A0'}</h1></div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Link data-tour="bell" href="/notifications" aria-label={unread ? unread + ' unread notifications' : 'Notifications'} style={{ position: 'relative', color: '#0A0A0A', display: 'flex' }}>
            <Icon n="bell" s={26} />{unread > 0 && <span style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, background: '#0A0A0A', border: '2px solid #fff' }} />}</Link>
          <Link href="/me"><Av i={profile?.avatar} size={46} /></Link>
        </div>
      </div>
      {showInstall && <InstallBanner onClose={() => setShowInstall(false)} />}
      <div className="dark" data-tour="streak" style={{ padding: 20 }}>
        <div className="r"><div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 16 }}>Total Contributions <Icon n="info" s={16} c="#B8BCC2" /></div>
          <button className="pill" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', gap: 6 }} onClick={toggle} aria-pressed={hide}><Icon n={hide ? 'eye' : 'eyeOff'} s={16} />{hide ? 'Show' : 'Hide'}</button></div>
        <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1, margin: '12px 0 2px' }}>{hide ? '\u20A6 \u2022\u2022\u2022\u2022\u2022\u2022' : '\u20A6' + total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
        <div style={{ color: '#B8BCC2', fontSize: 14 }}>Across all your Ajos</div>
        <div style={{ height: 1, background: 'rgba(255,255,255,.14)', margin: '14px 0' }} />
        <div className="r"><Link href="/activities" style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#fff', textDecoration: 'none', fontSize: 16 }}><span className="ibadge" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', width: 40, height: 40 }}><Icon n="doc" s={18} /></span>View Transactions</Link>
          <span className="st" style={{ background: 'rgba(200,241,53,.16)', color: '#C8F135' }}><Icon n="flame" s={14} />{streak} streak</span></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        <Link data-tour="create" href="/new" className="glass act"><Icon n="plus" />Create</Link>
        <button data-tour="join" className="glass act" onClick={() => setOpen(!open)}><Icon n="link" />Join</button>
        <Link data-tour="scan" href="/scan" className="glass act"><Icon n="scan" />Scan</Link>
      </div>
      {open && <div style={{ display: 'flex', gap: 8 }}><input className="inp" placeholder="Paste invite link or code" value={link} onChange={(e) => setLink(e.target.value)} /><button className="btn" style={{ width: 90 }} onClick={goJoin}>Go</button></div>}
      <div className="r" data-tour="ajos"><h2 style={{ fontSize: 20, fontWeight: 600 }}>Your Ajos</h2><span className="m" style={{ fontSize: 15 }}>{groups ? groups.length + ' active' : ''}</span></div>
      {!groups && <Skeleton />}
      {groups && groups.length === 0 && <div className="glass"><b>No Ajo yet</b><p className="m" style={{ marginTop: 4 }}>Create one for your people, scan a QR code, or find a public group in Explore.</p></div>}
      {groups && groups.map((g) => { const c = cycleInfo(g), n = paid[g.id] || 0, pct = Math.round((n / Math.max(1, g.members.length)) * 100); return (
        <Link key={g.id} href={'/g/' + g.id} className="glass" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div className="r"><div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><GroupAv g={g} size={54} /><div><b style={{ fontSize: 18 }}>{g.name}</b><div className="m" style={{ fontSize: 15 }}>{naira(g.amount)} every {g.frequencyDays} day{g.frequencyDays > 1 ? 's' : ''}</div></div></div>
            <span className={'tag' + (c.isPackingDay ? ' k' : '')} style={{ fontSize: 14, padding: '8px 14px' }}>{c.isPackingDay ? 'Due today' : 'In ' + c.daysToNext + 'd'}</span></div>
          <div style={{ height: 1, background: '#E6E8EB', margin: '14px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto', gap: 14, alignItems: 'center' }}>
            <div><div className="m" style={{ fontSize: 13 }}>Next contribution</div><b style={{ fontSize: 20 }}>{naira(g.amount + (g.packingFee || 0))}</b></div>
            <div><div className="m" style={{ fontSize: 13 }}>Round progress</div><div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: pct + '%' }} /></div><div className="m" style={{ fontSize: 13 }}>{n} of {g.members.length} paid</div></div>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>Details<Icon n="forward" s={16} /></span>
          </div>
        </Link>); })}
      <TabBar />
      <Tour id="home" steps={HSTEPS} enabled={groups !== null} onDone={() => setTourDone(true)} />
    </main>
  );
}
