// Public web config (safe to expose; Firestore rules protect the data).
export const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBtOdqlLRXrYbmM88pozUzXcePmuw3qbbU',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'conmonie.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'conmonie',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'conmonie.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '428635089385',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:428635089385:web:2d8ff59de09584db4d8378',
};
