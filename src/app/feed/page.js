'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { naira } from '@/lib/utils';
import { GroupAv } from '@/components/Av';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';
import Loader from '@/components/Loader';
import Icon from '@/components/Icon';

const ERR = { already_requested: 'You already asked to join this group.', already_member: 'You are already in this group.', not_public: 'This group is no longer public.', not_verified: 'Finish your identity check first.' };
export default function Feed() {
  const { user } = useRequireAuth();
  const [items, setItems] = useState(null), [mine, setMine] = useState(new Set()), [reqs, setReqs] = useState({}), [q, setQ] = useState(''), [sheet, setSheet] = useState(null), [msg, setMsg] = useState(''), [ok, setOk] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const loadReqs = () => getDocs(query(collection(db, 'joinRequests'), where('uid', '==', user.uid))).then((s) => setReqs(Object.fromEntries(s.docs.map((d) => [d.data().gid, d.data().status])))).catch(() => {});
  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'groups'), where('members', 'array-contains', user.uid))).then((s) => setMine(new Set(s.docs.map((d) => d.id)))).catch(() => {});
    loadReqs();
    return onSnapshot(query(collection(db, 'publicGroups'), orderBy('createdAt', 'desc'), limit(40)), (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setItems([]));
  }, [user]);
  async function send() {
    setBusy(true); setErr('');
    try { await api('/api/requests/create', { gid: sheet.id, message: msg }); setSheet(null); setMsg(''); setOk(false); await loadReqs(); }
    catch (e) { setErr(ERR[e.data?.error] || 'Could not send your request. Try again.'); }
    setBusy(false);
  }
  async function cancel(gid) { try { await api('/api/requests/decide', { gid, uid: user.uid, decision: 'cancel' }); await loadReqs(); } catch {} }
  const list = (items || []).filter((g) => !q || (g.name + ' ' + g.description).toLowerCase().includes(q.toLowerCase()));
  return (
    <main className="app">
      <div><h1 style={{ fontSize: 28, fontWeight: 700 }}>Explore</h1><p className="m" style={{ fontSize: 14 }}>Public Ajos you can ask to join. Every member is identity-checked.</p></div>
      <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 14, top: 15, color: '#6B7076' }}><Icon n="search" /></span><input className="inp" style={{ paddingLeft: 44 }} placeholder="Search groups" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {!items && <Skeleton n={3} h={140} />}
      {items && !list.length && <div className="glass"><b>No public groups yet</b><p className="m" style={{ marginTop: 4 }}>Admins can list their group here from Group info.</p></div>}
      {list.map((g) => (
        <div key={g.id} className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}><GroupAv g={{ avatar: g.avatar }} size={52} /><div style={{ minWidth: 0 }}><b style={{ fontSize: 18 }}>{g.name}</b><div className="m" style={{ fontSize: 13 }}>Run by {g.adminName}</div></div></div>
          {g.description && <p style={{ fontSize: 14, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{g.description}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><span className="tag">{naira(g.amount + (g.packingFee || 0))} every {g.frequencyDays} day{g.frequencyDays > 1 ? 's' : ''}</span><span className="tag">{g.memberCount || 1} member{(g.memberCount || 1) > 1 ? 's' : ''}</span></div>
          {mine.has(g.id) ? <Link href={'/g/' + g.id} className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', height: 46 }}>Open group</Link>
            : reqs[g.id] === 'pending' ? <div style={{ display: 'flex', gap: 8 }}><span className="st st-wait" style={{ flex: 1, justifyContent: 'center', height: 46 }}>Request sent</span><button className="btn2" style={{ height: 46, width: 110 }} onClick={() => cancel(g.id)}>Cancel</button></div>
            : reqs[g.id] === 'declined' ? <span className="st st-rej" style={{ justifyContent: 'center', height: 46 }}>Request not accepted</span>
            : <button className="btn" style={{ height: 46 }} onClick={() => { setErr(''); setSheet(g); }}>Request to join</button>}
        </div>))}
      {sheet && (
        <div role="dialog" aria-modal="true" aria-label="Request to join" onClick={() => !busy && setSheet(null)} style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(10,10,12,.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(430px, 100%)', background: '#fff', borderRadius: '28px 28px 0 0', padding: '22px 22px calc(env(safe-area-inset-bottom) + 22px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <b style={{ fontSize: 20 }}>Join {sheet.name}?</b>
            <p className="m" style={{ fontSize: 14, lineHeight: 1.5 }}>The admin will see your Verified badge and your record (best streak, groups, confirmed and late payments) and decides whether to accept you.</p>
            <textarea className="inp" style={{ height: 80, padding: 12 }} maxLength={300} placeholder="Say hello to the admin (optional)" value={msg} onChange={(e) => setMsg(e.target.value)} />
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />I know this group and its admin, or I accept the risk of joining a group of people I have not met.</label>
            {err && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>{err}</p>}
            {busy ? <Loader inline size={30} label="Sending request..." /> : <button className="btn" disabled={!ok} onClick={send}>Send request</button>}
          </div>
        </div>)}
      <TabBar />
    </main>
  );
}
