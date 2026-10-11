'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Skeleton from '@/components/Skeleton';

const OPEN = ['/onboarding', '/login', '/terms', '/privacy', '/agreement', '/how', '/offline'];
// Nobody can use the platform until they have completed onboarding (contact, social proof, ID check, agreement).
export default function Gate({ children }) {
  const { user, profile } = useAuth(), p = usePathname(), r = useRouter();
  const open = OPEN.some((x) => p.startsWith(x)), must = !!user && !!profile && !profile.verified && !open;
  useEffect(() => { if (must) r.replace('/onboarding'); }, [must]);
  if (must || (user && !profile && !open)) return <main className="app"><Skeleton n={3} /></main>;
  return children;
}
