'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import Av, { PRESETS } from '@/components/Av';
import TabBar from '@/components/TabBar';
import PushToggle from '@/components/PushToggle';
import BiometricSettings from '@/components/BiometricSettings';
import { clearBio } from '@/lib/biometric';

export default function Me() {
  const { user, profile } = useRequireAuth();
  const [p, setP] = useState({ bank: '', number: '', name: '' }), [saved, setSaved] = useState(false);
  useEffect(() => { if (profile?.payout) setP(profile.payout); }, [profile]);
  const save = async (e) => { e.preventDefault(); await updateDoc(doc(db, 'users', user.uid), { payout: p }); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const pick = (i) => updateDoc(doc(db, 'users', user.uid), { avatar: i });
  return (
    <main className="app">
      <h1 style={{ fontSize: 30, fontWeight: 700, textAlign: 'center' }}>Me</h1>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <Av i={profile?.avatar} size={112} /><b style={{ fontSize: 20 }}>{profile?.name || '\u00A0'}</b>
        <div style={{ display: 'flex', gap: 8 }}>{PRESETS.map((_, i) => <button key={i} onClick={() => pick(i)} aria-label={'Avatar ' + (i + 1)} style={{ width: 36, height: 36, borderRadius: '50%', background: PRESETS[i], border: profile?.avatar === i ? '2px solid #0A0A0A' : '1px solid #fff' }} />)}</div>
      </div>
      <form onSubmit={save} className="dark" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <b>Payout account</b><span style={{ fontSize: 12, color: '#B8BCC2' }}>Shown to the group when it is your turn to be paid.</span>
        {['bank', 'number', 'name'].map((k) => <input key={k} className="inp" style={{ background: 'rgba(255,255,255,.12)', border: 0, color: '#fff' }} placeholder={{ bank: 'Bank', number: 'Account number', name: 'Account name' }[k]} value={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.value })} required />)}
        <button className="btn2" style={{ height: 44 }}>{saved ? 'Saved' : 'Save account'}</button>
      </form>
      <BiometricSettings />
      <PushToggle />
      <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }} className="r"><span>Terms and conditions</span><span className="m">&rsaquo;</span></Link>
        <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }} className="r"><span>Privacy and policy</span><span className="m">&rsaquo;</span></Link>
        <button className="r" style={{ background: 'none', textAlign: 'left', fontSize: 16 }} onClick={() => { clearBio(user.uid); signOut(auth); }}><span>Log out</span></button>
      </div>
      <TabBar />
    </main>
  );
}
