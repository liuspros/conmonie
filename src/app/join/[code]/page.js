'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, writeBatch, arrayUnion, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { TERMS } from '@/lib/terms';
import { naira } from '@/lib/utils';
import Skeleton from '@/components/Skeleton';

export default function Join() {
  const { code } = useParams(), r = useRouter(), { user, profile } = useRequireAuth();
  const [inv, setInv] = useState(undefined), [ok, setOk] = useState(false), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  useEffect(() => { if (user) getDoc(doc(db, 'invites', code)).then((s) => setInv(s.exists() ? s.data() : null)).catch(() => setInv(null)); }, [user, code]);
  async function join() {
    setBusy(true); setErr('');
    try {
      const gref = doc(db, 'groups', inv.gid), b = writeBatch(db);
      b.update(gref, { members: arrayUnion(user.uid), order: arrayUnion(user.uid), memberCount: increment(1) });
      b.set(doc(db, 'groups', inv.gid, 'members', user.uid), { name: profile?.name || 'Member', avatar: profile?.avatar || 0, streak: 0, best: 0 });
      await b.commit(); r.replace('/g/' + inv.gid);
    } catch { setErr('Could not join. You may already be in this group.'); setBusy(false); }
  }
  return (
    <main className="app">
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div className="dark" style={{ width: 56, height: 56, padding: 0, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></svg></div>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Do you trust the person who sent you this link?</h1>
        <p className="m" style={{ lineHeight: 1.5 }}>Only join Ajo groups run by people you know. We never hold your money. Payments go straight to the admin&apos;s account.</p>
      </div>
      {inv === undefined && <Skeleton n={2} h={90} />}
      {inv === null && <div className="glass"><b>This invite link is not valid.</b><p className="m">Ask the admin for a new link.</p></div>}
      {inv && <>
        <div className="glass"><b>{inv.name}</b><div className="m">Admin: {inv.adminName} &middot; {naira(inv.amount)} every {inv.frequencyDays} day(s) &middot; {naira(inv.lateFee)} late fee</div></div>
        <div className="glass" style={{ fontSize: 13, lineHeight: 1.6 }}><b>Terms</b><ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>{TERMS.map((t) => <li key={t}>{t}</li>)}</ol></div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ width: 22, height: 22 }} />I read the Terms and I trust the sender.</label>
        {err && <p role="alert" className="m" style={{ fontWeight: 600 }}>{err}</p>}
        <button className="btn" disabled={!ok || busy} onClick={join}>{busy ? 'Joining...' : 'I trust them, join'}</button>
      </>}
      <button className="btn2" onClick={() => r.replace('/')}>Go back</button>
    </main>
  );
}
