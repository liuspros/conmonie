'use client';
import { useInstall } from '@/context/InstallContext';
import InstallButton from '@/components/InstallButton';
import { IconBadge } from '@/components/Icon';

export default function InstallSettings() {
  const { installed } = useInstall();
  return (
    <div className="glass">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><IconBadge n="download" /><div style={{ flex: 1 }}><b>Install app</b><div className="m" style={{ fontSize: 13 }}>{installed ? 'Conmonie is installed on this device.' : 'Add Conmonie to your home screen so it opens like any other app and loads fast.'}</div></div></div>
      {!installed && <InstallButton style={{ height: 44, marginTop: 12 }} />}
    </div>
  );
}
