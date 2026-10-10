importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
firebase.initializeApp({ apiKey: 'AIzaSyBtOdqlLRXrYbmM88pozUzXcePmuw3qbbU', authDomain: 'conmonie.firebaseapp.com', projectId: 'conmonie', storageBucket: 'conmonie.firebasestorage.app', messagingSenderId: '428635089385', appId: '1:428635089385:web:2d8ff59de09584db4d8378' });
const messaging = firebase.messaging();
// Messages are data-only, so we show them ourselves (no duplicates).
messaging.onBackgroundMessage((p) => {
  const d = p.data || {};
  self.registration.showNotification(d.title || 'Conmonie', { body: d.body, icon: '/icon-192.png', badge: '/icon-192.png', data: { link: d.link || '/' } });
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.link));
});
