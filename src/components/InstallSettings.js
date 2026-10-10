'use client';
import { useInstall } from '@/context/InstallContext';
import InstallButton from '@/components/InstallButton';

export default function InstallSettings() {
  const { installed } = useInstall();
  return (
    <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <b>Install app</b>
      <span className="m">{installed ? 'Conmonie is installed on this device.' : 'Add Conmonie to your home screen so it opens like any other app and loads fast.'}</span>
      {!installed && <InstallButton style={{ height: 44 }} />}
    </div>
  );
}
