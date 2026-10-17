'use client';
import { useAuth } from '@/context/AuthContext';
import Skeleton from '@/components/Skeleton';

// Waits for the profile to load. Identity verification is not forced here: it is asked for only when someone joins or creates a group.
export default function Gate({ children }) {
  const { user, profile } = useAuth();
  if (user && !profile) return <main className="app"><Skeleton n={3} /></main>;
  return children;
}
