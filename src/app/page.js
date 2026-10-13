'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, getDoc, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import Av from '@/components/Av';
import TabBar from '@/components/TabBar';
import Icon from '@/components/Icon';
import GoalRing from '@/components/GoalRing';
import Tour from '@/components/Tour';
import InstallBanner from '@/components/InstallBanner';
import { isStandalone } from '@/context/InstallContext';

const HSTEPS = [
  { title: 'Welcome to Conmonie', body: 'Save together with people you can trust. This quick tour shows you around. You can skip it anytime.' },
  { target: 'bell', title: 'Notifications', body: 'Reminders and confirmations arrive here. A dot shows when there is something new.' },
  { target: 'streak', title: 'Your contributions', body: 'The total of all your confirmed payments across Ajos and ConGoals, and your on-time streak. Tap View Transactions for receipts you can share.' },
  { target: 'create', title: 'Create', body: 'Start an Ajo or a ConGoal, then invite people with a link or a QR code.' },
  { target: 'join', title: 'Join with a link', body: 'Got an invite link? Paste it here.' },
  { target: 'scan', title: 'Scan a QR code', body: 'Scan a QR code from an Ajo admin or a ConGoal organizer to join in seconds.' },
  { target: 'ajos-card', title: 'Ajos', body: 'Rotating group contributions: everyone pays in each round and takes a turn to collect.' },
  { target: 'congoal-card', title: 'ConGoal', body: 'Save toward one shared target with a deadline, such as equipment for a class, a trip or a project. Everyone sees the progress.' },
  { target: 'tab-explore', noScroll: true, title: 'Explore', body: 'Find public Ajos and request to join. The admin decides after checking your record.' },
  { target: 'tab-activities', noScroll: true, title: 'Activities', body: 'Every payment you have made, with a receipt you can share or download.' },
  { target: 'tab-me', noScroll: true, title: 'Me', body: 'Your photo, payout account, lock, how it works, and this guide again.' },
];

