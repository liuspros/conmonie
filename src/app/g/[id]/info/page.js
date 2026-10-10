'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, collection, onSnapshot, updateDoc, deleteDoc, deleteField, writeBatch, arrayRemove, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { compressSquare, haptic } from '@/lib/utils';
import Av, { PRESETS } from '@/components/Av';
import Skeleton from '@/components/Skeleton';

export default function Info() {
  const { id } = useParams(), r = useRouter(), { user } = useRequireAuth();
  const [g, setG] = useState(), [members, setMembers] = useState({}), [order, setOrder] = useState(null), [form, setForm] = useState(null), [copied, setCopied] = useState(false), [err, setErr] = useState('');
  useEffect(() => {
    if (!user) return;
    const off = [
      onSnapshot(doc(db, 'groups', id), (s) => (s.exists() ? setG({ id, ...s.data() }) : r.replace('/')), () => r.replace('/')),
      onSnapshot(collection(db, 'groups', id, 'members'), (s) => setMembers(Object.fromEntries(s.docs.map((d) => [d.id, d.data()])))),
    ];
    return () => off.forEach((f) => f());
  }, [user, id]);
  if (!g) return <main className="app"><Skeleton n={4} h={90} /></main>;

  const admin = g.adminId === user.uid, ord = order || g.order, f = form || { name: g.name, desc: g.description || '' };
  const nm = (u) => members[u]?.name || 'Member';
  const sys = (b, t) => b.set(doc(collection(db, 'groups', id, 'messages')), { type: 'system', text: t, uid: user.uid, at: Date.now() });
  const guard = (fn) => async (...a) => { setErr(''); try { await fn(...a); } catch { setErr('That did not work. Check your connection and try again.'); } };

  const move = (i, d) => { const o = [...ord], j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; setOrder(o); };
  const shuffle = () => { const o = [...ord]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } setOrder(o); };
  const saveOrder = guard(async () => { const b = writeBatch(db); b.update(doc(db, 'groups', id), { order: ord }); sys(b, 'Admin changed the packing order'); await b.commit(); setOrder(null); haptic(); });
  const saveInfo = guard(async () => { await updateDoc(doc(db, 'groups', id), { name: f.name.trim() || g.name, description: f.desc.trim() }); setForm(null); haptic(); });
  const onDp = guard(async (e) => { const file = e.target.files[0]; if (!file) return; await updateDoc(doc(db, 'groups', id), { dp: await compressSquare(file) }); });
  const preset = guard((i) => updateDoc(doc(db, 'groups', id), { avatar: i, dp: deleteField() }));
  const toggle = guard(async () => { const b = writeBatch(db), on = !g.onlyAdminsPost; b.update(doc(db, 'groups', id), { onlyAdminsPost: on }); sys(b, on ? 'Only admins can send messages now' : 'All members can send messages now'); await b.commit(); });
  const drop = (u, self) => guard(async () => {
    if (!window.confirm(self ? 'Leave this group?' : 'Remove ' + nm(u) + ' from this group?')) return;
    const b = writeBatch(db);
    b.update(doc(db, 'groups', id), { members: arrayRemove(u), order: arrayRemove(u), memberCount: increment(-1) });
    b.delete(doc(db, 'groups', id, 'members', u));
    if (!self) sys(b, nm(u) + ' was removed by admin');
    await b.commit(); if (self) r.replace('/');
  });
  const copy = () => { navigator.clipboard.writeText(location.origin + '/join/' + g.inviteCode); haptic(); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <Link href={'/g/' + id} style={{ color: 'inherit', textDecoration: 'none', fontSize: 15 }}>&lsaquo; Back to chat</Link>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
        <Av i={g.avatar || 0} src={g.dp} size={112} />
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>{g.name}</h1><span className="m">{g.members.length} members</span>
        {admin && <>
          <label className="pill" style={{ background: '#E3E5E8', cursor: 'pointer' }}>Upload photo<input type="file" accept="image/*" onChange={onDp} style={{ display: 'none' }} /></label>
          <div style={{ display: 'flex', gap: 8 }}>{PRESETS.map((_, i) => <button key={i} onClick={() => preset(i)} aria-label={'Preset ' + (i + 1)} style={{ width: 32, height: 32, borderRadius: '50%', background: PRESETS[i], border: !g.dp && (g.avatar || 0) === i ? '2px solid #0A0A0A' : '1px solid #fff' }} />)}</div>
        </>}
      </div>
      {err && <p role="alert" className="m" style={{ fontWeight: 600 }}>{err}</p>}

      <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <b>Description</b>
        {admin ? <>
          <input className="inp" value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} aria-label="Group name" />
          <textarea className="inp" style={{ height: 96, padding: 12 }} placeholder="Add a group description: rules, payment day, anything members should know" value={f.desc} onChange={(e) => setForm({ ...f, desc: e.target.value })} />
          {form && <button className="btn" style={{ height: 44 }} onClick={saveInfo}>Save</button>}
        </> : <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{g.description || 'No description yet.'}</p>}
      </div>

      {admin && <div className="glass r"><div><b>Only admins can send messages</b><div className="m">Members can still read the chat.</div></div>
        <button onClick={toggle} role="switch" aria-checked={!!g.onlyAdminsPost} aria-label="Only admins can send messages" style={{ width: 52, height: 32, borderRadius: 16, background: g.onlyAdminsPost ? '#0A0A0A' : '#C7CBD0', position: 'relative', flex: 'none' }}>
          <span style={{ position: 'absolute', top: 3, left: g.onlyAdminsPost ? 23 : 3, width: 26, height: 26, borderRadius: 13, background: '#fff', transition: 'left .15s' }} /></button></div>}

      <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="r"><b>Packing order</b>{admin && <button className="pill" style={{ background: '#E3E5E8' }} onClick={shuffle}>Shuffle</button>}</div>
        {admin && <span className="m">Moving someone changes who is paid next, including the current round.</span>}
        {ord.map((u, i) => <div key={u} className="r" style={{ fontSize: 14 }}><span>{i + 1}. {nm(u)}</span>
          {admin && <span style={{ display: 'flex', gap: 6 }}><button className="pill" style={{ background: '#E3E5E8', height: 30 }} aria-label="Move up" onClick={() => move(i, -1)}>&uarr;</button><button className="pill" style={{ background: '#E3E5E8', height: 30 }} aria-label="Move down" onClick={() => move(i, 1)}>&darr;</button></span>}</div>)}
        {admin && order && order.join() !== g.order.join() && <button className="btn" style={{ height: 44 }} onClick={saveOrder}>Save order</button>}
      </div>

      <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="r"><b>Members</b><span className="m">{g.members.length}</span></div>
        {[g.adminId, ...g.members.filter((u) => u !== g.adminId)].map((u) => (
          <div key={u} className="r"><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Av i={members[u]?.avatar || 0} size={36} /><div><div style={{ fontSize: 15 }}>{nm(u)}{u === user.uid ? ' (you)' : ''}</div><div className="m" style={{ fontSize: 12 }}>Streak {members[u]?.streak || 0}</div></div></div>
            {u === g.adminId ? <span className="tag k">Admin</span> : admin && <button className="pill" style={{ background: '#E3E5E8' }} onClick={drop(u, false)}>Remove</button>}</div>))}
      </div>

      {admin && <button className="btn2" onClick={copy}>{copied ? 'Invite link copied' : 'Copy invite link'}</button>}
      {!admin && <button className="btn2" onClick={drop(user.uid, true)}>Leave group</button>}
    </main>
  );
}
