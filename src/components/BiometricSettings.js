'use client';
import { useEffect, useState } from 'react';
import { useLock } from '@/context/LockContext';
import { bioSupported } from '@/lib/biometric';

export default function BiometricSettings() {
  const { bioOn, enable, disable, lockNow } = useLock();
  const [ok, setOk] = useState(null), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { bioSupported().then(setOk); }, []);
  const run = (fn, done) => async () => {
    setBusy(true); setMsg('');
    try { await fn(); setMsg(done); } catch { setMsg('That did not work. Try again and confirm with your fingerprint or face.'); }
    setBusy(false);
  };
  if (ok === null) return null;
  return (
    <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <b>Fingerprint or Face ID lock</b>
      <span className="m">{!ok ? 'Not available on this phone or browser. Set up a fingerprint, face or screen lock in your phone settings first.'
        : bioOn ? 'Conmonie asks for your fingerprint or face when you open it or come back after a short break. It uses the same biometrics as your phone.'
        : 'Open Conmonie with the same fingerprint or face that unlocks your phone. Your biometrics never leave the phone.'}</span>
      {msg && <span role="status" style={{ fontSize: 13, fontWeight: 600 }}>{msg}</span>}
      {ok && !bioOn && <button className="btn" style={{ height: 44 }} disabled={busy} onClick={run(enable, 'Lock is on. It will ask the next time you open the app.')}>Turn on</button>}
      {ok && bioOn && <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn2" style={{ height: 44 }} disabled={busy} onClick={run(disable, 'Lock is off.')}>Turn off</button>
        <button className="btn" style={{ height: 44 }} onClick={lockNow}>Lock now</button>
      </div>}
    </div>
  );
}
