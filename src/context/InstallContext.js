'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext({});
export const useInstall = () => useContext(Ctx);
export const isStandalone = () => { try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch { return false; } };

// Chrome and Android fire an install prompt we can trigger from our own button. iPhones have no such prompt, so we show steps.
export function InstallProvider({ children }) {
  const [ev, setEv] = useState(null), [installed, setInstalled] = useState(false), [ios, setIos] = useState(false);
  useEffect(() => {
    setInstalled(isStandalone());
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const bip = (e) => { e.preventDefault(); setEv(e); };
    const done = () => { setInstalled(true); setEv(null); };
    window.addEventListener('beforeinstallprompt', bip); window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', bip); window.removeEventListener('appinstalled', done); };
  }, []);
  const install = async () => { if (!ev) return false; ev.prompt(); const c = await ev.userChoice; setEv(null); return c.outcome === 'accepted'; };
  return <Ctx.Provider value={{ installed, canPrompt: !!ev, ios, install }}>{children}</Ctx.Provider>;
}
