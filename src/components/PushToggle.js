'use client';
import { useEffect, useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { IconBadge } from '@/components/Icon';

export default function PushToggle() {
  const { user } = useAuth(), [st, setSt] = useState('checking');
  useEffect(() => {
    (async () => {
      const { isSupported } = await import('firebase/messaging');
      if (!('Notification' in window) || !(await isSupported())) return setSt('unsupported');
      setSt(Notification.permission === 'granted' ? 'on' : Notification.permission === 'denied' ? 'blocked' : 'off');
    })().catch(() => setSt('unsupported'));
  }, []);
  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return setSt(perm === 'denied' ? 'blocked' : 'off');
    const { getMessaging, getToken } = await import('firebase/messaging');
    try {
      await navigator.serviceWorker.register('/sw.js');
      const reg = await navigator.serviceWorker.ready;
      const token = await getToken(getMessaging(app), { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, serviceWorkerRegistration: reg });
      if (token) { await updateDoc(doc(db, 'users', user.uid), { fcmTokens: arrayUnion(token) }); setSt('on'); }
    } catch { setSt('failed'); }
  }
  const msg = { on: 'Notifications are on for this device.', blocked: 'Blocked in your browser settings. Allow notifications for this site to turn them on.', unsupported: 'Not available here. On iPhone, add Conmonie to your Home Screen first, then open it from there.', off: 'Get reminders before payments are due and know the moment your admin confirms.', failed: 'Could not turn on notifications. Check that the app is fully loaded and try again.', checking: '' }[st];
  return (
    <div className="glass" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <IconBadge n="bell" /><div style={{ flex: 1 }}><b>Notifications</b><div className="m" style={{ fontSize: 13 }}>{msg}</div></div>
      {st === 'on' && <span className="st st-ok">On</span>}
      {(st === 'off' || st === 'failed') && <button className="pill g" onClick={enable}>Turn on</button>}
    </div>
  );
}
