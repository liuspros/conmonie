'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { IconBadge } from '@/components/Icon';

export default function VerifyCard() {
  const { profile } = useAuth(), ok = profile?.verified;
  return (
    <div className="glass">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <IconBadge n="shield" tone={ok ? 'g' : ''} />
        <div style={{ flex: 1 }}><b>Identity check (KYC)</b><div className="m" style={{ fontSize: 13 }}>{ok ? 'You are verified. Your Verified badge shows in groups.' : 'Verify your KYC to join or create a group.'}</div></div>
        {ok && <span className="st st-ok">Verified</span>}
      </div>
      {!ok && <Link href="/onboarding" className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, textDecoration: 'none', marginTop: 12 }}>Verify now</Link>}
    </div>
  );
}
