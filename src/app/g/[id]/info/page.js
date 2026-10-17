'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, collection, query, where, onSnapshot, updateDoc, deleteField, writeBatch, arrayRemove, increment, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { compressSquare, haptic, publicDoc, cycleInfo } from '@/lib/utils';
import Av, { GroupAv, PRESETS } from '@/components/Av';
import Icon, { IconBadge } from '@/components/Icon';
import Skeleton from '@/components/Skeleton';
import BankSelect from '@/components/BankSelect';
import QrSheet from '@/components/QrSheet';
import PingTools from '@/components/PingTools';
import { api } from '@/lib/api';
import { proActive } from '@/lib/plans';

const Switch = ({ on, onClick, label }) => <button className="sw" role="switch" aria-checked={on} aria-label={label} onClick={onClick} style={{ background: on ? '#C8F135' : '#C7CBD0' }}><span style={{ left: on ? 23 : 3 }} /></button>;
const Head = ({ icon, title, sub, right }) => <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><IconBadge n={icon} /><div style={{ flex: 1, minWidth: 0 }}><b>{title}</b><div className="m" style={{ fontSize: 13 }}>{sub}</div></div>{right}</div>;
const MS = { confirmed: ['st-ok', 'Contributed'], pending: ['st-wait', 'Pending'], none: ['st-none', 'Not paid'] };

