'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isStandalone } from '@/context/InstallContext';
import Loader from '@/components/Loader';
import Icon from '@/components/Icon';

const TRIGGER = 72, MAX = 120;
// An installed app has no browser reload button, so dragging down from the top reloads the page.
export default function PullToRefresh() {
  const p = usePathname(), off = p.startsWith('/onboarding') || p.startsWith('/scan');
  const [pull, setPull] = useState(0), [busy, setBusy] = useState(false), [drag, setDrag] = useState(false), busyRef = useRef(false);
  useEffect(() => {
    if (off || !isStandalone()) return;
    const s = { y0: null, d: 0 };
    document.documentElement.style.overscrollBehaviorY = 'contain';
    const start = (e) => { s.y0 = null; if (busyRef.current || window.scrollY > 0 || e.touches.length !== 1 || (e.target.closest && e.target.closest('[role=dialog],[data-noptr],input,textarea,select'))) return; s.y0 = e.touches[0].clientY; s.d = 0; };
    const move = (e) => {
      if (s.y0 == null || busyRef.current) return;
      const d = e.touches[0].clientY - s.y0;
      if (d > 8 && window.scrollY <= 0) { s.d = d; setDrag(true); setPull(Math.min(MAX, d * 0.55)); if (e.cancelable) e.preventDefault(); } else { s.d = 0; setPull(0); }
    };
    const end = () => {
      if (s.y0 == null) return; s.y0 = null; setDrag(false);
      if (s.d * 0.55 >= TRIGGER) { busyRef.current = true; setBusy(true); setPull(TRIGGER); setTimeout(() => location.reload(), 700); } else setPull(0);
    };
    window.addEventListener('touchstart', start, { passive: true }); window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
    return () => { document.documentElement.style.overscrollBehaviorY = ''; window.removeEventListener('touchstart', start); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end); window.removeEventListener('touchcancel', end); };
  }, [off]);
  if (!pull && !busy) return null;
  return (
    <div aria-hidden="true" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 90, display: 'flex', justifyContent: 'center', pointerEvents: 'none', paddingTop: 'env(safe-area-inset-top)', transform: 'translateY(' + (pull - 52) + 'px)', transition: drag ? 'none' : 'transform .25s ease', opacity: Math.min(1, pull / 40) }}>
      <span className="ptr">{busy ? <Loader size={30} /> : <span style={{ display: 'flex', transform: 'rotate(' + (pull >= TRIGGER ? 180 : (pull / TRIGGER) * 180) + 'deg)' }}><Icon n="down" s={22} /></span>}</span>
    </div>
  );
}
