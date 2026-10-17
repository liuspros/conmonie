'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { unlockAudio, ring, stop, showLocalNotification } from '@/lib/alarm';
import Icon from '@/components/Icon';

const Ctx = createContext({ schedule() {}, cancel() {}, fire() {}, enabled: true, setEnabled() {} });
export const useAlarm = () => useContext(Ctx);
const KEY = 'conmonie-reminders', FIRED = 'conmonie-fired';
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Reminders are stored on the phone and armed while the app is open. When one goes off the sound loops for 10 seconds, a banner
// shows, and (if allowed) a notification that stays until tapped appears. A reminder missed by up to 3 hours rings when the app opens.
export function AlarmProvider({ children }) {
  const [live, setLive] = useState(null), [enabled, setEnabledState] = useState(true), enabledRef = useRef(true), timers = useRef({});
  useEffect(() => { try { const on = localStorage.getItem('conmonie-alarm') !== 'off'; setEnabledState(on); enabledRef.current = on; } catch {} }, []);
  const setEnabled = (on) => { setEnabledState(on); enabledRef.current = on; try { localStorage.setItem('conmonie-alarm', on ? 'on' : 'off'); } catch {} if (!on) stop(); };

  const fire = useCallback(async (rem) => {
    write(FIRED, [...read(FIRED), rem.id].slice(-200));
    setLive(rem);
    if (enabledRef.current) await ring(10000, () => setLive((c) => (c === rem ? null : c)));
    else setTimeout(() => setLive((c) => (c === rem ? null : c)), 10000);
    showLocalNotification(rem);
  }, []);
  const remove = (id) => write(KEY, read(KEY).filter((r) => r.id !== id));
  const arm = useCallback((rem) => {
    clearTimeout(timers.current[rem.id]);
    const wait = rem.at - Date.now();
    if (wait > 2147000000) return;
    if (wait <= 0) { if (-wait < 3 * 3600e3) fire(rem); remove(rem.id); return; }
    timers.current[rem.id] = setTimeout(() => { fire(rem); remove(rem.id); }, wait);
  }, [fire]);
  const schedule = useCallback((rem) => {
    if (read(FIRED).includes(rem.id)) return;
    write(KEY, [...read(KEY).filter((r) => r.id !== rem.id), rem]); arm(rem);
  }, [arm]);
  const cancel = useCallback((id) => { clearTimeout(timers.current[id]); remove(id); }, []);

  useEffect(() => { read(KEY).forEach(arm); }, [arm]);
  useEffect(() => { // unlock sound on the first tap anywhere
    const f = () => unlockAudio(), evs = ['pointerdown', 'keydown', 'touchend'];
    evs.forEach((e) => window.addEventListener(e, f, { once: true, passive: true }));
    return () => evs.forEach((e) => window.removeEventListener(e, f));
  }, []);
  useEffect(() => { // an alarm pushed from the server while the app is open
    if (!('serviceWorker' in navigator)) return;
    const h = (e) => { if (e.data && e.data.type === 'alarm') fire({ id: 'push-' + Date.now(), title: e.data.title, body: e.data.body, link: e.data.link }); };
    navigator.serviceWorker.addEventListener('message', h); return () => navigator.serviceWorker.removeEventListener('message', h);
  }, [fire]);

  return (
    <Ctx.Provider value={{ schedule, cancel, fire, enabled, setEnabled }}>
      {children}
      {live && (
        <div role="alertdialog" aria-label="Reminder" style={{ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 10px)', left: 12, right: 12, zIndex: 110, display: 'flex', justifyContent: 'center' }}>
          <div className="dark" style={{ width: '100%', maxWidth: 400, display: 'flex', gap: 12, alignItems: 'center', border: '2px solid #C8F135' }}>
            <span className="ibadge k"><Icon n="bell" /></span>
            <div style={{ flex: 1, minWidth: 0 }}><b>{live.title}</b><div style={{ fontSize: 13, color: '#D3D6DA' }}>{live.body}</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {live.link && <Link href={live.link} onClick={() => { stop(); setLive(null); }} className="pill g" style={{ textDecoration: 'none', justifyContent: 'center' }}>Open</Link>}
              <button className="pill" onClick={() => { stop(); setLive(null); }}>Stop</button>
            </div>
          </div>
        </div>)}
    </Ctx.Provider>
  );
}
