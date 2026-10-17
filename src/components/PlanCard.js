'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { proActive, proUntil } from '@/lib/plans';
import Icon, { IconBadge } from '@/components/Icon';

export default function PlanCard() {
  const { profile } = useAuth(), pro = proActive(profile), until = proUntil(profile);
  return (
    <Link href="/pro" className="glass" style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
      <IconBadge n="flame" tone={pro ? 'g' : ''} /><div style={{ flex: 1 }}><b>Conmonie {pro ? 'Pro' : 'Free'}</b><div className="m" style={{ fontSize: 13 }}>{pro ? 'Active' + (until ? ' until ' + new Date(until).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '') : 'Upgrade for unlimited members and the Ping Trigger.'}</div></div><Icon n="right" s={18} c="#6B7076" />
    </Link>
  );
}
