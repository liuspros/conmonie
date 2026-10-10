'use client';
import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const u = () => setOff(!navigator.onLine); u();
    window.addEventListener('online', u); window.addEventListener('offline', u);
    return () => { window.removeEventListener('online', u); window.removeEventListener('offline', u); };
  }, []);
  if (!off) return null;
  return <div role="status" style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 8px)', left: '50%', transform: 'translateX(-50%)', zIndex: 80, background: 'rgba(10,10,12,.9)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 16, backdropFilter: 'blur(12px)' }}>Offline. Showing saved data.</div>;
}
