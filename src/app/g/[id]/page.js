'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, collection, query, orderBy, where, onSnapshot, addDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cycleInfo, naira, haptic, compressImage } from '@/lib/utils';
import { notify } from '@/lib/notify';
import Av, { GroupAv } from '@/components/Av';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';
import Icon, { IconBadge } from '@/components/Icon';
import Tour from '@/components/Tour';

const GSTEPS = [
  { target: 'g-info', noScroll: true, title: 'Group info', body: 'Tap the group name to see members, the description, the packing order, the QR code and the group rules.' },
  { target: 'g-pay', noScroll: true, title: 'Pay contribution', body: 'On payment day tap here. You will see the amount, the account to pay and where to upload your receipt.' },
  { target: 'g-input', noScroll: true, title: 'Group chat', body: 'Chat with the group here. You can also send a picture.' },
];
const ST = { confirmed: ['st-ok', 'Confirmed'], pending: ['st-wait', 'Awaiting verification'], none: ['st-none', 'Not paid'], rejected: ['st-rej', 'Rejected'] };
const TILES = [['confirmed', 'Confirmed', '#34C759'], ['pending', 'Pending', '#F5A524'], ['none', 'Not paid', '#9AA0A6'], ['rejected', 'Rejected', '#E5484D']];
const hm = (t) => new Date(t).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
const when = (t) => { const d = new Date(t), n = new Date(), y = new Date(Date.now() - 864e5); return (d.toDateString() === n.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })) + ', ' + hm(t); };
const actInfo = (m) => {
  const t = m.text || '';
  if (m.type === 'confirmed') return ['ok', 'check', t.replace(' by admin', ''), null];
  if (m.kind === 'submitted') return ['wait', 'clock', t, null];
  if (/not accepted/.test(t)) { const [a, b] = t.split(': '); return ['rej', 'x', a.replace('receipt was not accepted', 'receipt was rejected'), b ? 'Reason: ' + b : null]; }
  if (/joined/.test(t)) return ['', 'users', t, null];
  return ['', 'info', t, null];
};

