'use client';
import { useAuth } from '@/context/AuthContext';
import { IconBadge } from '@/components/Icon';

export default function VerifyCard() {
  const { profile } = useAuth(), ok = profile?.verified;
  return (
    <div className="glass" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <IconBadge n="shield" tone={ok ? 'g' : ''} />
      <div style={{ flex: 1 }}><b>Identity check</b><div className="m" style={{ fontSize: 13 }}>{ok ? 'You are verified. Your Verified badge shows in groups.' : 'Complete your identity check to use Conmonie.'}</div></div>
      {ok && <span className="st st-ok">Verified</span>}
    </div>
  );
}
