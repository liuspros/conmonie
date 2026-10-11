'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { normalizePhone } from '@/lib/social';
import Icon from '@/components/Icon';
import Loader from '@/components/Loader';

const MSG = {
  'auth/invalid-credential': 'Wrong email or password.', 'auth/email-already-in-use': 'This email already has an account. Log in instead.', 'auth/weak-password': 'Use at least 6 characters.',
  'auth/invalid-phone-number': 'Check the phone number and try again.', 'auth/invalid-verification-code': 'That code is wrong.', 'auth/code-expired': 'That code expired. Ask for a new one.',
  'auth/too-many-requests': 'Too many tries. Wait a few minutes.', 'auth/unauthorized-domain': 'This website address is not authorised in Firebase yet.', 'auth/operation-not-allowed': 'This sign-in method is not switched on in Firebase yet.',
};

export default function Login() {
  const r = useRouter(), { user, loading } = useAuth();
  const [mode, setMode] = useState('choose'), [up, setUp] = useState(false), [f, setF] = useState({ name: '', email: '', pw: '' }), [phone, setPhone] = useState(''), [conf, setConf] = useState(null), [code, setCode] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  useEffect(() => { if (user && !loading) r.replace(new URLSearchParams(window.location.search).get('next') || '/'); }, [user, loading]);
  const fail = (e) => { if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') setErr(MSG[e.code] || 'Could not continue. Check your details and network.'); setBusy(''); };

  async function email(e) {
    e.preventDefault(); setErr(''); setBusy(up ? 'Creating your account...' : 'Signing you in...');
    try {
      if (up) { const c = await createUserWithEmailAndPassword(auth, f.email, f.pw); await setDoc(doc(db, 'users', c.user.uid), { name: f.name.trim(), avatar: 0, createdAt: Date.now() }, { merge: true }); }
      else await signInWithEmailAndPassword(auth, f.email, f.pw);
    } catch (x) { fail(x); }
  }
  async function google() {
    setErr(''); setBusy('Opening Google...');
    const p = new GoogleAuthProvider();
    try { await signInWithPopup(auth, p); } catch (x) { if (x.code === 'auth/popup-blocked' || x.code === 'auth/operation-not-supported-in-this-environment') { try { await signInWithRedirect(auth, p); return; } catch (y) { return fail(y); } } fail(x); }
  }
  async function sendCode(e) {
    e.preventDefault(); setErr('');
    const n = normalizePhone(phone); if (!n) return setErr('Enter a valid phone number, for example 0801 234 5678.');
    setBusy('Sending your code...');
    try { window.__rc = window.__rc || new RecaptchaVerifier(auth, 'rc', { size: 'invisible' }); setConf(await signInWithPhoneNumber(auth, n, window.__rc)); setBusy(''); }
    catch (x) { try { window.__rc && window.__rc.clear(); } catch {} window.__rc = null; fail(x); }
  }
  async function verify(e) { e.preventDefault(); setErr(''); setBusy('Checking the code...'); try { await conf.confirm(code.trim()); } catch (x) { fail(x); } }

  return (
    <main className="app" style={{ justifyContent: 'center' }}>
      <img src="/icon-192.png" width="72" height="72" alt="Conmonie" style={{ borderRadius: 18 }} />
      <h1 style={{ fontSize: 30, fontWeight: 700 }}>{mode === 'email' && !up ? 'Welcome back' : 'Welcome to Conmonie'}</h1>
      <p className="m" style={{ fontSize: 15 }}>Run your Ajo with people you can trust.</p>
      {busy ? <Loader label={busy} /> : <>
        {mode === 'choose' && <>
          <button className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} onClick={google}><Icon n="user" />Continue with Google</button>
          <button className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} onClick={() => setMode('phone')}><Icon n="chat" />Continue with phone number</button>
          <button className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} onClick={() => setMode('email')}><Icon n="doc" />Continue with email</button>
        </>}
        {mode === 'email' && <form onSubmit={email} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {up && <input className="inp" placeholder="Full name" value={f.name} onChange={set('name')} required autoComplete="name" />}
          <input className="inp" type="email" placeholder="Email" value={f.email} onChange={set('email')} required autoComplete="email" />
          <input className="inp" type="password" placeholder="Password" value={f.pw} onChange={set('pw')} required autoComplete={up ? 'new-password' : 'current-password'} />
          <button className="btn">{up ? 'Create account' : 'Log in'}</button>
          <button type="button" className="m" style={{ background: 'none', textDecoration: 'underline' }} onClick={() => setUp(!up)}>{up ? 'I already have an account' : 'Create a new account'}</button>
        </form>}
        {mode === 'phone' && !conf && <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="inp" type="tel" inputMode="tel" placeholder="Phone number, e.g. 0801 234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
          <button className="btn">Send code</button></form>}
        {mode === 'phone' && conf && <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="m">We sent a 6-digit code to {phone}.</p>
          <input className="inp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} required />
          <button className="btn">Verify</button></form>}
        {mode !== 'choose' && <button className="m" style={{ background: 'none', textDecoration: 'underline' }} onClick={() => { setMode('choose'); setConf(null); setErr(''); }}>Use a different method</button>}
      </>}
      {err && <p role="alert" style={{ fontWeight: 600, fontSize: 14 }}>{err}</p>}
      <p className="m" style={{ fontSize: 12, lineHeight: 1.5, textAlign: 'center' }}>After signing in you will verify your identity. It takes about 5 minutes and is required to join any Ajo.</p>
      <div id="rc" />
    </main>
  );
}
