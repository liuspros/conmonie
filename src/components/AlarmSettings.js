'use client';
import { useAlarm } from '@/context/AlarmContext';
import { unlockAudio } from '@/lib/alarm';
import { IconBadge } from '@/components/Icon';

export default function AlarmSettings() {
  const { enabled, setEnabled, fire } = useAlarm();
  const test = async () => { await unlockAudio(); fire({ id: 'test-' + Date.now(), title: 'Test reminder', body: 'This alarm rings for 10 seconds and works offline.', link: '/me' }); };
  return (
    <div className="glass">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <IconBadge n="bell" /><div style={{ flex: 1 }}><b>Reminder alarm</b><div className="m" style={{ fontSize: 13 }}>Rings for 10 seconds when a payment is due, even with no internet. The sound is saved on your phone.</div></div>
        <button className="sw" role="switch" aria-checked={enabled} aria-label="Reminder alarm" onClick={() => setEnabled(!enabled)} style={{ background: enabled ? '#C8F135' : '#C7CBD0' }}><span style={{ left: enabled ? 23 : 3 }} /></button>
      </div>
      <button className="btn2" style={{ height: 44, marginTop: 12 }} onClick={test}>Test the alarm</button>
    </div>
  );
}
