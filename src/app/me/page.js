'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import Av, { PRESETS } from '@/components/Av';
import TabBar from '@/components/TabBar';
import Icon, { IconBadge } from '@/components/Icon';
import BankSelect from '@/components/BankSelect';
import VerifyCard from '@/components/VerifyCard';
import InstallSettings from '@/components/InstallSettings';
import BiometricSettings from '@/components/BiometricSettings';
import PushToggle from '@/components/PushToggle';
import { clearBio } from '@/lib/biometric';

const Field = ({ icon, children }) => <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 14, top: 15, color: '#B8BCC2', zIndex: 1 }}><Icon n={icon} s={20} /></span>{children}</div>;
const dk = { background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.14)', color: '#fff', paddingLeft: 46 };
const Row = ({ icon, label, href, onClick }) => {
  const inner = <><IconBadge n={icon} s={18} /><span style={{ flex: 1, fontSize: 16 }}>{label}</span><Icon n="right" s={18} c="#6B7076" /></>;
  return href ? <Link href={href} className="rowline" style={{ color: 'inherit', textDecoration: 'none' }}>{inner}</Link> : <button className="rowline" style={{ background: 'none', width: '100%', textAlign: 'left' }} onClick={onClick}>{inner}</button>;
};

export default function Me() {
  const { user, profile } = useRequireAuth(), router = useRouter();
  const [p, setP] = useState({ bank: '', number: '', name: '' }), [saved, setSaved] = useState(false);
  useEffect(() => { if (profile?.payout) setP(profile.payout); }, [profile]);
  const save = async (e) => { e.preventDefault(); await updateDoc(doc(db, 'users', user.uid), { payout: p }); setSaved(true); setTimeout(() => setSaved(false), 1500); };
  const pick = (i) => updateDoc(doc(db, 'users', user.uid), { avatar: i });
  const guide = () => { try { localStorage.removeItem('conmonie-tour-home'); localStorage.removeItem('conmonie-tour-group'); } catch {} router.push('/'); };
  return (
    <main className="app">
      <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: 'center' }}>Me</h1>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Av i={profile?.avatar} size={104} />
        <b style={{ fontSize: 22 }}>{profile?.name || '\u00A0'}</b>
        <div style={{ display: 'flex', gap: 10 }}>{PRESETS.map((_, i) => <button key={i} onClick={() => pick(i)} aria-label={'Colour ' + (i + 1)} style={{ width: 30, height: 30, borderRadius: '50%', background: PRESETS[i], border: (profile?.avatar || 0) === i ? '3px solid #0A0A0A' : '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,.12)' }} />)}</div>
      </div>
      <form onSubmit={save} className="dark" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span className="ibadge" style={{ background: 'rgba(255,255,255,.1)', color: '#fff' }}><Icon n="bank" /></span><div><b style={{ fontSize: 18 }}>Payout account</b><div style={{ fontSize: 13, color: '#B8BCC2' }}>Shown to the group when it is your turn to be paid.</div></div></div>
        <BankSelect dark value={p.bank} onChange={(v) => setP({ ...p, bank: v })} required />
        <Field icon="card"><input className="inp" style={dk} placeholder="Account number" inputMode="numeric" maxLength={10} value={p.number} onChange={(e) => setP({ ...p, number: e.target.value })} required /></Field>
        <Field icon="user"><input className="inp" style={dk} placeholder="Account name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required /></Field>
        <button className="btn">{saved ? 'Saved' : 'Save account'}</button>
      </form>
      <VerifyCard /><InstallSettings /><BiometricSettings /><PushToggle />
      <div className="glass" style={{ padding: '4px 16px' }}>
        <Row icon="compass" label="How it works" href="/how" /><Row icon="book" label="App guide" onClick={guide} /><Row icon="doc" label="Member agreement" href="/agreement" />
        <Row icon="doc" label="Terms and conditions" href="/terms" /><Row icon="shield" label="Privacy and policy" href="/privacy" />
        <Row icon="logout" label="Log out" onClick={() => { clearBio(user.uid); signOut(auth); }} />
      </div>
      <p className="m" style={{ textAlign: 'center', fontSize: 12 }}>Conmonie &middot; by Lius Creatives</p>
      <TabBar />
    </main>
  );
}
