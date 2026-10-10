'use client';
import { useState } from 'react';
import { useInstall } from '@/context/InstallContext';
import InstallSheet from '@/components/InstallSheet';

export default function InstallButton({ className = 'btn', style, onDone }) {
  const { installed, canPrompt, install } = useInstall(), [sheet, setSheet] = useState(false);
  if (installed) return null;
  const go = async () => { if (canPrompt) { if (await install()) onDone && onDone(); } else setSheet(true); };
  return (<><button className={className} style={style} onClick={go}>Install app</button>{sheet && <InstallSheet onClose={() => setSheet(false)} />}</>);
}
