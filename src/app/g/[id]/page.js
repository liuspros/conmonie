'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, collection, query, orderBy, where, onSnapshot, addDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { cycleInfo, naira, haptic } from '@/lib/utils';
import { notify } from '@/lib/notify';
import Av from '@/components/Av';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';

const LABEL = { confirmed: 'Confirmed', pending: 'Awaiting admin', none: 'Not paid' };
const hm = (t) => new Date(t).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

export default function Group() {
  const { id } = useParams(), r = useRouter(), { user, profile } = useRequireAuth();
  const [g, setG] = useState(), [members, setMembers] = useState({}), [msgs, setMsgs] = useState([]), [cons, setCons] = useState([]);
  const [packer, setPacker] = useState(null), [text, setText] = useState(''), [recs, setRecs] = useState({});
  const endRef = useRef(null);
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
  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const status = (uid) => (cons.find((c) => c.uid === uid && c.status !== 'rejected') || {}).status;
  // A fresh snapshot of who has paid; posted into the chat each time something changes.
  const rows = (over = {}) => g.members.map((u) => ({ uid: u, name: members[u]?.name || 'Member', s: over[u] || status(u) || 'none' }));
  const add = (b, m, t) => b.set(doc(collection(db, 'groups', id, 'messages')), { uid: user.uid, at: t, ...m });

  const send = async (e) => { e.preventDefault(); const t = text.trim(); if (!t) return; setText(''); await addDoc(collection(db, 'groups', id, 'messages'), { type: 'text', text: t, uid: user.uid, name: profile?.name || 'Member', at: Date.now() }); };
  async function confirm(c) {
    const b = writeBatch(db), m = members[c.uid] || {}, streak = c.late ? 0 : (m.streak || 0) + 1, t = Date.now();
    b.update(doc(db, 'groups', id, 'contributions', c.id), { status: 'confirmed', confirmedAt: t });
    b.update(doc(db, 'groups', id, 'members', c.uid), { streak, best: Math.max(m.best || 0, streak) });
    add(b, { type: 'confirmed', targetUid: c.uid, text: c.name + "'s contribution confirmed by admin" }, t);
    add(b, { type: 'checklist', text: 'Round ' + (ci.k + 1) + ' checklist', rows: rows({ [c.uid]: 'confirmed' }) }, t + 1);
    await b.commit(); haptic(); notify('confirmed', id, c.uid);
  }
  async function reject(c) {
    const why = (window.prompt('Why is this receipt not accepted? The member will see this.') || '').trim(); if (!why) return;
    const b = writeBatch(db), t = Date.now();
    b.update(doc(db, 'groups', id, 'contributions', c.id), { status: 'rejected', reason: why });
    add(b, { type: 'system', text: c.name + "'s receipt was not accepted: " + why }, t);
    add(b, { type: 'checklist', text: 'Round ' + (ci.k + 1) + ' checklist', rows: rows({ [c.uid]: 'none' }) }, t + 1);
    await b.commit(); notify('rejected', id, c.uid);
  }
  async function paidPacker() {
    const b = writeBatch(db); b.update(doc(db, 'groups', id), { packedCycle: ci.k });
    add(b, { type: 'system', text: 'Admin paid ' + (packer?.name || 'the packer') + ' for this round' }, Date.now());
    await b.commit(); notify('packed', id, packer?.uid);
  }
  async function showRec(c) { if (recs[c.id]) return; const s = await getDocs(query(collection(db, 'groups', id, 'receipts'), where('cid', '==', c.id))); setRecs((p) => ({ ...p, [c.id]: s.docs.map((d) => d.data()) })); }

  if (!g) return <main className="app"><Skeleton n={4} h={90} /></main>;
  const pending = cons.filter((c) => c.status === 'pending');
  const locked = g.onlyAdminsPost && !isAdmin;
  return (
    <main className="app" style={{ padding: 0, gap: 12 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 15 }}>
        <div className="dark r" style={{ borderRadius: '0 0 28px 28px', padding: 'calc(env(safe-area-inset-top) + 14px) 20px 14px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
            <Link href="/" aria-label="Back" style={{ color: '#fff', fontSize: 28, textDecoration: 'none' }}>&lsaquo;</Link>
            <Link href={'/g/' + id + '/info'} style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#fff', textDecoration: 'none', minWidth: 0 }}>
              <Av i={g.avatar || 0} src={g.dp} size={40} />
              <div style={{ minWidth: 0 }}><b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</b><div style={{ fontSize: 12, color: '#B8BCC2' }}>{g.members.length} members</div></div>
            </Link>
          </div>
          <Link href={'/g/' + id + '/pay'} className="pill" style={{ textDecoration: 'none', flex: 'none' }}>Pay contribution</Link>
        </div>
        {ci.isPackingDay && packer && <div className="glass" style={{ margin: '8px 20px 0', padding: '10px 14px', fontSize: 13 }}><b>Pinned &middot; Packing day</b><br />{packer.name} packs today.{packer.payout ? ' ' + packer.payout.bank + ' ' + packer.payout.number : ' No payout account saved yet.'}</div>}
      </div>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isAdmin && (pending.length > 0 || (ci.isPackingDay && packer && g.packedCycle !== ci.k)) && <div className="dark" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>Admin to do</b>
          {ci.isPackingDay && packer && g.packedCycle !== ci.k && <div className="r" style={{ fontSize: 13 }}><span style={{ color: '#B8BCC2' }}>Pay {packer.name} today</span><button className="pill" onClick={paidPacker}>Mark paid</button></div>}
          {pending.map((c) => (
            <div key={c.id} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 16, padding: 12, fontSize: 13 }}>
              <div className="r"><b>{c.name}</b><span>{c.count} &times; &middot; {naira(c.required)}{c.late ? ' (late)' : ''}</span></div>
              {!recs[c.id] ? <button className="pill" style={{ marginTop: 8 }} onClick={() => showRec(c)}>View receipts</button> : recs[c.id].map((x, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <img src={x.image} alt="Receipt" style={{ width: 72, height: 96, objectFit: 'cover', borderRadius: 8 }} />
                  <div style={{ lineHeight: 1.6 }}>Amount: {x.extracted?.amount != null ? naira(x.extracted.amount) : 'could not read'}<br />Sender: {x.extracted?.senderName || 'unknown'}<br />{x.flags?.length ? 'Flags: ' + x.flags.join(', ') : 'No flags'}</div>
                </div>))}
              <div style={{ color: '#B8BCC2', marginTop: 6 }}>Checks are flags. Confirm against your bank alert.</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button className="pill" style={{ flex: 1, justifyContent: 'center' }} onClick={() => confirm(c)}>Mark contribution</button><button className="pill" style={{ background: 'transparent', color: '#fff', border: '1px solid #6B7076' }} onClick={() => reject(c)}>Reject</button></div>
            </div>))}
        </div>}
        {msgs.map((m) => {
          if (m.type === 'checklist') {
            const done = (m.rows || []).filter((x) => x.s === 'confirmed').length;
            return (
              <div key={m.id} className="glass" style={{ alignSelf: 'stretch' }}>
                <div className="r"><b>{m.text}</b><span className="m">{done} of {(m.rows || []).length} confirmed</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, fontSize: 14 }}>
                  {(m.rows || []).map((x) => <div key={x.uid} className="r"><span>{x.name}</span><span className={'tag' + (x.s === 'confirmed' ? ' k' : '')}>{LABEL[x.s]}</span></div>)}
                </div>
                <div className="m" style={{ fontSize: 11, textAlign: 'right', marginTop: 8 }}>{hm(m.at)}</div>
              </div>);
          }
          if (m.type === 'confirmed' && m.targetUid === user.uid) return (
            <div key={m.id} className="glass r"><div><b>Your contribution is confirmed</b><div className="m">Thank you for paying. &middot; {hm(m.at)}</div></div><img src="/3d/party.png" width="64" height="64" alt="" /></div>);
          if (m.type === 'system' || m.type === 'confirmed') return <div key={m.id} style={{ alignSelf: 'center' }}><span className="tag" style={{ fontWeight: 500, color: '#6B7076' }}>{m.text}</span></div>;
          return m.uid === user.uid
            ? <div key={m.id} style={{ alignSelf: 'flex-end', background: 'linear-gradient(145deg,#2E2E31,#050506)', color: '#fff', borderRadius: 20, padding: '10px 14px', maxWidth: '80%', fontSize: 14 }}>{m.text}</div>
            : <div key={m.id} className="glass" style={{ alignSelf: 'flex-start', padding: '10px 14px', maxWidth: '80%', fontSize: 14 }}><div className="m" style={{ fontSize: 11 }}>{m.name}{m.uid === g.adminId ? ' \u00B7 Admin' : ''}</div>{m.text}</div>;
        })}
        <div ref={endRef} />
      </div>
      {locked
        ? <div className="m" style={{ position: 'sticky', bottom: 92, textAlign: 'center', padding: '10px 20px', marginTop: 'auto' }}>Only admins can send messages in this group.</div>
        : <form onSubmit={send} style={{ position: 'sticky', bottom: 92, display: 'flex', gap: 8, padding: '12px 20px 0', marginTop: 'auto' }}>
            <input className="inp" style={{ borderRadius: 25, height: 48 }} placeholder="Type here" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn" style={{ width: 48, height: 48 }} aria-label="Send">&uarr;</button>
          </form>}
      <div style={{ height: 96 }} /><TabBar />
    </main>
  );
}
