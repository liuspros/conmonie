'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, collection, onSnapshot, updateDoc, writeBatch, arrayRemove, increment, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { naira, haptic } from '@/lib/utils';
import Av from '@/components/Av';
import Icon, { IconBadge } from '@/components/Icon';
import Skeleton from '@/components/Skeleton';
import BankSelect from '@/components/BankSelect';
import QrSheet from '@/components/QrSheet';

const Head = ({ icon, title, sub }) => <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><IconBadge n={icon} tone="" /><div style={{ flex: 1, minWidth: 0 }}><b>{title}</b><div className="m" style={{ fontSize: 13 }}>{sub}</div></div></div>;

export default function GoalInfo() {
  const { id } = useParams(), r = useRouter(), { user } = useRequireAuth();
  const [g, setG] = useState(), [members, setMembers] = useState({}), [form, setForm] = useState(null), [acct, setAcct] = useState(null), [saved, setSaved] = useState(''), [qr, setQr] = useState(false), [copied, setCopied] = useState(false), [err, setErr] = useState('');
  useEffect(() => {
    if (!user) return;
    const off = [
      onSnapshot(doc(db, 'goals', id), (s) => (s.exists() ? setG({ id, ...s.data() }) : r.replace('/goals')), () => r.replace('/goals')),
      onSnapshot(collection(db, 'goals', id, 'members'), (s) => setMembers(Object.fromEntries(s.docs.map((d) => [d.id, d.data()])))),
    ];
    return () => off.forEach((f) => f());
  }, [user, id]);
  useEffect(() => { if (g && g.organizerId === user.uid && !acct) getDoc(doc(db, 'goals', id, 'private', 'acct')).then((s) => setAcct(s.exists() ? s.data() : { bank: '', number: '', name: '' })).catch(() => setAcct({ bank: '', number: '', name: '' })); }, [g && g.organizerId]);
  if (!g) return <main className="app"><Skeleton n={4} h={90} /></main>;

  const org = g.organizerId === user.uid, url = location.origin + '/join/' + g.inviteCode, nm = (u) => members[u]?.name || 'Member';
  const f = form || { name: g.name, desc: g.description || '', target: String(g.target), date: new Date(g.deadline).toISOString().slice(0, 10), suggested: String(g.suggested || '') };
  const guard = (fn) => async (...a) => { setErr(''); try { await fn(...a); } catch { setErr('That did not work. Check your connection and try again.'); } };
  const flash = (k) => { setSaved(k); setTimeout(() => setSaved(''), 1500); };
  const saveInfo = guard(async () => { await updateDoc(doc(db, 'goals', id), { name: f.name.trim() || g.name, description: f.desc.trim(), target: Math.max(1000, +f.target || g.target), deadline: new Date(f.date + 'T23:59:00+01:00').getTime(), suggested: +f.suggested || 0 }); setForm(null); flash('info'); haptic(); });
  const saveAcct = guard(async () => { await setDoc(doc(db, 'goals', id, 'private', 'acct'), acct); flash('acct'); });
  const setStatus = guard(async (s) => { await updateDoc(doc(db, 'goals', id), { status: s }); });
  const drop = (u, self) => guard(async () => {
    if (!window.confirm(self ? 'Leave this goal?' : 'Remove ' + nm(u) + ' from this goal?')) return;
    const b = writeBatch(db);
    b.update(doc(db, 'goals', id), { members: arrayRemove(u), memberCount: increment(-1) });
    b.delete(doc(db, 'goals', id, 'members', u));
    await b.commit(); if (self) r.replace('/goals');
  });
  const copy = () => { navigator.clipboard.writeText(url); haptic(); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const share = async () => { try { if (navigator.share) await navigator.share({ title: g.name, text: 'Join our ConGoal on Conmonie', url }); else copy(); } catch {} };

  return (
    <main className="app" style={{ padding: 0, gap: 14 }}>
      <div className="cg-head r" style={{ borderRadius: '0 0 28px 28px', padding: 'calc(env(safe-area-inset-top) + 14px) 18px 14px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Link href={'/goal/' + id} aria-label="Back to goal" style={{ color: '#fff', display: 'flex' }}><Icon n="back" s={24} /></Link><div><b style={{ fontSize: 18 }}>{g.name}</b><div style={{ fontSize: 13, color: '#B7D3F0' }}>Organized by {g.organizerName}</div></div></div>
      </div>
      <div style={{ padding: '0 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {err && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>{err}</p>}
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Head icon="flag" title="Goal details" sub="Target, deadline and description." />
          {org ? <>
            <input className="inp" value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} aria-label="Goal name" />
            <textarea className="inp" style={{ height: 84, padding: 12 }} value={f.desc} onChange={(e) => setForm({ ...f, desc: e.target.value })} placeholder="What the money is for" aria-label="Description" />
            <div style={{ display: 'flex', gap: 8 }}><input className="inp" type="number" inputMode="numeric" value={f.target} onChange={(e) => setForm({ ...f, target: e.target.value })} aria-label="Target in naira" /><input className="inp" type="date" value={f.date} onChange={(e) => setForm({ ...f, date: e.target.value })} aria-label="Deadline" /></div>
            <input className="inp" type="number" inputMode="numeric" value={f.suggested} onChange={(e) => setForm({ ...f, suggested: e.target.value })} placeholder="Suggested amount per member (optional)" aria-label="Suggested amount" />
            {(form || saved === 'info') && <button className="btn" style={{ height: 44 }} onClick={saveInfo}>{saved === 'info' ? 'Saved' : 'Save'}</button>}</>
            : <><div><div className="m" style={{ fontSize: 12 }}>Target</div><b>{naira(g.target)}</b> by {new Date(g.deadline).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</div><div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{g.description || 'No description yet.'}</div></>}
        </div>

        <div className="glass">
          <Head icon="users" title="Members" sub={g.members.length + ' members'} />
          <div style={{ marginTop: 6 }}>{[g.organizerId, ...g.members.filter((u) => u !== g.organizerId)].map((u) => (
            <div key={u} className="rowline"><Av i={members[u]?.avatar || 0} size={40} label={nm(u)} />
              <div style={{ flex: 1, minWidth: 0 }}><b style={{ fontSize: 15 }}>{nm(u)}</b>{u === user.uid && <span className="m"> (You)</span>}<div className="m" style={{ fontSize: 12 }}>Given {naira(members[u]?.total || 0)}</div></div>
              {u === g.organizerId ? <span className="tag k">Organizer</span> : org && <button className="pill" style={{ background: '#FDE2E0', color: '#C0362C', height: 30 }} onClick={drop(u, false)}>Remove</button>}
            </div>))}</div>
        </div>

        {org && acct && <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Head icon="bank" title="Collection account" sub="Members pay into this account. Only members can see it." />
          <BankSelect value={acct.bank} onChange={(v) => setAcct({ ...acct, bank: v })} />
          <input className="inp" placeholder="Account number" inputMode="numeric" maxLength={10} value={acct.number} onChange={(e) => setAcct({ ...acct, number: e.target.value })} />
          <input className="inp" placeholder="Account name" value={acct.name} onChange={(e) => setAcct({ ...acct, name: e.target.value })} />
          <button className="btn" style={{ height: 44 }} onClick={saveAcct}>{saved === 'acct' ? 'Saved' : 'Save account'}</button></div>}

        {org && <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Head icon="link" title="Invite people" sub="Copy the link, show the QR code, or share." />
          <div style={{ display: 'flex', gap: 8 }}><button className="btn2" style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setQr(true)}><Icon n="qr" s={18} />QR code</button><button className="btn2" style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={share}><Icon n="share" s={18} />Share</button></div>
          <button className="btn" style={{ height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={copy}><Icon n="copy" s={18} />{copied ? 'Invite link copied' : 'Copy invite link'}</button></div>}

        {org && <button className="btn2" onClick={() => setStatus(g.status === 'closed' ? 'active' : 'closed')}>{g.status === 'closed' ? 'Reopen this goal' : 'Close this goal'}</button>}
        {!org && <button className="btn2" onClick={drop(user.uid, true)}>Leave goal</button>}
      </div>
      {qr && <QrSheet url={url} name={g.name} onClose={() => setQr(false)} />}
    </main>
  );
}
