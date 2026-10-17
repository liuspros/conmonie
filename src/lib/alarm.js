// Reminder alarm: a short sound looped for exactly 10 seconds (Web Audio schedules the stop sample-accurately), then silence.
// The sound file is cached by the service worker, so it works offline. Browsers only allow sound after a tap, so unlockAudio()
// runs on the first tap anywhere (and from the "Test alarm" button).
let ctx = null, buf = null, loading = null, src = null, endCb = null;
const FILE = '/sounds/alarm.mp3';
const ac = () => { if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); } return ctx; };
function load() {
  if (buf) return Promise.resolve(buf);
  if (!loading) loading = fetch(FILE).then((r) => r.arrayBuffer()).then((a) => new Promise((res, rej) => ac().decodeAudioData(a, res, rej))).then((b) => (buf = b)).catch(() => { loading = null; return null; });
  return loading;
}
export async function unlockAudio() {
  const c = ac(); if (!c) return false;
  try { await c.resume(); const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); load(); return c.state === 'running'; } catch { return false; }
}
export const isRinging = () => !!src;
export function stop() {
  if (src) { try { src.onended = null; src.stop(); } catch {} src = null; }
  try { navigator.vibrate && navigator.vibrate(0); } catch {}
  const f = endCb; endCb = null; f && f();
}
export async function ring(ms = 10000, onEnd) {
  stop(); const c = ac(); if (!c) return false;
  try { await c.resume(); } catch {}
  const b = await load(); if (!b) return false;
  const s = c.createBufferSource(); s.buffer = b; s.loop = true; s.connect(c.destination);
  src = s; endCb = onEnd || null;
  s.onended = () => { if (src === s) { src = null; const f = endCb; endCb = null; f && f(); } };
  s.start(); s.stop(c.currentTime + ms / 1000);
  try { navigator.vibrate && navigator.vibrate(Array.from({ length: Math.ceil(ms / 800) }, () => [500, 300]).flat()); } catch {}
  return true;
}
// A banner that stays on screen until it is dismissed (requireInteraction). Needs notification permission.
export async function showLocalNotification({ title, body, link }) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'conmonie-reminder', renotify: true, requireInteraction: true, vibrate: [400, 200, 400], data: { link: link || '/' } });
    return true;
  } catch { return false; }
}
