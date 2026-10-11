'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { hasBio, clearBio, enrollBio, verifyBio } from '@/lib/biometric';
import Icon from '@/components/Icon';

const Ctx = createContext({});
export const useLock = () => useContext(Ctx);
const IDLE_MS = 30000; // lock again after the app has been in the background this long

export function LockProvider({ children }) {
  const { user, profile } = useAuth();
  const [unlocked, setUnlocked] = useState(null), [, bump] = useState(0), [err, setErr] = useState(''), [busy, setBusy] = useState(false), hiddenAt = useRef(0);
  const bioOn = !!user && hasBio(user.uid), locked = bioOn && unlocked !== user.uid;

  useEffect(() => { if (user) try { localStorage.removeItem('conmonie-pin-' + user.uid); localStorage.removeItem('conmonie-pinfail-' + user.uid); } catch {} }, [user]);
  useEffect(() => {
    const f = () => { if (document.hidden) hiddenAt.current = Date.now(); else if (hiddenAt.current && Date.now() - hiddenAt.current > IDLE_MS) setUnlocked(null); };
    document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f);
  }, []);
  async function unlock(auto) {
    if (busy) return; setBusy(true); setErr('');
    try { await verifyBio(user.uid); setUnlocked(user.uid); } catch { setErr(auto ? 'Tap the button to unlock.' : 'Not unlocked. Try again.'); }
    setBusy(false);
  }
  useEffect(() => { if (locked) unlock(true); }, [locked]);
  const value = {
    bioOn,
    enable: async () => { await enrollBio(user, profile?.name); setUnlocked(user.uid); bump((n) => n + 1); },
    disable: async () => { await verifyBio(user.uid); clearBio(user.uid); bump((n) => n + 1); },
    lockNow: () => setUnlocked(null),
  };
  // The app stays mounted underneath (so a half-finished form is not lost); it is just hidden behind the lock screen.
  return (
    <Ctx.Provider value={value}>
      <div style={{ visibility: locked ? 'hidden' : 'visible' }} aria-hidden={locked}>{children}</div>
      {locked && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflow: 'auto', background: 'linear-gradient(180deg,#fff,#E9ECEF)' }}>
          <main className="app" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 18 }}>
            <img src="/icon-192.png" width="72" height="72" alt="Conmonie" style={{ borderRadius: 18 }} />
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Conmonie is locked</h1>
            <p className="m" style={{ maxWidth: 260, lineHeight: 1.5 }}>Use your fingerprint or face to open it.</p>
            <p role="alert" style={{ minHeight: 18, fontSize: 13, fontWeight: 600 }}>{err}</p>
            <button className="btn" style={{ maxWidth: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={busy} onClick={() => unlock(false)}><Icon n="finger" />{busy ? 'Waiting...' : 'Unlock'}</button>
            <button className="m" style={{ background: 'none', textDecoration: 'underline' }} onClick={() => { clearBio(user.uid); signOut(auth); }}>Cannot unlock? Log out</button>
          </main>
        </div>)}
    </Ctx.Provider>
  );
}
