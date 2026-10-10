'use client';
import InstallButton from '@/components/InstallButton';

export default function InstallBanner({ onClose }) {
  return (
    <div className="dark" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <img src="/icon-192.png" width="48" height="48" alt="" style={{ borderRadius: 12, flex: 'none' }} />
      <div style={{ flex: 1 }}><b>Install Conmonie</b><div style={{ fontSize: 12, color: '#B8BCC2', lineHeight: 1.4 }}>Open it like any app, even when the network is slow.</div></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
        <InstallButton className="pill" style={{ justifyContent: 'center' }} onDone={onClose} />
        <button onClick={onClose} style={{ background: 'none', color: '#B8BCC2', fontSize: 12 }}>Not now</button>
      </div>
    </div>
  );
}
