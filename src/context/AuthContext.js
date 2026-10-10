'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';

const Ctx = createContext({ user: null, profile: null, loading: true });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); if (!u) { setProfile(null); setLoading(false); } }), []);
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'users', user.uid), (s) => { setProfile(s.data() || null); setLoading(false); }, () => setLoading(false));
  }, [user]);
  return <Ctx.Provider value={{ user, profile, loading }}>{children}</Ctx.Provider>;
}

export function useRequireAuth() {
  const a = useAuth(), r = useRouter(), p = usePathname();
  useEffect(() => { if (!a.loading && !a.user) r.replace('/login?next=' + encodeURIComponent(p)); }, [a.loading, a.user]);
  return a;
}