export default function Home() {
  const { user, profile } = useRequireAuth(), r = useRouter();
  const [hi, setHi] = useState('Hello'), [unread, setUnread] = useState(0), [ajos, setAjos] = useState(null), [goals, setGoals] = useState(null), [streak, setStreak] = useState(0), [ajoTotal, setAjoTotal] = useState(0), [goalTotal, setGoalTotal] = useState(0);
  const [hide, setHide] = useState(false), [tip, setTip] = useState(false), [link, setLink] = useState(''), [open, setOpen] = useState(false), [sheet, setSheet] = useState(false), [tourDone, setTourDone] = useState(false), [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'groups'), where('members', 'array-contains', user.uid)), async (s) => {
      const gs = s.docs.map((d) => ({ id: d.id, ...d.data() })); setAjos(gs.length);
      const ex = await Promise.all(gs.map(async (g) => {
        const [m, mine] = await Promise.all([getDoc(doc(db, 'groups', g.id, 'members', user.uid)).catch(() => null), getDocs(query(collection(db, 'groups', g.id, 'contributions'), where('uid', '==', user.uid))).catch(() => null)]);
        return { streak: m && m.exists() ? m.data().streak || 0 : 0, total: mine ? mine.docs.reduce((t, d) => (d.data().status === 'confirmed' ? t + (d.data().required || 0) : t), 0) : 0 };
      }));
      setStreak(Math.max(0, ...ex.map((e) => e.streak))); setAjoTotal(ex.reduce((t, e) => t + e.total, 0));
    });
  }, [user]);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(query(collection(db, 'goals'), where('members', 'array-contains', user.uid)), async (s) => {
      const gs = s.docs.map((d) => ({ id: d.id, ...d.data() })); setGoals(gs);
      const mine = await Promise.all(gs.map((g) => getDocs(query(collection(db, 'goals', g.id, 'contributions'), where('uid', '==', user.uid))).catch(() => null)));
      setGoalTotal(mine.reduce((t, q) => t + (q ? q.docs.reduce((a, d) => (d.data().status === 'confirmed' ? a + (d.data().amount || 0) : a), 0) : 0), 0));
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
  const total = ajoTotal + goalTotal, tgt = (goals || []).reduce((t, g) => t + (g.target || 0), 0), col = (goals || []).reduce((t, g) => t + (g.collected || 0), 0), pct = tgt ? Math.round((col / tgt) * 100) : 0;

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
        <div className="r"><div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 16 }}>Total Contributions <button type="button" aria-label="What is this?" aria-expanded={tip} onClick={() => setTip(!tip)} style={{ background: 'none', color: '#B8BCC2', display: 'flex', padding: 4 }}><Icon n="info" s={16} /></button></div>
          <button className="pill" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', gap: 6 }} onClick={toggle} aria-pressed={hide}><Icon n={hide ? 'eye' : 'eyeOff'} s={16} />{hide ? 'Show' : 'Hide'}</button></div>
        {tip && <p role="note" style={{ fontSize: 13, color: '#D3D6DA', lineHeight: 1.5, marginTop: 10 }}>The total of all your payments that admins and organizers have confirmed, in Ajos and ConGoals, including any packing or late fees. Payments still waiting for confirmation are not counted.</p>}
        <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1, margin: '12px 0 2px' }}>{hide ? '\u20A6 \u2022\u2022\u2022\u2022\u2022\u2022' : '\u20A6' + total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</div>
        <div style={{ color: '#B8BCC2', fontSize: 14 }}>Across your Ajos and ConGoals</div>
        <div style={{ height: 1, background: 'rgba(255,255,255,.14)', margin: '14px 0' }} />
        <div className="r"><Link href="/activities" style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#fff', textDecoration: 'none', fontSize: 16 }}><span className="ibadge" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', width: 40, height: 40 }}><Icon n="doc" s={18} /></span>View Transactions</Link>
          <span className="st nd" style={{ background: 'rgba(200,241,53,.16)', color: '#C8F135' }}><Icon n="flame" s={14} />{streak} streak</span></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        <button data-tour="create" className="glass act" onClick={() => setSheet(true)}><Icon n="plus" />Create</button>
        <button data-tour="join" className="glass act" onClick={() => setOpen(!open)}><Icon n="link" />Join</button>
        <Link data-tour="scan" href="/scan" className="glass act"><Icon n="scan" />Scan</Link>
      </div>
      {open && <div style={{ display: 'flex', gap: 8 }}><input className="inp" placeholder="Paste invite link or code" value={link} onChange={(e) => setLink(e.target.value)} /><button className="btn" style={{ width: 90 }} onClick={goJoin}>Go</button></div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Link data-tour="ajos-card" href="/ajos" className="fcard" style={{ background: 'rgba(255,255,255,.9)' }}>
          <span className="ibadge g" style={{ width: 52, height: 52 }}><svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="21" r="12" fill="none" stroke="#0A0A0A" strokeWidth="3.6" /><circle cx="20" cy="9" r="4.2" fill="#C8F135" stroke="#0A0A0A" strokeWidth="1.8" /></svg></span>
          <div><b style={{ fontSize: 22 }}>Ajos</b><div className="m" style={{ fontSize: 13, lineHeight: 1.4, marginTop: 2 }}>Rotating group contributions</div></div>
          <div className="r"><span className="tag">{ajos == null ? '...' : ajos + ' active'}</span><Icon n="forward" s={18} /></div>
        </Link>
        <Link data-tour="congoal-card" href="/goals" className="fcard" style={{ background: 'linear-gradient(160deg, #E6F3FF, #BCDDFF)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <GoalRing pct={pct} size={52} stroke={7}><Icon n="flag" s={18} c="#1B5FB8" /></GoalRing>
            {goals && goals.length > 0 && <span className="m" style={{ fontSize: 12, fontWeight: 600, color: '#1B5FB8' }}>{pct}%</span>}
          </div>
          <div><b style={{ fontSize: 22, color: '#0F3A6B' }}>ConGoal</b><div style={{ fontSize: 13, lineHeight: 1.4, marginTop: 2, color: '#35577F' }}>Shared savings goals for any group</div></div>
          <div className="r"><span className="tag" style={{ background: 'rgba(255,255,255,.7)', color: '#0F3A6B' }}>{goals == null ? '...' : goals.length + ' active'}</span><Icon n="forward" s={18} c="#0F3A6B" /></div>
        </Link>
      </div>

      {sheet && (
        <div role="dialog" aria-modal="true" aria-label="What do you want to create?" onClick={() => setSheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(10,10,12,.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(430px, 100%)', background: '#fff', borderRadius: '28px 28px 0 0', padding: '22px 22px calc(env(safe-area-inset-bottom) + 22px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="r"><b style={{ fontSize: 20 }}>What do you want to create?</b><button aria-label="Close" onClick={() => setSheet(false)} style={{ background: 'none' }}><Icon n="x" /></button></div>
            <Link href="/new" className="glass" style={{ display: 'flex', gap: 14, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}><span className="ibadge g"><Icon n="swap" /></span><div style={{ flex: 1 }}><b>An Ajo</b><div className="m" style={{ fontSize: 13 }}>Everyone pays in every round and takes a turn to collect.</div></div><Icon n="right" s={18} /></Link>
            <Link href="/goals/new" className="glass" style={{ display: 'flex', gap: 14, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}><span className="ibadge" style={{ background: '#DCEEFF', color: '#1B5FB8' }}><Icon n="flag" /></span><div style={{ flex: 1 }}><b>A ConGoal</b><div className="m" style={{ fontSize: 13 }}>Save toward one shared target before a deadline.</div></div><Icon n="right" s={18} /></Link>
          </div>
        </div>)}
      <TabBar />
      <Tour id="home" steps={HSTEPS} enabled={ajos !== null && goals !== null} onDone={() => setTourDone(true)} />
    </main>
  );
}
