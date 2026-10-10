'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { midnight } from '@/lib/utils';

const L = ({ l, children }) => <label className="m" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, flex: 1, minWidth: 0 }}>{l}{children}</label>;

export default function NewAjo() {
  const { user, profile } = useRequireAuth(), r = useRouter();
  const [f, setF] = useState({ name: '', amount: '2000', frequencyDays: '3', dueTime: '18:00', lateFee: '100', bank: '', number: '', acctName: '' }), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function create(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const gref = doc(collection(db, 'groups')), code = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const g = { name: f.name.trim(), adminId: user.uid, adminName: profile?.name || 'Admin', amount: +f.amount, frequencyDays: +f.frequencyDays, dueTime: f.dueTime, lateFee: +f.lateFee,
      acct: { bank: f.bank.trim(), number: f.number.trim(), name: f.acctName.trim() }, members: [user.uid], order: [user.uid], memberCount: 1, startAt: midnight(Date.now()), inviteCode: code, createdAt: Date.now() };
    const b = writeBatch(db);
    b.set(gref, g);
    b.set(doc(db, 'invites', code), { gid: gref.id, adminId: user.uid, adminName: g.adminName, name: g.name, amount: g.amount, frequencyDays: g.frequencyDays, lateFee: g.lateFee });
    b.set(doc(db, 'groups', gref.id, 'members', user.uid), { name: g.adminName, avatar: profile?.avatar || 0, streak: 0, best: 0 });
    try {
      await b.commit();
      await addDoc(collection(db, 'groups', gref.id, 'messages'), { type: 'system', text: g.name + ' was created', uid: user.uid, at: Date.now() }).catch(() => {});
      r.replace('/g/' + gref.id);
    } catch (x) { setErr('Could not create the Ajo. Check your connection and try again.'); setBusy(false); }
  }
  return (
    <main className="app">
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Create an Ajo</h1>
      <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <L l="Group name"><input className="inp" value={f.name} onChange={set('name')} required placeholder="Lagos Traders Ajo" /></L>
        <div style={{ display: 'flex', gap: 10 }}>
          <L l={'Contribution (\u20A6)'}><input className="inp" type="number" min="100" value={f.amount} onChange={set('amount')} required inputMode="numeric" /></L>
          <L l={'Late fee (\u20A6)'}><input className="inp" type="number" min="0" value={f.lateFee} onChange={set('lateFee')} required inputMode="numeric" /></L>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <L l="Packing every (days)"><input className="inp" type="number" min="1" value={f.frequencyDays} onChange={set('frequencyDays')} required inputMode="numeric" /></L>
          <L l="Due time"><input className="inp" type="time" value={f.dueTime} onChange={set('dueTime')} required /></L>
        </div>
        <div className="m" style={{ marginTop: 4 }}>Account members pay into (yours)</div>
        <input className="inp" placeholder="Bank" value={f.bank} onChange={set('bank')} required />
        <input className="inp" placeholder="Account number" value={f.number} onChange={set('number')} required inputMode="numeric" maxLength={10} />
        <input className="inp" placeholder="Account name" value={f.acctName} onChange={set('acctName')} required />
        <button className="btn" disabled={busy}>{busy ? 'Creating...' : 'Create Ajo'}</button>
        {err && <p role="alert" className="m" style={{ fontWeight: 600 }}>{err}</p>}
      </form>
    </main>
  );
}
