'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, collection, query, orderBy, where, onSnapshot, addDoc, getDocs, writeBatch, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { naira, haptic } from '@/lib/utils';
import { notify } from '@/lib/notify';
import Av from '@/components/Av';
import GoalRing from '@/components/GoalRing';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';
import Icon, { IconBadge } from '@/components/Icon';

const MILES = [25, 50, 75, 100];
const when = (t) => new Date(t).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) + ', ' + new Date(t).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
const actInfo = (m) => (m.type === 'confirmed' ? ['ok', 'check'] : m.kind === 'submitted' ? ['wait', 'clock'] : /not accepted/.test(m.text || '') ? ['rej', 'x'] : m.type === 'update' ? ['', 'chat'] : /target reached/i.test(m.text || '') ? ['ok', 'flag'] : ['', 'info']);

export default function Goal() {
  const { id } = useParams(), r = useRouter(), { user } = useRequireAuth();
  const [g, setG] = useState(), [members, setMembers] = useState({}), [msgs, setMsgs] = useState([]), [spend, setSpend] = useState([]), [pend, setPend] = useState([]), [recs, setRecs] = useState({});
  const [post, setPost] = useState(''), [sp, setSp] = useState({ title: '', amount: '' }), [showSp, setShowSp] = useState(false), [err, setErr] = useState(''), [allAct, setAllAct] = useState(false);
  useEffect(() => {
    if (!user) return;
    const off = [
      onSnapshot(doc(db, 'goals', id), (s) => (s.exists() ? setG({ id, ...s.data() }) : r.replace('/goals')), () => r.replace('/goals')),
      onSnapshot(collection(db, 'goals', id, 'members'), (s) => setMembers(Object.fromEntries(s.docs.map((d) => [d.id, d.data()])))),
      onSnapshot(query(collection(db, 'goals', id, 'messages'), orderBy('at', 'desc')), (s) => setMsgs(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {}),
      onSnapshot(query(collection(db, 'goals', id, 'spending'), orderBy('at', 'desc')), (s) => setSpend(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {}),
      onSnapshot(query(collection(db, 'goals', id, 'contributions'), where('status', '==', 'pending')), (s) => setPend(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {}),
    ];
    return () => off.forEach((f) => f());
  }, [user, id]);
  if (!g) return <main className="app"><Skeleton n={4} h={110} /></main>;

  const org = g.organizerId === user.uid, collected = g.collected || 0, pct = g.target ? (collected / g.target) * 100 : 0, left = Math.max(0, g.target - collected);
  const days = Math.ceil((g.deadline - Date.now()) / 864e5), spent = spend.reduce((t, x) => t + (x.amount || 0), 0), closed = g.status === 'closed';
  const board = g.members.map((u) => ({ u, total: members[u]?.total || 0 })).sort((a, b) => b.total - a.total);
  const acts = msgs.filter((m) => m.type !== 'text'), shown = allAct ? acts : acts.slice(0, 5);
  const pendingMine = pend.filter((c) => c.uid === user.uid).length;

  async function confirm(c) {
    const b = writeBatch(db), t = Date.now(), hit = collected + c.amount >= g.target && g.status === 'active';
    b.update(doc(db, 'goals', id, 'contributions', c.id), { status: 'confirmed', confirmedAt: t });
    b.update(doc(db, 'goals', id), { collected: increment(c.amount), ...(hit ? { status: 'reached' } : {}) });
    b.update(doc(db, 'goals', id, 'members', c.uid), { total: increment(c.amount) });
    b.set(doc(collection(db, 'goals', id, 'messages')), { type: 'confirmed', text: c.name + "'s contribution was confirmed", amount: c.amount, uid: user.uid, at: t });
    if (hit) b.set(doc(collection(db, 'goals', id, 'messages')), { type: 'system', text: 'Target reached! Thank you, everyone.', uid: user.uid, at: t + 1 });
    await b.commit(); haptic(); notify('confirmed', id, c.uid, 'goal');
  }
  async function reject(c) {
    const why = (window.prompt('Why is this receipt not accepted? The member will see this.') || '').trim(); if (!why) return;
    const b = writeBatch(db);
    b.update(doc(db, 'goals', id, 'contributions', c.id), { status: 'rejected', reason: why });
    b.set(doc(collection(db, 'goals', id, 'messages')), { type: 'system', text: c.name + "'s receipt was not accepted: " + why, amount: c.amount, uid: user.uid, at: Date.now() });
    await b.commit(); notify('rejected', id, c.uid, 'goal');
  }
  async function showRec(c) { if (recs[c.id]) return; const s = await getDocs(query(collection(db, 'goals', id, 'receipts'), where('cid', '==', c.id))); setRecs((p) => ({ ...p, [c.id]: s.docs.map((d) => d.data()) })); }
  async function sendUpdate(e) { e.preventDefault(); const t = post.trim(); if (!t) return; setPost(''); await addDoc(collection(db, 'goals', id, 'messages'), { type: 'update', text: t, uid: user.uid, at: Date.now() }); }
  async function addSpend(e) {
    e.preventDefault(); setErr(''); const a = Math.floor(+sp.amount), t = sp.title.trim(); if (!t || !(a > 0)) return;
    try { const b = writeBatch(db), at = Date.now(); b.set(doc(collection(db, 'goals', id, 'spending')), { title: t, amount: a, at, by: user.uid }); b.set(doc(collection(db, 'goals', id, 'messages')), { type: 'system', text: 'Organizer recorded a spend: ' + t, amount: a, uid: user.uid, at }); await b.commit(); setSp({ title: '', amount: '' }); setShowSp(false); haptic(); }
    catch { setErr('Could not save that entry.'); }
  }

  return (
    <main className="app" style={{ padding: 0, gap: 14 }}>
      <div className="cg-head r" style={{ position: 'sticky', top: 0, zIndex: 15, borderRadius: '0 0 28px 28px', padding: 'calc(env(safe-area-inset-top) + 14px) 18px 14px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
          <Link href="/goals" aria-label="Back" style={{ color: '#fff', display: 'flex' }}><Icon n="back" s={24} /></Link>
          <Link href={'/goal/' + id + '/info'} style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#fff', textDecoration: 'none', minWidth: 0 }}>
            <span className="ibadge" style={{ background: 'rgba(255,255,255,.16)', color: '#7CC7FF' }}><Icon n="flag" /></span>
            <div style={{ minWidth: 0 }}><b style={{ display: 'block', fontSize: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</b><div style={{ fontSize: 13, color: '#B7D3F0' }}>{g.members.length} members &middot; {g.category}</div></div>
          </Link>
        </div>
        {!closed && <Link href={'/goal/' + id + '/pay'} className="pill g" style={{ textDecoration: 'none', flex: 'none' }}>Contribute</Link>}
      </div>

      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {err && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>{err}</p>}
        <div className="glass" style={{ background: 'linear-gradient(160deg,#F2F8FF,#DDEEFF)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <GoalRing pct={pct} size={190} stroke={16}>
            <div style={{ fontSize: 34, fontWeight: 700, color: '#0F3A6B' }}>{Math.min(999, Math.round(pct))}%</div>
            <div style={{ fontSize: 13, color: '#35577F' }}>{g.status === 'reached' ? 'Target reached' : 'of the target'}</div>
          </GoalRing>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 700 }}>{naira(collected)}</div><div className="m" style={{ fontSize: 14 }}>raised of {naira(g.target)}{left > 0 ? ' \u00B7 ' + naira(left) + ' to go' : ''}</div></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span className="st nd" style={{ background: closed ? '#ECEDEF' : g.status === 'reached' ? '#E3F6D0' : days > 0 ? '#DCEEFF' : '#FDE2E0', color: closed ? '#6B7076' : g.status === 'reached' ? '#2C7A1F' : days > 0 ? '#1B5FB8' : '#C0362C' }}><Icon n="clock" s={14} />{closed ? 'Closed' : days > 0 ? days + ' day' + (days > 1 ? 's' : '') + ' left' : 'Deadline passed'}</span>
            {g.suggested > 0 && <span className="st nd" style={{ background: '#EEFBC4', color: '#4C6A00' }}>Suggested {naira(g.suggested)} each</span>}
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'space-between' }} aria-label="Milestones">{MILES.map((m) => <div key={m} style={{ flex: 1, textAlign: 'center' }}><span className="ibadge" style={{ width: 34, height: 34, background: pct >= m ? '#2F7DE1' : '#fff', color: pct >= m ? '#fff' : '#6B7076', border: '1px solid #D5E5F7' }}>{pct >= m ? <Icon n="check" s={16} /> : <span style={{ fontSize: 11, fontWeight: 700 }}>{m}</span>}</span><div className="m" style={{ fontSize: 11, marginTop: 4 }}>{m}%</div></div>)}</div>
        </div>
        {g.description && <p style={{ fontSize: 14, lineHeight: 1.6 }}>{g.description}</p>}
        {pendingMine > 0 && <div className="glass st-wait" style={{ fontSize: 14 }}>You have {pendingMine} contribution{pendingMine > 1 ? 's' : ''} waiting for the organizer to confirm.</div>}

        {org && pend.length > 0 && <div className="dark" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>Organizer to do</b>
          {pend.map((c) => (
            <div key={c.id} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 16, padding: 12, fontSize: 13 }}>
              <div className="r"><b>{c.name}</b><span>{naira(c.amount)}</span></div>
              {!recs[c.id] ? <button className="pill" style={{ marginTop: 8 }} onClick={() => showRec(c)}>View receipts</button> : recs[c.id].map((x, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <img src={x.image} alt="Receipt" style={{ width: 72, height: 96, objectFit: 'cover', borderRadius: 8 }} />
                  <div style={{ lineHeight: 1.6 }}>Amount: {x.extracted?.amount != null ? naira(x.extracted.amount) : 'could not read'}<br />Sender: {x.extracted?.senderName || 'unknown'}<br />{x.flags?.length ? 'Flags: ' + x.flags.join(', ') : 'No flags'}</div>
                </div>))}
              <div style={{ color: '#B8BCC2', marginTop: 6 }}>Checks are flags. Confirm against your bank alert.</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button className="pill g" style={{ flex: 1, justifyContent: 'center' }} onClick={() => confirm(c)}>Mark contribution</button><button className="pill" style={{ background: 'transparent', color: '#fff', border: '1px solid #6B7076' }} onClick={() => reject(c)}>Reject</button></div>
            </div>))}
        </div>}

        <div className="glass">
          <div className="r"><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon n="users" s={22} /><b style={{ fontSize: 17 }}>Who has given</b></span><span className="m" style={{ fontSize: 13 }}>{g.members.length} members</span></div>
          <div style={{ marginTop: 6 }}>{board.map((x, i) => (
            <div key={x.u} className="rowline">
              <Av i={members[x.u]?.avatar || 0} size={40} label={members[x.u]?.name || 'M'} />
              <div style={{ flex: 1, minWidth: 0 }}><div className="r"><b style={{ fontSize: 15 }}>{members[x.u]?.name || 'Member'}{x.u === user.uid ? <span className="m" style={{ fontWeight: 400 }}> (You)</span> : null}</b><b style={{ fontSize: 14 }}>{x.total ? naira(x.total) : '\u2014'}</b></div>
                <div className="bar" style={{ margin: '6px 0 0', background: '#DCE8F5' }}><span style={{ width: Math.min(100, g.target ? (x.total / g.target) * 100 * 4 : 0) + '%', background: '#2F7DE1' }} /></div></div>
              {x.u === g.organizerId && <span className="tag">Organizer</span>}
            </div>))}</div>
        </div>

        <div className="glass">
          <div className="r"><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon n="doc" s={22} /><b style={{ fontSize: 17 }}>Where the money goes</b></span>{org && !closed && <button className="pill g" onClick={() => setShowSp(!showSp)}>{showSp ? 'Cancel' : 'Add entry'}</button>}</div>
          <div className="m" style={{ fontSize: 13, marginTop: 4 }}>Spent {naira(spent)} &middot; {naira(Math.max(0, collected - spent))} still available</div>
          {showSp && <form onSubmit={addSpend} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            <input className="inp" placeholder="What was it for?" value={sp.title} onChange={(e) => setSp({ ...sp, title: e.target.value })} required />
            <input className="inp" type="number" min="1" inputMode="numeric" placeholder="Amount (naira)" value={sp.amount} onChange={(e) => setSp({ ...sp, amount: e.target.value })} required />
            <button className="btn" style={{ height: 44 }}>Save entry</button><span className="m" style={{ fontSize: 12 }}>Entries are visible to every member and cannot be edited or deleted.</span></form>}
          {!spend.length && <p className="m" style={{ marginTop: 8, fontSize: 13 }}>Nothing spent yet.</p>}
          {spend.map((x) => <div key={x.id} className="rowline"><IconBadge n="swap" s={18} /><div style={{ flex: 1, minWidth: 0 }}><b style={{ fontWeight: 500, fontSize: 14 }}>{x.title}</b><div className="m" style={{ fontSize: 12 }}>{when(x.at)}</div></div><b>{naira(x.amount)}</b></div>)}
        </div>

        <div className="glass">
          <div className="r"><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon n="activity" s={22} /><b style={{ fontSize: 17 }}>Updates and activity</b></span>{acts.length > 5 && <button className="m" style={{ background: 'none', fontSize: 13 }} onClick={() => setAllAct(!allAct)}>{allAct ? 'Show less' : 'View all'}</button>}</div>
          {org && !closed && <form onSubmit={sendUpdate} style={{ display: 'flex', gap: 8, marginTop: 10 }}><input className="inp" placeholder="Post an update for the team" value={post} onChange={(e) => setPost(e.target.value)} aria-label="Post an update" /><button className="btn" style={{ width: 52, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Post"><Icon n="send" s={20} /></button></form>}
          {!acts.length && <p className="m" style={{ marginTop: 8, fontSize: 13 }}>Nothing yet.</p>}
          {shown.map((m) => { const [tone, ic] = actInfo(m); return (
            <div key={m.id} className="rowline"><IconBadge n={ic} tone={tone} s={18} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}>{m.type === 'update' && <div className="m" style={{ fontSize: 11 }}>Update from the organizer</div>}<b style={{ fontWeight: 500 }}>{m.text}</b><div className="m" style={{ fontSize: 12 }}>{m.amount ? naira(m.amount) + ' \u00B7 ' : ''}{when(m.at)}</div></div>
            </div>); })}
        </div>
      </div>
      <div style={{ height: 80 }} /><TabBar />
    </main>
  );
}