export default function Info() {
  const { id } = useParams(), r = useRouter(), { user, profile } = useRequireAuth();
  const [g, setG] = useState(), [members, setMembers] = useState({}), [cons, setCons] = useState([]), [order, setOrder] = useState(null), [form, setForm] = useState(null), [copied, setCopied] = useState(false), [err, setErr] = useState('');
  const [acct, setAcct] = useState(null), [acctSaved, setAcctSaved] = useState(false), [orderOpen, setOrderOpen] = useState(false), [manage, setManage] = useState(false), [qr, setQr] = useState(false), [mdet, setMdet] = useState(null);
  useEffect(() => {
    if (!user) return;
    const off = [
      onSnapshot(doc(db, 'groups', id), (s) => (s.exists() ? setG({ id, ...s.data() }) : r.replace('/')), () => r.replace('/')),
      onSnapshot(collection(db, 'groups', id, 'members'), (s) => setMembers(Object.fromEntries(s.docs.map((d) => [d.id, d.data()])))),
    ];
    return () => off.forEach((f) => f());
  }, [user, id]);
  const k = g ? cycleInfo(g).k : null;
  useEffect(() => { if (k == null) return; return onSnapshot(query(collection(db, 'groups', id, 'contributions'), where('cycle', '==', k)), (s) => setCons(s.docs.map((d) => d.data())), () => {}); }, [id, k]);
  useEffect(() => {
    if (g && g.adminId === user.uid && !acct) getDoc(doc(db, 'groups', id, 'private', 'acct')).then((s) => setAcct(s.exists() ? s.data() : { bank: '', number: '', name: '' })).catch(() => setAcct({ bank: '', number: '', name: '' }));
  }, [g && g.adminId]);
  useEffect(() => { if (g && g.adminId === user.uid) api('/api/members?gid=' + id).then((j) => setMdet(j.members)).catch(() => {}); }, [g && g.members.length]);
  if (!g) return <main className="app"><Skeleton n={4} h={90} /></main>;

  const admin = g.adminId === user.uid, ord = order || g.order, f = form || { name: g.name, desc: g.description || '' }, url = location.origin + '/join/' + g.inviteCode;
  const nm = (u) => members[u]?.name || 'Member';
  const status = (u) => (cons.some((c) => c.uid === u && c.status === 'confirmed') ? 'confirmed' : cons.some((c) => c.uid === u && c.status === 'pending') ? 'pending' : 'none');
  const sys = (b, t) => b.set(doc(collection(db, 'groups', id, 'messages')), { type: 'system', text: t, uid: user.uid, at: Date.now() });
  const guard = (fn) => async (...a) => { setErr(''); try { await fn(...a); } catch { setErr('That did not work. Check your connection and try again.'); } };
  const move = (i, d) => { const o = [...ord], j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; setOrder(o); };
  const shuffle = () => { const o = [...ord]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } setOrder(o); };
  const saveOrder = guard(async () => { const b = writeBatch(db); b.update(doc(db, 'groups', id), { order: ord }); sys(b, 'Admin changed the packing order'); await b.commit(); setOrder(null); haptic(); });
  const saveInfo = guard(async () => { const d = { name: f.name.trim() || g.name, description: f.desc.trim() }; await updateDoc(doc(db, 'groups', id), d); if (g.public) await updateDoc(doc(db, 'publicGroups', id), d); setForm(null); haptic(); });
  const onDp = guard(async (e) => { const file = e.target.files[0]; if (!file) return; await updateDoc(doc(db, 'groups', id), { dp: await compressSquare(file) }); });
  const preset = guard((i) => updateDoc(doc(db, 'groups', id), { avatar: i, dp: deleteField() }).then(() => g.public && updateDoc(doc(db, 'publicGroups', id), { avatar: i })));
  const toggle = guard(async () => { const b = writeBatch(db), on = !g.onlyAdminsPost; b.update(doc(db, 'groups', id), { onlyAdminsPost: on }); sys(b, on ? 'Only admins can send messages now' : 'All members can send messages now'); await b.commit(); });
  const togglePublic = guard(async () => { const b = writeBatch(db), on = !g.public; b.update(doc(db, 'groups', id), { public: on }); if (on) b.set(doc(db, 'publicGroups', id), publicDoc(id, { ...g, public: on }, nm(g.adminId))); else b.delete(doc(db, 'publicGroups', id)); await b.commit(); });
  const drop = (u, self) => guard(async () => {
    if (!window.confirm(self ? 'Leave this group?' : 'Remove ' + nm(u) + ' from this group?')) return;
    const b = writeBatch(db);
    b.update(doc(db, 'groups', id), { members: arrayRemove(u), order: arrayRemove(u), memberCount: increment(-1) });
    b.delete(doc(db, 'groups', id, 'members', u));
    if (!self) sys(b, nm(u) + ' was removed by admin');
    await b.commit(); if (self) r.replace('/');
  });
  const saveAcct = guard(async () => { await setDoc(doc(db, 'groups', id, 'private', 'acct'), acct); setAcctSaved(true); setTimeout(() => setAcctSaved(false), 1500); });
  const copy = () => { navigator.clipboard.writeText(url); haptic(); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const share = async () => { try { if (navigator.share) await navigator.share({ title: g.name, text: 'Join my Ajo on Conmonie', url }); else copy(); } catch {} };
  const dk = { background: '#fff' };

  return (
    <main className="app" style={{ padding: 0, gap: 14 }}>
      <div className="dark r" style={{ borderRadius: '0 0 28px 28px', padding: 'calc(env(safe-area-inset-top) + 14px) 18px 14px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Link href={'/g/' + id} aria-label="Back to chat" style={{ color: '#fff', display: 'flex' }}><Icon n="back" s={24} /></Link><GroupAv g={g} size={44} /><div><b style={{ fontSize: 18 }}>{g.name}</b><div style={{ fontSize: 13, color: '#B8BCC2' }}>{g.members.length} members</div></div></div>
      </div>
      <div style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}><GroupAv g={g} size={96} />
            {admin && <label aria-label="Change group photo" style={{ position: 'absolute', right: -6, bottom: -6, width: 34, height: 34, borderRadius: 17, background: '#0A0A0A', color: '#C8F135', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon n="camera" s={16} /><input type="file" accept="image/*" onChange={onDp} style={{ display: 'none' }} /></label>}</div>
          <div style={{ flex: 1, minWidth: 0 }}><h1 style={{ fontSize: 24, fontWeight: 700 }}>{g.name}</h1><span className="m">{g.members.length} members</span></div>
          {admin && <label className="pill" style={{ background: '#E3E5E8', cursor: 'pointer', gap: 6 }}><Icon n="palette" s={16} />Customize<input type="file" accept="image/*" onChange={onDp} style={{ display: 'none' }} /></label>}
        </div>
        {admin && <div style={{ display: 'flex', gap: 10 }} role="group" aria-label="Group colour">{PRESETS.map((_, i) => <button key={i} onClick={() => preset(i)} aria-label={i === 0 ? 'Rocket' : 'Colour ' + i} style={{ width: 30, height: 30, borderRadius: '50%', background: PRESETS[i], border: !g.dp && (g.avatar || 0) === i ? '3px solid #0A0A0A' : '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,.12)' }} />)}</div>}
        {err && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>{err}</p>}

        <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Head icon="users" title="Group details" sub="View and update basic group information." />
          {admin ? <>
            <input className="inp" value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} aria-label="Group name" />
            <textarea className="inp" style={{ height: 90, padding: 12 }} placeholder="Add a group description: rules, payment day, anything members should know." value={f.desc} onChange={(e) => setForm({ ...f, desc: e.target.value })} aria-label="Description" />
            {form && <button className="btn" style={{ height: 44 }} onClick={saveInfo}>Save</button>}</>
            : <><div><div className="m" style={{ fontSize: 12 }}>Group name</div>{g.name}</div><div><div className="m" style={{ fontSize: 12 }}>Description</div><span style={{ whiteSpace: 'pre-wrap' }}>{g.description || 'No description yet.'}</span></div></>}
        </div>

        {admin && <div className="glass"><Head icon="chat" title="Messaging permissions" sub="Control who can send messages in the group." right={<><span className="m" style={{ fontSize: 13 }}>{g.onlyAdminsPost ? 'Admins only' : 'Everyone'}</span><Switch on={!!g.onlyAdminsPost} onClick={toggle} label="Only admins can send messages" /></>} /></div>}
        {admin && <div className="glass"><Head icon="globe" title="Show in Explore" sub="Let verified people find the group and request to join. You approve each one." right={<Switch on={!!g.public} onClick={togglePublic} label="Show in Explore" />} /></div>}

        <div className="glass">
          <button style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', background: 'none', textAlign: 'left' }} onClick={() => setOrderOpen(!orderOpen)} aria-expanded={orderOpen}>
            <IconBadge n="swap" /><div style={{ flex: 1 }}><b>Packing order</b><div className="m" style={{ fontSize: 13 }}>Manage the order of members for each round.</div></div><span className="m" style={{ fontSize: 13 }}>1. {nm(ord[0])}</span><Icon n={orderOpen ? 'up' : 'right'} s={18} /></button>
          {orderOpen && <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {admin && <><div className="r"><span className="m" style={{ fontSize: 12 }}>Moving someone changes who is paid next, including this round.</span><button className="pill" style={{ background: '#E3E5E8' }} onClick={shuffle}>Shuffle</button></div></>}
            {ord.map((u, i) => <div key={u} className="r" style={{ fontSize: 14 }}><span>{i + 1}. {nm(u)}</span>{admin && <span style={{ display: 'flex', gap: 6 }}><button className="pill" style={{ background: '#E3E5E8', height: 30 }} aria-label="Move up" onClick={() => move(i, -1)}><Icon n="up" s={14} /></button><button className="pill" style={{ background: '#E3E5E8', height: 30 }} aria-label="Move down" onClick={() => move(i, 1)}><Icon n="down" s={14} /></button></span>}</div>)}
            {admin && order && order.join() !== g.order.join() && <button className="btn" style={{ height: 44 }} onClick={saveOrder}>Save order</button>}</div>}
        </div>

        <div className="glass">
          <Head icon="users" title="Members" sub={g.members.length + ' members'} />
          <div style={{ marginTop: 6 }}>{[g.adminId, ...g.members.filter((u) => u !== g.adminId)].map((u) => { const [cls, lab] = MS[status(u)]; return (
            <div key={u} className="rowline">
              <Av i={members[u]?.avatar || 0} size={40} label={nm(u)} />
              <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 15 }}>{nm(u)}</b>{u === user.uid && <span className="m"> (You)</span>}</div>
              <span className="tag">{u === g.adminId ? 'Admin' : 'Member'}</span>
              {manage && admin && u !== g.adminId ? <span style={{ display: 'flex', gap: 6 }}><Link href={'/g/' + id + '/record/' + u} className="pill" style={{ background: '#E3E5E8', textDecoration: 'none', height: 30 }}>Record</Link><button className="pill" style={{ background: '#FDE2E0', color: '#C0362C', height: 30 }} onClick={drop(u, false)}>Remove</button></span> : <span className={'st ' + cls}>{lab}</span>}
            </div>); })}
            {admin && <button className="rowline" style={{ width: '100%', background: 'none', textAlign: 'left' }} onClick={() => setManage(!manage)}><Icon n="users" s={20} /><span style={{ flex: 1 }}>{manage ? 'Done managing' : 'Manage members'}</span><Icon n="right" s={18} /></button>}
          </div>
        </div>

        {admin && mdet && <div className="glass"><Head icon="shield" title="Member details" sub="Only admins can see legal names, phone numbers and payment records." />
          <div style={{ marginTop: 6 }}>{mdet.filter((m) => m.role !== 'admin').map((m) => (
            <details key={m.uid} className="rowline" style={{ display: 'block' }}>
              <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 12 }}><Av i={m.avatar} size={36} label={m.name} /><b style={{ flex: 1 }}>{m.name}</b><Icon n="down" s={16} /></summary>
              <div style={{ fontSize: 14, lineHeight: 1.8, padding: '8px 0 0 48px' }}>Legal name: <b>{m.legalName || 'Not verified yet'}</b><br />Phone: {m.phoneNumber ? <><a href={'tel:' + m.phoneNumber} style={{ color: 'inherit', fontWeight: 600 }}>{m.phoneNumber}</a> &middot; <a href={'https://wa.me/' + m.phoneNumber.replace(/\D/g, '')} style={{ color: 'inherit' }}>WhatsApp</a></> : 'Not provided'}<br /><span className="m">{m.record.confirmed} paid &middot; {m.record.pending} pending &middot; {m.record.rejected} rejected &middot; {m.record.late} late &middot; best streak {m.record.bestStreak} &middot; {naira(m.record.totalConfirmed)} confirmed</span></div>
            </details>))}</div></div>}
        {admin && <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><Head icon="bell" title="Group tools" sub="Reminders for members who still owe this round." /><PingTools gid={id} isPro={proActive(profile)} /></div>}
        {admin && acct && <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Head icon="bank" title="Payment account" sub="The account members pay into." right={<span className="m" style={{ fontSize: 12 }}>Access: Admins only</span>} />
          <BankSelect value={acct.bank} onChange={(v) => setAcct({ ...acct, bank: v })} />
          <input className="inp" placeholder="Account number" inputMode="numeric" maxLength={10} value={acct.number} onChange={(e) => setAcct({ ...acct, number: e.target.value })} />
          <input className="inp" placeholder="Account name" value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} />
          <button className="btn" style={{ height: 44 }} onClick={saveAcct}>{acctSaved ? 'Saved' : 'Save account'}</button></div>}

        {admin && <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Head icon="link" title="Invitation & sharing" sub="Copy link, show QR code, or share the group." />
          <div style={{ display: 'flex', gap: 8 }}><button className="btn2" style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setQr(true)}><Icon n="qr" s={18} />QR code</button><button className="btn2" style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={share}><Icon n="share" s={18} />Share</button></div>
          <button className="btn" style={{ height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={copy}><Icon n="copy" s={18} />{copied ? 'Invite link copied' : 'Copy invite link'}</button></div>}
        {!admin && <button className="btn2" onClick={drop(user.uid, true)}>Leave group</button>}
      </div>
      {qr && <QrSheet url={url} name={g.name} onClose={() => setQr(false)} />}
    </main>
  );
}
