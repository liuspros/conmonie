'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, collection, query, orderBy, where, onSnapshot, addDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { cycleInfo, naira, haptic } from '@/lib/utils';
import Av from '@/components/Av';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';

export default function Group() {
  const { id } = useParams(), r = useRouter(), { user, profile } = useRequireAuth();
  const [g, setG] = useState(), [members, setMembers] = useState({}), [msgs, setMsgs] = useState([]), [cons, setCons] = useState([]);
  const [packer, setPacker] = useState(null), [text, setText] = useState(''), [recs, setRecs] = useState({}), [copied, setCopied] = useState(false);
  const ci = useMemo(() => (g ? cycleInfo(g) : null), [g]);
  const isAdmin = g && user && g.adminId === user.uid;

  useEffect(() => {
    if (!user) return;
    const off = [
      onSnapshot(doc(db, 'groups', id), (s) => (s.exists() ? setG({ id, ...s.data() }) : r.replace('/')), () => r.replace('/')),
      onSnapshot(collection(db, 'groups', id, 'members'), (s) => setMembers(Object.fromEntries(s.docs.map((d) => [d.id, d.data()])))),
      onSnapshot(query(collection(db, 'groups', id, 'messages'), orderBy('at')), (s) => setMsgs(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
    ];
    return () => off.forEach((f) => f());
  }, [user, id]);
  useEffect(() => {
    if (!ci) return;
    return onSnapshot(query(collection(db, 'groups', id, 'contributions'), where('cycle', '==', ci.k)), (s) => setCons(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [id, ci && ci.k]);
  useEffect(() => { if (ci && ci.packerUid) getDoc(doc(db, 'users', ci.packerUid)).then((s) => setPacker({ uid: ci.packerUid, ...s.data() })); }, [ci && ci.packerUid]);

  const send = async (e) => { e.preventDefault(); const t = text.trim(); if (!t) return; setText(''); await addDoc(collection(db, 'groups', id, 'messages'), { type: 'text', text: t, uid: user.uid, name: profile?.name || 'Member', at: Date.now() }); };
  const sys = (b, t) => b.set(doc(collection(db, 'groups', id, 'messages')), { type: 'system', text: t, uid: user.uid, at: Date.now() });
  async function confirm(c) {
    const b = writeBatch(db), m = members[c.uid] || {}, streak = c.late ? 0 : (m.streak || 0) + 1;
    b.update(doc(db, 'groups', id, 'contributions', c.id), { status: 'confirmed', confirmedAt: Date.now() });
    b.update(doc(db, 'groups', id, 'members', c.uid), { streak, best: Math.max(m.best || 0, streak) });
    sys(b, c.name + "'s contribution confirmed by admin");
    await b.commit(); haptic();
  }
  async function reject(c) { const b = writeBatch(db); b.update(doc(db, 'groups', id, 'contributions', c.id), { status: 'rejected' }); sys(b, c.name + "'s receipt was not accepted"); await b.commit(); }
  async function paidPacker() { const b = writeBatch(db); sys(b, 'Admin paid ' + (packer?.name || 'the packer') + ' for this round'); await b.commit(); }
  async function showRec(c) { if (recs[c.id]) return; const s = await getDocs(query(collection(db, 'groups', id, 'receipts'), where('cid', '==', c.id))); setRecs((p) => ({ ...p, [c.id]: s.docs.map((d) => d.data()) })); }
  const copyInvite = () => { navigator.clipboard.writeText(location.origin + '/join/' + g.inviteCode); haptic(); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  if (!g) return <main className="app"><Skeleton n={4} h={90} /></main>;
  const status = (uid) => (cons.find((c) => c.uid === uid && c.status !== 'rejected') || {}).status;
  const pending = cons.filter((c) => c.status === 'pending'), confirmed = cons.filter((c) => c.status === 'confirmed').length;
  return (
    <main className="app" style={{ padding: 0, gap: 12 }}>
      <div className="dark r" style={{ borderRadius: '0 0 28px 28px', padding: 'calc(env(safe-area-inset-top) + 18px) 20px 16px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Link href="/" aria-label="Back" style={{ color: '#fff', fontSize: 26, textDecoration: 'none' }}>&lsaquo;</Link><Av i={g.avatar || 0} size={40} /><div><b>{g.name}</b><div style={{ fontSize: 12, color: '#B8BCC2' }}>{g.members.length} members</div></div></div>
        <Link href={'/g/' + id + '/pay'} className="pill" style={{ textDecoration: 'none' }}>Pay contribution</Link>
      </div>
      {ci.isPackingDay && packer && <div className="glass" style={{ margin: '0 20px', padding: '10px 14px', fontSize: 13 }}><b>Pinned &middot; Packing day</b><br />{packer.name} packs today.{packer.payout ? ' ' + packer.payout.bank + ' ' + packer.payout.number : ' No payout account saved yet.'}</div>}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="glass"><div className="r"><b>Checklist</b><span className="m">{confirmed} of {g.members.length} confirmed</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, fontSize: 14 }}>
            {g.members.map((u) => { const s = status(u); return <div key={u} className="r"><span>{members[u]?.name || '...'}</span><span className={'tag' + (s === 'confirmed' ? ' k' : '')}>{s === 'confirmed' ? 'Confirmed' : s === 'pending' ? 'Awaiting admin' : 'Not paid'}</span></div>; })}
          </div></div>
        {isAdmin && <div className="dark" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>Admin</b>
          <div className="r" style={{ fontSize: 13 }}><span style={{ color: '#B8BCC2' }}>Invite link</span><button className="pill" onClick={copyInvite}>{copied ? 'Copied' : 'Copy link'}</button></div>
          {ci.isPackingDay && packer && <div className="r" style={{ fontSize: 13 }}><span style={{ color: '#B8BCC2' }}>Pay {packer.name} today</span><button className="pill" onClick={paidPacker}>Mark paid</button></div>}
          {pending.length === 0 && <span style={{ fontSize: 13, color: '#B8BCC2' }}>No receipts waiting.</span>}
          {pending.map((c) => (
            <div key={c.id} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 16, padding: 12, fontSize: 13 }}>
              <div className="r"><b>{c.name}</b><span>{c.count} &times; contribution &middot; {naira(c.required)}{c.late ? ' (late)' : ''}</span></div>
              {!recs[c.id] ? <button className="pill" style={{ marginTop: 8 }} onClick={() => showRec(c)}>View receipts</button> : recs[c.id].map((x, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <img src={x.image} alt="Receipt" style={{ width: 72, height: 96, objectFit: 'cover', borderRadius: 8 }} />
                  <div style={{ lineHeight: 1.6 }}>Amount: {x.extracted?.amount != null ? naira(x.extracted.amount) : 'could not read'}<br />Sender: {x.extracted?.senderName || 'unknown'}<br />{x.flags?.length ? 'Flags: ' + x.flags.join(', ') : 'No flags'}</div>
                </div>))}
              <div style={{ color: '#B8BCC2', marginTop: 6 }}>Checks are flags. Confirm against your bank alert.</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button className="pill" style={{ flex: 1, justifyContent: 'center' }} onClick={() => confirm(c)}>Mark contribution</button><button className="pill" style={{ background: 'transparent', color: '#fff', border: '1px solid #6B7076' }} onClick={() => reject(c)}>Reject</button></div>
            </div>))}
        </div>}
        {msgs.map((m) => m.type === 'system'
          ? <div key={m.id} style={{ alignSelf: 'center' }}><span className="tag" style={{ fontWeight: 500, color: '#6B7076' }}>{m.text}</span></div>
          : m.uid === user.uid
            ? <div key={m.id} style={{ alignSelf: 'flex-end', background: 'linear-gradient(145deg,#2E2E31,#050506)', color: '#fff', borderRadius: 20, padding: '10px 14px', maxWidth: '80%', fontSize: 14 }}>{m.text}</div>
            : <div key={m.id} className="glass" style={{ alignSelf: 'flex-start', padding: '10px 14px', maxWidth: '80%', fontSize: 14 }}><div className="m" style={{ fontSize: 11 }}>{m.name}{m.uid === g.adminId ? ' \u00B7 Admin' : ''}</div>{m.text}</div>)}
      </div>
      <form onSubmit={send} style={{ position: 'sticky', bottom: 92, display: 'flex', gap: 8, padding: '0 20px', marginTop: 'auto', paddingTop: 12 }}>
        <input className="inp" style={{ borderRadius: 25, height: 48 }} placeholder="Type here" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" style={{ width: 48, height: 48 }} aria-label="Send">&uarr;</button>
      </form>
      <div style={{ height: 96 }} /><TabBar />
    </main>
  );
}
