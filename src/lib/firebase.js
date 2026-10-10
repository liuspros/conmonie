import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// These web config values are public by design; Firestore rules are what protect the data.
const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBtOdqlLRXrYbmM88pozUzXcePmuw3qbbU',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'conmonie.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'conmonie',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'conmonie.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '428635089385',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:428635089385:web:2d8ff59de09584db4d8378',
};
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
