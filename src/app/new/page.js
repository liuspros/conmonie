'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { midnight, publicDoc } from '@/lib/utils';
import BankSelect from '@/components/BankSelect';

const L = ({ l, children }) => <label className="m" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, flex: 1, minWidth: 0 }}>{l}{children}</label>;

export default function NewAjo() {
  const { user, profile } = useRequireAuth(), r = useRouter();
  const [f, setF] = useState({ name: '', desc: '', amount: '2000', frequencyDays: '3', dueTime: '18:00', lateFee: '0', packingFee: '0', bank: '', number: '', acctName: '' }), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [pub, setPub] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function create(e) {
    e.preventDefault(); if (!navigator.onLine) { setErr('You are offline. Connect to the internet to create an Ajo.'); return; } setBusy(true); setErr('');
    const gref = doc(collection(db, 'groups')), code = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const g = { name: f.name.trim(), description: f.desc.trim(), adminId: user.uid, adminName: profile?.name || 'Admin', amount: +f.amount, frequencyDays: +f.frequencyDays, dueTime: f.dueTime, lateFee: +f.lateFee,
      packingFee: +f.packingFee || 0, public: pub, members: [user.uid], order: [user.uid], memberCount: 1, startAt: midnight(Date.now()), inviteCode: code, createdAt: Date.now() };
    const b = writeBatch(db);
    b.set(gref, g);
    b.set(doc(db, 'invites', code), { gid: gref.id, adminId: user.uid, adminName: g.adminName, name: g.name, amount: g.amount, frequencyDays: g.frequencyDays, lateFee: g.lateFee });
    b.set(doc(db, 'groups', gref.id, 'members', user.uid), { name: g.adminName, avatar: profile?.avatar || 0, streak: 0, best: 0, termsAt: Date.now(), termsVersion: 1 });
    try {
      await b.commit();
      await setDoc(doc(db, 'groups', gref.id, 'private', 'acct'), { bank: f.bank.trim(), number: f.number.trim(), name: f.acctName.trim() });
      if (pub) await setDoc(doc(db, 'publicGroups', gref.id), publicDoc(gref.id, g, g.adminName));
      await addDoc(collection(db, 'groups', gref.id, 'messages'), { type: 'system', text: g.name + ' was created', uid: user.uid, at: Date.now() }).catch(() => {});
      r.replace('/g/' + gref.id);
    } catch (x) { setErr('Could not create the Ajo. Check your connection and try again.'); setBusy(false); }
  }
  return (
    <main className="app">
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Create an Ajo</h1>
      <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <L l="Group name"><input className="inp" value={f.name} onChange={set('name')} required placeholder="Lagos Traders Ajo" /></L>
        <L l="Description (optional)"><textarea className="inp" style={{ height: 84, padding: 12 }} value={f.desc} onChange={set('desc')} placeholder="Rules, payment day, anything members should know" /></L>
        <div style={{ display: 'flex', gap: 10 }}>
          <L l={'Contribution (\u20A6)'}><input className="inp" type="number" min="100" value={f.amount} onChange={set('amount')} required inputMode="numeric" /></L>
          <L l={'Late fee to admin (\u20A6)'}><input className="inp" type="number" min="0" value={f.lateFee} onChange={set('lateFee')} required inputMode="numeric" /></L>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <L l="Packing every (days)"><input className="inp" type="number" min="1" value={f.frequencyDays} onChange={set('frequencyDays')} required inputMode="numeric" /></L>
          <L l="Due time"><input className="inp" type="time" value={f.dueTime} onChange={set('dueTime')} required /></L>
        </div>
        <L l={'Packing fee to admin, per member (\u20A6)'}><input className="inp" type="number" min="0" value={f.packingFee} onChange={set('packingFee')} inputMode="numeric" /></L>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}><input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} style={{ width: 22, height: 22 }} />Show this group in Explore so verified people can request to join</label>
        <div className="m" style={{ marginTop: 4 }}>Account members pay into (yours). Only members can see it.</div>
        <BankSelect value={f.bank} onChange={(v) => setF({ ...f, bank: v })} required />
        <input className="inp" placeholder="Account number" value={f.number} onChange={set('number')} required inputMode="numeric" maxLength={10} />
        <input className="inp" placeholder="Account name" value={f.acctName} onChange={set('acctName')} required />
        <button className="btn" disabled={busy}>{busy ? 'Creating...' : 'Create Ajo'}</button>
        {err && <p role="alert" className="m" style={{ fontWeight: 600 }}>{err}</p>}
      </form>
    </main>
  );
}
