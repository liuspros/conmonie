import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { cfg } from '@/lib/config';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const app = getApps().length ? getApp() : initializeApp(cfg);

// Offline cache keeps the app usable on weak networks (browser only).
let db;
try {
  db = typeof window !== 'undefined'
    ? initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
    : getFirestore(app);
} catch { db = getFirestore(app); }

export { app, db };
export const auth = getAuth(app);
