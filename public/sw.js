// Conmonie service worker: offline pages + push notifications. Bump V to force a fresh cache.
const V = 'conmonie-v2';
const SHELL = ['/', '/login', '/new', '/me', '/activities', '/notifications', '/terms', '/privacy', '/offline', '/manifest.json', '/icon-192.png', '/3d/badge.png', '/3d/party.png', '/3d/rocket.jpg'];

// Push (optional: if the Firebase script cannot load, offline support still works)
try {
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
  firebase.initializeApp({ apiKey: 'AIzaSyBtOdqlLRXrYbmM88pozUzXcePmuw3qbbU', authDomain: 'conmonie.firebaseapp.com', projectId: 'conmonie', storageBucket: 'conmonie.firebasestorage.app', messagingSenderId: '428635089385', appId: '1:428635089385:web:2d8ff59de09584db4d8378' });
  firebase.messaging().onBackgroundMessage((p) => {
    const d = p.data || {};
    self.registration.showNotification(d.title || 'Conmonie', { body: d.body, icon: '/icon-192.png', badge: '/icon-192.png', data: { link: d.link || '/' } });
  });
} catch (e) {}
self.addEventListener('notificationclick', (e) => { e.notification.close(); e.waitUntil(clients.openWindow((e.notification.data && e.notification.data.link) || '/')); });

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const withTimeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('slow')), ms); p.then((r) => { clearTimeout(t); res(r); }, (x) => { clearTimeout(t); rej(x); }); });
const save = (req, res) => { if (res.ok) { const c = res.clone(); caches.open(V).then((ca) => ca.put(req, c)); } return res; };

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;
  // Hashed bundles, images and fonts never change: serve from the phone first.
  if (url.pathname.startsWith('/_next/static/') || /\.(png|jpe?g|svg|ico|webp|woff2?|css|js)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res))));
    return;
  }
  // Pages: network first so new deploys show up, but fall back fast to the saved copy on a slow or missing connection.
  e.respondWith(withTimeout(fetch(req), 3500).then((res) => save(req, res)).catch(() =>
    caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('/offline') : Response.error()))));
});
