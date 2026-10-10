'use client';
import { useInstall } from '@/context/InstallContext';

export default function InstallSheet({ onClose }) {
  const { ios } = useInstall();
  const steps = ios
    ? ['Open Conmonie in Safari.', 'Tap the Share button (the square with an arrow).', 'Scroll down and tap Add to Home Screen.', 'Tap Add. Conmonie now opens like any other app.']
    : ['Open your browser menu (the three dots).', 'Tap Install app or Add to Home screen.', 'Confirm. Conmonie now opens like any other app.'];
  return (
    <div role="dialog" aria-modal="true" aria-label="Install Conmonie" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(10,10,12,.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(430px, 100%)', background: '#fff', borderRadius: '28px 28px 0 0', padding: '22px 22px calc(env(safe-area-inset-bottom) + 22px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><img src="/icon-192.png" width="48" height="48" alt="" style={{ borderRadius: 12 }} /><div><b style={{ fontSize: 18 }}>Install Conmonie</b><div className="m">{ios ? 'On iPhone' : 'In your browser'}</div></div></div>
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, fontSize: 15 }}>{steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <button className="btn" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
