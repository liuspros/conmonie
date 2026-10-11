'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function VerifyCard() {
  const { profile } = useAuth(), s = profile?.verifyStatus;
  return (
    <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="r"><b>Identity check</b>{s === 'verified' && <span className="tag k">Verified</span>}{s === 'pending' && <span className="tag">Under review</span>}</div>
      <span className="m">{s === 'verified' ? 'Your identity is verified. Groups can see the Verified badge next to your name.' : s === 'pending' ? 'Our team is reviewing your documents. You will get a notification.' : s === 'rejected' ? 'Your last check was not approved. You can try again.' : 'Get a Verified badge: it helps admins trust you and is needed for some groups. It takes about 3 minutes.'}</span>
      {s !== 'verified' && s !== 'pending' && <Link href="/verify" className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, textDecoration: 'none' }}>{s === 'rejected' ? 'Try again' : 'Get verified'}</Link>}
    </div>
  );
}
