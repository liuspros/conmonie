'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, writeBatch, arrayUnion, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { TERMS } from '@/lib/terms';
import { naira } from '@/lib/utils';
import Skeleton from '@/components/Skeleton';
import Loader from '@/components/Loader';
import Icon from '@/components/Icon';

export default function Join() {
  const { code } = useParams(), r = useRouter(), { user, profile } = useRequireAuth();
  const [inv, setInv] = useState(undefined), [ok, setOk] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  useEffect(() => { if (user) getDoc(doc(db, 'invites', code)).then((s) => setInv(s.exists() ? s.data() : null)).catch(() => setInv(null)); }, [user, code]);
  const goal = inv && inv.kind === 'goal';
  async function join() {
    if (!navigator.onLine) { setErr('You are offline. Connect to the internet to join.'); return; }
    setBusy(true); setErr('');
    try {
      const col = goal ? 'goals' : 'groups', ref = doc(db, col, inv.gid), b = writeBatch(db), base = { name: profile?.name || 'Member', avatar: profile?.avatar || 0, termsAt: Date.now(), termsVersion: 1 };
      if (goal) { b.update(ref, { members: arrayUnion(user.uid), memberCount: increment(1) }); b.set(doc(db, col, inv.gid, 'members', user.uid), { ...base, total: 0 }); }
      else { b.update(ref, { members: arrayUnion(user.uid), order: arrayUnion(user.uid), memberCount: increment(1) }); b.set(doc(db, col, inv.gid, 'members', user.uid), { ...base, streak: 0, best: 0 }); }
      await b.commit(); r.replace((goal ? '/goal/' : '/g/') + inv.gid);
    } catch { setErr('Could not join. You may already be a member.'); setBusy(false); }
  }
  return (
    <main className="app">
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div className="dark" style={{ width: 56, height: 56, padding: 0, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon n="info" s={26} /></div>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Do you trust the person who sent you this link?</h1>
        <p className="m" style={{ lineHeight: 1.5 }}>Only join people you know. We never hold your money. Payments go straight to the account the {goal ? 'organizer' : 'admin'} shows.</p>
      </div>
      {inv === undefined && <Skeleton n={2} h={90} />}
      {inv === null && <div className="glass"><b>This invite link is not valid.</b><p className="m">Ask for a new link.</p></div>}
      {inv && <>
        <div className="glass"><b>{inv.name}</b>{goal
          ? <div className="m">ConGoal &middot; target {naira(inv.target)} by {new Date(inv.deadline).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })} &middot; organizer {inv.adminName}</div>
          : <div className="m">Admin: {inv.adminName} &middot; {naira(inv.amount)} every {inv.frequencyDays} day(s)</div>}</div>
        <div className="glass" style={{ fontSize: 13, lineHeight: 1.6 }}><b>Terms</b><ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>{TERMS.map((t) => <li key={t}>{t}</li>)}</ol></div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ width: 22, height: 22 }} />I read the Terms and I trust the sender.</label>
        {err && <p role="alert" className="m" style={{ fontWeight: 600 }}>{err}</p>}
        {busy ? <Loader label="Joining..." /> : <button className="btn" disabled={!ok} onClick={join}>I trust them, join</button>}
      </>}
      <button className="btn2" onClick={() => r.replace('/')}>Go back</button>
    </main>
  );
}
