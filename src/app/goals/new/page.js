'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import BankSelect from '@/components/BankSelect';
import Loader from '@/components/Loader';
import Icon from '@/components/Icon';
import { useKyc } from '@/context/KycContext';

const CATS = ['Equipment', 'Trip', 'Event', 'Project', 'Emergency', 'Celebration', 'Other'];
const L = ({ l, children }) => <label className="m" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, flex: 1, minWidth: 0 }}>{l}{children}</label>;
export default function NewGoal() {
  const { user, profile } = useRequireAuth(), r = useRouter(), { requireKyc } = useKyc();
  useEffect(() => { if (profile && !profile.verified) requireKyc(); }, [profile]);
  const tomorrow = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  const [f, setF] = useState({ name: '', desc: '', cat: 'Equipment', target: '', date: tomorrow, suggested: '', bank: '', number: '', acctName: '' }), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function create(e) {
    e.preventDefault(); setErr(''); if (!requireKyc()) return;
    if (!navigator.onLine) return setErr('You are offline. Connect to the internet to create a ConGoal.');
    const deadline = new Date(f.date + 'T23:59:00+01:00').getTime();
    if (!(deadline > Date.now())) return setErr('Pick a deadline in the future.');
    setBusy(true);
    const gref = doc(collection(db, 'goals')), code = crypto.randomUUID().replace(/-/g, '').slice(0, 8), name = profile?.name || 'Organizer';
    const goal = { name: f.name.trim(), description: f.desc.trim(), category: f.cat, target: +f.target, deadline, suggested: +f.suggested || 0, organizerId: user.uid, organizerName: name, members: [user.uid], memberCount: 1, collected: 0, status: 'active', inviteCode: code, createdAt: Date.now() };
    try {
      const b = writeBatch(db);
      b.set(gref, goal);
      b.set(doc(db, 'invites', code), { kind: 'goal', gid: gref.id, adminId: user.uid, adminName: name, name: goal.name, target: goal.target, deadline });
      b.set(doc(db, 'goals', gref.id, 'members', user.uid), { name, avatar: profile?.avatar || 0, total: 0, termsAt: Date.now(), termsVersion: 1 });
      await b.commit();
      await setDoc(doc(db, 'goals', gref.id, 'private', 'acct'), { bank: f.bank.trim(), number: f.number.trim(), name: f.acctName.trim() });
      await addDoc(collection(db, 'goals', gref.id, 'messages'), { type: 'system', text: goal.name + ' was created', uid: user.uid, at: Date.now() }).catch(() => {});
      r.replace('/goal/' + gref.id);
    } catch { setErr('Could not create the ConGoal. Check your connection and try again.'); setBusy(false); }
  }
  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <Link href="/goals" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: 8, alignItems: 'center' }}><Icon n="back" s={18} />ConGoal</Link>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Create a ConGoal</h1>
      {busy ? <Loader label="Creating your ConGoal..." /> : (
        <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <L l="What are you saving for?"><input className="inp" value={f.name} onChange={set('name')} required placeholder="New laptops for the design lab" /></L>
          <div role="group" aria-label="Category" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{CATS.map((c) => <button key={c} type="button" onClick={() => setF({ ...f, cat: c })} aria-pressed={f.cat === c} className="pill" style={{ background: f.cat === c ? '#2F7DE1' : '#E3E5E8', color: f.cat === c ? '#fff' : '#0A0A0A' }}>{c}</button>)}</div>
          <L l="Tell people about it"><textarea className="inp" style={{ height: 84, padding: 12 }} value={f.desc} onChange={set('desc')} placeholder="What the money is for, who it helps and how you will spend it" /></L>
          <div style={{ display: 'flex', gap: 10 }}>
            <L l={'Target amount (\u20A6)'}><input className="inp" type="number" min="1000" value={f.target} onChange={set('target')} required inputMode="numeric" placeholder="500000" /></L>
            <L l="Deadline"><input className="inp" type="date" min={new Date(Date.now() + 864e5).toISOString().slice(0, 10)} value={f.date} onChange={set('date')} required /></L>
          </div>
          <L l={'Suggested amount per member (\u20A6, optional)'}><input className="inp" type="number" min="0" value={f.suggested} onChange={set('suggested')} inputMode="numeric" placeholder="5000" /></L>
          <div className="m" style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>The account members pay into. Money goes straight to this account; Conmonie never holds it. Only members can see it.</div>
          <BankSelect value={f.bank} onChange={(v) => setF({ ...f, bank: v })} required />
          <input className="inp" placeholder="Account number" value={f.number} onChange={set('number')} required inputMode="numeric" maxLength={10} />
          <input className="inp" placeholder="Account name" value={f.acctName} onChange={set('acctName')} required />
          {err && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>{err}</p>}
          <button className="btn">Create ConGoal</button>
        </form>)}
    </main>
  );
}
