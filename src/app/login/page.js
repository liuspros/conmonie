'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function Login() {
  const r = useRouter();
  const [up, setUp] = useState(false), [f, setF] = useState({ name: '', email: '', pw: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function go(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (up) {
        const c = await createUserWithEmailAndPassword(auth, f.email, f.pw);
        await setDoc(doc(db, 'users', c.user.uid), { name: f.name.trim() || 'Member', avatar: 0, createdAt: Date.now() });
      } else await signInWithEmailAndPassword(auth, f.email, f.pw);
      r.replace(new URLSearchParams(window.location.search).get('next') || '/');
    } catch (x) { setErr(x.code === 'auth/invalid-credential' ? 'Wrong email or password.' : x.code === 'auth/email-already-in-use' ? 'This email already has an account. Log in instead.' : x.code === 'auth/weak-password' ? 'Use at least 6 characters.' : 'Could not continue. Check your details and network.'); }
    setBusy(false);
  }
  return (
    <main className="app" style={{ justifyContent: 'center' }}>
      <img src="/icon-192.png" width="72" height="72" alt="Conmonie" style={{ borderRadius: 18 }} />
      <h1 style={{ fontSize: 30, fontWeight: 700 }}>{up ? 'Create your account' : 'Welcome back'}</h1>
      <p className="m">Track every Ajo contribution in one place.</p>
      <form onSubmit={go} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {up && <input className="inp" placeholder="Full name" value={f.name} onChange={set('name')} required autoComplete="name" />}
        <input className="inp" type="email" placeholder="Email" value={f.email} onChange={set('email')} required autoComplete="email" />
        <input className="inp" type="password" placeholder="Password" value={f.pw} onChange={set('pw')} required autoComplete={up ? 'new-password' : 'current-password'} />
        {err && <p role="alert" className="m" style={{ color: '#0A0A0A', fontWeight: 600 }}>{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'One moment...' : up ? 'Create account' : 'Log in'}</button>
      </form>
      <button className="btn2" onClick={() => setUp(!up)}>{up ? 'I have an account' : 'Create an account'}</button>
    </main>
  );
}
