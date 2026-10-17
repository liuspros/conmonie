'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { isStandalone } from '@/context/InstallContext';
import Icon from '@/components/Icon';
import GoogleG from '@/components/GoogleG';
import Loader from '@/components/Loader';

const MSG = {
  'auth/invalid-credential': 'Wrong email or password.', 'auth/email-already-in-use': 'This email already has an account. Log in instead.', 'auth/weak-password': 'Use at least 6 characters.',
  'auth/too-many-requests': 'Too many tries. Wait a few minutes.', 'auth/unauthorized-domain': 'This website address is not authorised in Firebase yet (Authentication, Settings, Authorized domains).',
  'auth/operation-not-allowed': 'This sign-in method is not switched on in Firebase yet.', 'auth/network-request-failed': 'No internet connection. Try again.',
  'auth/account-exists-with-different-credential': 'This email is already used with another sign-in method. Use that method instead.',
};

export default function Login() {
  const r = useRouter(), { user, loading } = useAuth();
  const [mode, setMode] = useState('choose'), [up, setUp] = useState(false), [show, setShow] = useState(false), [f, setF] = useState({ name: '', email: '', pw: '' }), [err, setErr] = useState(''), [errCode, setErrCode] = useState(''), [busy, setBusy] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { if (user && !loading) r.replace(new URLSearchParams(window.location.search).get('next') || '/'); }, [user, loading]);
  const fail = (e) => { setBusy(''); if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) return; setErr(MSG[e && e.code] || 'Could not continue. Check your details and network.'); setErrCode((e && e.code) || ''); };
  useEffect(() => { getRedirectResult(auth).catch(fail); }, []); // errors from a Google redirect arrive here

  async function email(e) {
    e.preventDefault(); setErr(''); setBusy(up ? 'Creating your account...' : 'Signing you in...');
    try {
      if (up) { const c = await createUserWithEmailAndPassword(auth, f.email, f.pw); await setDoc(doc(db, 'users', c.user.uid), { name: f.name.trim(), avatar: 0, createdAt: Date.now() }, { merge: true }); }
      else await signInWithEmailAndPassword(auth, f.email, f.pw);
    } catch (x) { fail(x); }
  }
  async function google() {
    setErr(''); setErrCode(''); setBusy('Opening Google...');
    const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    try {
      if (isStandalone()) { await signInWithRedirect(auth, p); return; } // pop-ups do not work inside an installed app
      await signInWithPopup(auth, p);
    } catch (x) {
      if (x.code === 'auth/popup-blocked' || x.code === 'auth/operation-not-supported-in-this-environment') { try { await signInWithRedirect(auth, p); return; } catch (y) { return fail(y); } }
      fail(x);
    }
  }
  return (
    <main className="app" style={{ justifyContent: 'center' }}>
      <img src="/icon-192.png" width="72" height="72" alt="Conmonie" style={{ borderRadius: 18 }} />
      <h1 style={{ fontSize: 30, fontWeight: 700 }}>{mode === 'email' && !up ? 'Welcome back' : 'Welcome to Conmonie'}</h1>
      <p className="m" style={{ fontSize: 15 }}>Save together with people you can trust.</p>
      {busy ? <Loader label={busy} /> : <>
        {mode === 'choose' && <>
          <button onClick={google} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, height: 52, borderRadius: 26, background: '#fff', border: '1px solid #DADCE0', color: '#3C4043', fontSize: 16, fontWeight: 500, width: '100%', boxShadow: '0 1px 2px rgba(60,64,67,.15)' }}><GoogleG />Continue with Google</button>
          <button className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} onClick={() => setMode('email')}><Icon n="doc" />Continue with email</button>
        </>}
        {mode === 'email' && <form onSubmit={email} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {up && <input className="inp" placeholder="Full name" value={f.name} onChange={set('name')} required autoComplete="name" />}
          <input className="inp" type="email" placeholder="Email" value={f.email} onChange={set('email')} required autoComplete="email" />
          <div style={{ position: 'relative' }}>
            <input className="inp" type={show ? 'text' : 'password'} placeholder="Password" value={f.pw} onChange={set('pw')} required autoComplete={up ? 'new-password' : 'current-password'} style={{ paddingRight: 52 }} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} style={{ position: 'absolute', right: 6, top: 5, width: 40, height: 40, background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7076' }}><Icon n={show ? 'eyeOff' : 'eye'} s={20} /></button>
          </div>
          <button className="btn">{up ? 'Create account' : 'Log in'}</button>
          <button type="button" className="m" style={{ background: 'none', textDecoration: 'underline' }} onClick={() => setUp(!up)}>{up ? 'I already have an account' : 'Create a new account'}</button>
        </form>}
        {mode !== 'choose' && <button className="m" style={{ background: 'none', textDecoration: 'underline' }} onClick={() => { setMode('choose'); setErr(''); }}>Use a different method</button>}
      </>}
      {err && <div role="alert"><p style={{ fontWeight: 600, fontSize: 14 }}>{err}</p>{errCode && <p className="m" style={{ fontSize: 12 }}>Error code: {errCode}</p>}</div>}
      <p className="m" style={{ fontSize: 12, lineHeight: 1.5, textAlign: 'center' }}>You can look around first. You will verify your identity when you join or create a group.</p>
    </main>
  );
}
