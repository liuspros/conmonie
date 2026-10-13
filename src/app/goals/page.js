'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { naira } from '@/lib/utils';
import GoalRing from '@/components/GoalRing';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';
import Icon from '@/components/Icon';

export const daysLeft = (t) => Math.ceil((t - Date.now()) / 864e5);
const IDEAS = ['Equipment for your class or lab team', 'A trip for friends or a club', 'A family emergency fund', 'A church, mosque or community project', 'A birthday, wedding or farewell gift'];
export default function Goals() {
  const { user } = useRequireAuth(), [goals, setGoals] = useState(null);
  useEffect(() => { if (user) return onSnapshot(query(collection(db, 'goals'), where('members', 'array-contains', user.uid)), (s) => setGoals(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)), () => setGoals([])); }, [user]);
  return (
    <main className="app">
      <Link href="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: 8, alignItems: 'center' }}><Icon n="back" s={18} />Home</Link>
      <div className="cg-head" style={{ borderRadius: 28, padding: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#7CC7FF', fontWeight: 600, fontSize: 13 }}><Icon n="flag" s={16} />CONGOAL</span>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>Save together toward one target</h1>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: '#CFE3F8' }}>Set a target and a deadline, invite your people, and watch the goal fill up. Everyone can see who gave and where the money goes.</p>
      </div>
      {!goals && <Skeleton n={2} h={110} />}
      {goals && goals.length === 0 && <div className="glass"><b>Ideas to start with</b><ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 14, lineHeight: 1.8 }}>{IDEAS.map((i) => <li key={i}>{i}</li>)}</ul></div>}
      {goals && goals.map((g) => { const pct = g.target ? Math.round(((g.collected || 0) / g.target) * 100) : 0, d = daysLeft(g.deadline); return (
        <Link key={g.id} href={'/goal/' + g.id} className="glass" style={{ display: 'flex', gap: 16, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          <GoalRing pct={pct} size={76} stroke={9}><b style={{ fontSize: 15 }}>{Math.min(pct, 999)}%</b></GoalRing>
          <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 17, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</b>
            <div className="m" style={{ fontSize: 13 }}>{naira(g.collected || 0)} of {naira(g.target)}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              <span className="tag" style={{ background: g.status === 'reached' ? '#E3F6D0' : '#DCEEFF', color: g.status === 'reached' ? '#2C7A1F' : '#1B5FB8' }}>{g.status === 'reached' ? 'Target reached' : g.status === 'closed' ? 'Closed' : d > 0 ? d + ' day' + (d > 1 ? 's' : '') + ' left' : 'Deadline passed'}</span>
              <span className="tag">{g.members.length} member{g.members.length > 1 ? 's' : ''}</span></div></div>
          <Icon n="right" s={18} c="#6B7076" />
        </Link>); })}
      <Link href="/goals/new"><button className="btn">Create a ConGoal</button></Link>
      <TabBar />
    </main>
  );
}