export default function Group() {
  const { id } = useParams(), r = useRouter(), { user, profile } = useRequireAuth();
  const [g, setG] = useState(), [members, setMembers] = useState({}), [msgs, setMsgs] = useState([]), [cons, setCons] = useState([]), [reqs, setReqs] = useState([]);
  const [packer, setPacker] = useState(null), [text, setText] = useState(''), [recs, setRecs] = useState({}), [openList, setOpenList] = useState(true), [allAct, setAllAct] = useState(false), [err, setErr] = useState('');
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
  useEffect(() => { if (!ci) return; return onSnapshot(query(collection(db, 'groups', id, 'contributions'), where('cycle', '==', ci.k)), (s) => setCons(s.docs.map((d) => ({ id: d.id, ...d.data() })))); }, [id, ci && ci.k]);
  useEffect(() => { if (ci && ci.packerUid) getDoc(doc(db, 'users', ci.packerUid)).then((s) => setPacker({ uid: ci.packerUid, ...s.data() })); }, [ci && ci.packerUid]);
  const loadReqs = () => api('/api/requests/list?gid=' + id).then((j) => setReqs(j.items)).catch(() => {});
  useEffect(() => { if (isAdmin) loadReqs(); }, [isAdmin]);
  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const send = async (e) => { e.preventDefault(); const t = text.trim(); if (!t) return; setText(''); await addDoc(collection(db, 'groups', id, 'messages'), { type: 'text', text: t, uid: user.uid, name: profile?.name || 'Member', at: Date.now() }); };
  async function sendImage(e) {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return; setErr('');
    try { const image = await compressImage(file, 640); if (image.length > 280000) return setErr('That picture is too large. Try a smaller one.'); await addDoc(collection(db, 'groups', id, 'messages'), { type: 'image', image, uid: user.uid, name: profile?.name || 'Member', at: Date.now() }); }
    catch { setErr('Could not send that picture.'); }
  }
  const sys = (b, m, t) => b.set(doc(collection(db, 'groups', id, 'messages')), { uid: user.uid, at: t, ...m });
  async function confirm(c) {
    const b = writeBatch(db), m = members[c.uid] || {}, streak = c.late ? 0 : (m.streak || 0) + 1, t = Date.now();
    b.update(doc(db, 'groups', id, 'contributions', c.id), { status: 'confirmed', confirmedAt: t });
    b.update(doc(db, 'groups', id, 'members', c.uid), { streak, best: Math.max(m.best || 0, streak) });
    sys(b, { type: 'confirmed', targetUid: c.uid, text: c.name + "'s contribution was confirmed by admin", amount: c.required }, t);
    await b.commit(); haptic(); notify('confirmed', id, c.uid);
  }
  async function reject(c) {
    const why = (window.prompt('Why is this receipt not accepted? The member will see this.') || '').trim(); if (!why) return;
    const b = writeBatch(db);
    b.update(doc(db, 'groups', id, 'contributions', c.id), { status: 'rejected', reason: why });
    sys(b, { type: 'system', text: c.name + "'s receipt was not accepted: " + why, amount: c.required }, Date.now());
    await b.commit(); notify('rejected', id, c.uid);
  }
  async function paidPacker() { const b = writeBatch(db); b.update(doc(db, 'groups', id), { packedCycle: ci.k }); sys(b, { type: 'system', text: 'Admin paid ' + (packer?.name || 'the packer') + ' for this round' }, Date.now()); await b.commit(); notify('packed', id, packer?.uid); }
  async function decide(uid, decision) { try { await api('/api/requests/decide', { gid: id, uid, decision }); haptic(); } catch { setErr('Could not save that decision.'); } loadReqs(); }
  async function showRec(c) { if (recs[c.id]) return; const s = await getDocs(query(collection(db, 'groups', id, 'receipts'), where('cid', '==', c.id))); setRecs((p) => ({ ...p, [c.id]: s.docs.map((d) => d.data()) })); }

  if (!g) return <main className="app"><Skeleton n={4} h={90} /></main>;
  const stOf = (uid) => { const l = cons.filter((c) => c.uid === uid).sort((a, b) => b.createdAt - a.createdAt), ok = l.find((c) => c.status === 'confirmed'); if (ok) return { s: 'confirmed', c: ok }; const p = l.find((c) => c.status === 'pending'); if (p) return { s: 'pending', c: p }; return l.length ? { s: 'rejected', c: l[0] } : { s: 'none' }; };
  const rows = g.members.map((u) => ({ u, ...stOf(u) })), count = (k) => rows.filter((x) => x.s === k).length;
  const pending = cons.filter((c) => c.status === 'pending'), locked = g.onlyAdminsPost && !isAdmin, me = stOf(user.uid);
  const acts = msgs.filter((m) => m.type === 'system' || m.type === 'confirmed').slice().reverse(), shown = allAct ? acts : acts.slice(0, 4);
  const todo = isAdmin && (pending.length > 0 || reqs.length > 0 || (ci.isPackingDay && packer && g.packedCycle !== ci.k));
  return (
    <main className="app" style={{ padding: 0, gap: 12 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 15 }}>
        <div className="dark r" style={{ borderRadius: '0 0 28px 28px', padding: 'calc(env(safe-area-inset-top) + 14px) 18px 14px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
            <Link href="/" aria-label="Back" style={{ color: '#fff', display: 'flex' }}><Icon n="back" s={24} /></Link>
            <Link data-tour="g-info" href={'/g/' + id + '/info'} style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#fff', textDecoration: 'none', minWidth: 0 }}>
              <GroupAv g={g} size={46} />
              <div style={{ minWidth: 0 }}><b style={{ display: 'block', fontSize: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</b><div style={{ fontSize: 13, color: '#B8BCC2' }}>{g.members.length} members</div></div>
            </Link>
          </div>
          <Link data-tour="g-pay" href={'/g/' + id + '/pay'} className="pill g" style={{ textDecoration: 'none', flex: 'none' }}>Pay contribution</Link>
        </div>
        {ci.isPackingDay && packer && <div className="glass" style={{ margin: '8px 20px 0', padding: '10px 14px', fontSize: 13 }}><b>Pinned &middot; Packing day</b><br />{packer.name} packs today.{packer.payout ? ' ' + packer.payout.bank + ' ' + packer.payout.number : ' No payout account saved yet.'}</div>}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {err && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>{err}</p>}
        {todo && <div className="dark" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>Admin to do</b>
          {ci.isPackingDay && packer && g.packedCycle !== ci.k && <div className="r" style={{ fontSize: 13 }}><span style={{ color: '#B8BCC2' }}>Pay {packer.name} today</span><button className="pill g" onClick={paidPacker}>Mark paid</button></div>}
          {reqs.map((q) => { const s = q.stats || {}; return (
            <div key={q.uid} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 16, padding: 12, fontSize: 13 }}>
              <div className="r"><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Av i={q.avatar} size={36} label={q.name} /><div><b>{q.name}</b><div style={{ color: '#B8BCC2' }}>Wants to join &middot; Verified</div></div></div></div>
              <div style={{ margin: '8px 0', lineHeight: 1.6 }}>Best streak {s.bestStreak || 0} &middot; {s.groups || 0} Ajo{s.groups === 1 ? '' : 's'} &middot; {s.confirmed || 0} paid &middot; {s.late || 0} late</div>
              {q.message && <div style={{ fontStyle: 'italic', color: '#E3E5E8', marginBottom: 8 }}>&ldquo;{q.message}&rdquo;</div>}
              <div style={{ display: 'flex', gap: 8 }}><button className="pill g" style={{ flex: 1, justifyContent: 'center' }} onClick={() => decide(q.uid, 'approve')}>Approve, I accept the risk</button><button className="pill" style={{ background: 'transparent', color: '#fff', border: '1px solid #6B7076' }} onClick={() => decide(q.uid, 'decline')}>Decline</button></div>
            </div>); })}
          {pending.map((c) => (
            <div key={c.id} style={{ background: 'rgba(255,255,255,.1)', borderRadius: 16, padding: 12, fontSize: 13 }}>
              <div className="r"><b>{c.name}</b><span>{c.count} &times; &middot; {naira(c.required)}{c.late ? ' (late)' : ''}</span></div>
              {!recs[c.id] ? <button className="pill" style={{ marginTop: 8 }} onClick={() => showRec(c)}>View receipts</button> : recs[c.id].map((x, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <img src={x.image} alt="Receipt" style={{ width: 72, height: 96, objectFit: 'cover', borderRadius: 8 }} />
                  <div style={{ lineHeight: 1.6 }}>Amount: {x.extracted?.amount != null ? naira(x.extracted.amount) : 'could not read'}<br />Sender: {x.extracted?.senderName || 'unknown'}<br />{x.flags?.length ? 'Flags: ' + x.flags.join(', ') : 'No flags'}</div>
                </div>))}
              <div style={{ color: '#B8BCC2', marginTop: 6 }}>Checks are flags. Confirm against your bank alert.</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button className="pill g" style={{ flex: 1, justifyContent: 'center' }} onClick={() => confirm(c)}>Mark contribution</button><button className="pill" style={{ background: 'transparent', color: '#fff', border: '1px solid #6B7076' }} onClick={() => reject(c)}>Reject</button></div>
            </div>))}
        </div>}

        {me.s === 'confirmed' && <div className="glass r"><div><b>Your contribution is confirmed</b><div className="m" style={{ fontSize: 13 }}>Thank you for paying.</div></div><img src="/3d/party.png" width="60" height="60" alt="" /></div>}

        <div className="glass">
          <div className="r"><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><b style={{ fontSize: 20 }}>Round {ci.k + 1}</b><span className={'st ' + (count('confirmed') === g.members.length ? 'st-ok' : 'st-none')}>{count('confirmed') === g.members.length ? 'Complete' : 'In progress'}</span></div><span className="m" style={{ fontSize: 13 }}>{count('confirmed')} of {g.members.length} confirmed</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 12 }}>
            {TILES.map(([k, l, col]) => <div key={k} style={{ background: '#F4F5F6', borderRadius: 14, padding: '10px 8px' }}><div style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 700, fontSize: 18 }}><span style={{ width: 7, height: 7, borderRadius: 4, background: col }} />{count(k)}</div><div className="m" style={{ fontSize: 12 }}>{l}</div></div>)}
          </div>
        </div>

        <div className="glass">
          <button className="r" style={{ width: '100%', background: 'none', textAlign: 'left' }} onClick={() => setOpenList(!openList)} aria-expanded={openList}>
            <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Icon n="doc" s={22} /><span><b style={{ fontSize: 17 }}>Round {ci.k + 1} checklist</b><span className="m" style={{ display: 'block', fontSize: 13 }}>{g.members.length} members</span></span></span><Icon n={openList ? 'up' : 'down'} s={20} />
          </button>
          {openList && <div style={{ marginTop: 8 }}>{rows.map((x) => { const [cls, lab] = ST[x.s], c = x.c, t = x.s === 'confirmed' ? c.confirmedAt || c.createdAt : x.s !== 'none' ? c.createdAt : null; return (
            <div key={x.u} className="rowline">
              <Av i={members[x.u]?.avatar || 0} size={42} label={members[x.u]?.name || 'M'} />
              <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 15 }}>{members[x.u]?.name || 'Member'}</b>{x.u === user.uid && <span className="m"> (You)</span>}<div className="m" style={{ fontSize: 13 }}>{naira(c ? c.required : g.amount + (g.packingFee || 0))}</div></div>
              <div style={{ textAlign: 'right' }}><span className={'st ' + cls}>{lab}</span><div className="m" style={{ fontSize: 11, marginTop: 4 }}>{t ? when(t) : '\u2014'}</div></div>
            </div>); })}</div>}
        </div>

        <div className="glass">
          <div className="r"><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon n="clock" s={22} /><b style={{ fontSize: 17 }}>Recent activity</b></span>{acts.length > 4 && <button className="m" style={{ background: 'none', fontSize: 13 }} onClick={() => setAllAct(!allAct)}>{allAct ? 'Show less' : 'View all'}</button>}</div>
          {!acts.length && <p className="m" style={{ marginTop: 8, fontSize: 13 }}>Nothing yet.</p>}
          {shown.map((m) => { const [tone, ic, line, reason] = actInfo(m); return (
            <div key={m.id} className="rowline"><IconBadge n={ic} tone={tone} s={18} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}><b style={{ fontWeight: 500 }}>{line}</b>{reason && <div className="m" style={{ fontSize: 12 }}>{reason}</div>}<div className="m" style={{ fontSize: 12 }}>{m.amount ? naira(m.amount) + ' \u00B7 ' : ''}{when(m.at)}</div></div>
            </div>); })}
        </div>

        {msgs.filter((m) => m.type === 'text' || m.type === 'image').map((m) => {
          const mine = m.uid === user.uid, body = m.type === 'image' ? <img src={m.image} alt="Shared picture" style={{ maxWidth: 220, width: '100%', borderRadius: 14, display: 'block' }} /> : m.text;
          return mine
            ? <div key={m.id} style={{ alignSelf: 'flex-end', background: 'linear-gradient(145deg,#2E2E31,#050506)', color: '#fff', borderRadius: 20, padding: m.type === 'image' ? 6 : '10px 14px', maxWidth: '80%', fontSize: 14 }}>{body}</div>
            : <div key={m.id} className="glass" style={{ alignSelf: 'flex-start', padding: m.type === 'image' ? 8 : '10px 14px', maxWidth: '80%', fontSize: 14 }}><div className="m" style={{ fontSize: 11, marginBottom: 2 }}>{m.name}{m.uid === g.adminId ? ' \u00B7 Admin' : ''}</div>{body}</div>;
        })}
        <div ref={endRef} />
      </div>

      {locked
        ? <div className="m" style={{ position: 'sticky', bottom: 'calc(env(safe-area-inset-bottom) + 86px)', textAlign: 'center', padding: '10px 20px', marginTop: 'auto' }}>Only admins can send messages in this group.</div>
        : <form data-tour="g-input" onSubmit={send} style={{ position: 'sticky', bottom: 'calc(env(safe-area-inset-bottom) + 86px)', display: 'flex', gap: 8, padding: '12px 20px 0', marginTop: 'auto', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #E6E8EB', borderRadius: 26, height: 50, padding: '0 6px 0 14px', gap: 8 }}>
              <label aria-label="Send a picture" style={{ cursor: 'pointer', display: 'flex', color: '#3A3D41' }}><Icon n="image" s={22} /><input type="file" accept="image/*" onChange={sendImage} style={{ display: 'none' }} /></label>
              <input style={{ flex: 1, border: 0, outline: 0, fontSize: 15, background: 'transparent', minWidth: 0 }} placeholder="Type a message..." value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" />
            </div>
            <button className="btn" style={{ width: 50, height: 50, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Send"><Icon n="send" s={20} /></button>
          </form>}
      <div style={{ height: 96 }} /><TabBar />
      <Tour id="group" steps={GSTEPS} enabled />
    </main>
  );
}
