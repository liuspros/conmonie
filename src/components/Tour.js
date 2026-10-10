'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

const PAD = 8;

// A spotlight walkthrough: dims the screen, highlights one element at a time and explains it.
// steps: [{ target?: 'data-tour value', title, body, noScroll? }]. A step without a target is a centred welcome card.
export default function Tour({ id, steps, enabled, onDone }) {
  const [open, setOpen] = useState(false), [i, setI] = useState(0), [box, setBox] = useState(null), nextRef = useRef(null), doneRef = useRef(onDone);
  doneRef.current = onDone;
  const key = 'conmonie-tour-' + id;
  const find = (s) => (s && s.target ? document.querySelector('[data-tour="' + s.target + '"]') : null);

  useEffect(() => {
    if (!enabled) return;
    let seen = false; try { seen = !!localStorage.getItem(key); } catch {}
    if (seen) doneRef.current && doneRef.current(); else setOpen(true);
  }, [enabled]);

  const finish = useCallback(() => { try { localStorage.setItem(key, '1'); } catch {} setOpen(false); doneRef.current && doneRef.current(); }, [key]);
  const measure = useCallback(() => {
    const s = steps[i]; if (!s) return;
    if (!s.target) return setBox({ none: true });
    const e = find(s); if (!e) return;
    const r = e.getBoundingClientRect(); setBox({ x: r.left, y: r.top, w: r.width, h: r.height });
  }, [i, steps]);

  useEffect(() => { // move to the step: skip it if its target is not on screen, else scroll to it and measure
    if (!open) return;
    const s = steps[i], e = find(s);
    if (s.target && !e) { if (i + 1 < steps.length) setI(i + 1); else finish(); return; }
    if (e && !s.noScroll) e.scrollIntoView({ block: 'center' });
    const t = setTimeout(measure, 80); return () => clearTimeout(t);
  }, [open, i]);
  useEffect(() => {
    if (!open) return;
    const f = () => measure(), k = (e) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('resize', f); window.addEventListener('scroll', f, true); window.addEventListener('keydown', k);
    return () => { window.removeEventListener('resize', f); window.removeEventListener('scroll', f, true); window.removeEventListener('keydown', k); };
  }, [open, measure, finish]);
  useEffect(() => { if (open && box && nextRef.current) nextRef.current.focus(); }, [open, i, !!box]);

  if (!open || !box) return null;
  const s = steps[i], last = i === steps.length - 1;
  let spot = null, pos = { top: '50%', transform: 'translate(-50%,-50%)' };
  if (!box.none) {
    const x = box.x - PAD, y = box.y - PAD, w = box.w + PAD * 2, h = Math.min(box.h + PAD * 2, window.innerHeight - 20);
    spot = <div className="spot" style={{ position: 'fixed', left: x, top: y, width: w, height: h, borderRadius: 20, boxShadow: '0 0 0 9999px rgba(10,10,12,.74)', border: '2px solid rgba(255,255,255,.9)', pointerEvents: 'none', zIndex: 101 }} />;
    pos = y + h + 230 < window.innerHeight ? { top: y + h + 14, transform: 'translateX(-50%)' } : { bottom: window.innerHeight - y + 14, transform: 'translateX(-50%)' };
  }
  return (
    <div role="dialog" aria-modal="true" aria-label="App guide" style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div style={{ position: 'absolute', inset: 0, background: box.none ? 'rgba(10,10,12,.74)' : 'transparent' }} />
      {spot}
      <div style={{ position: 'fixed', left: '50%', width: 'min(350px, calc(100% - 40px))', background: '#fff', color: '#0A0A0A', borderRadius: 22, padding: 18, boxShadow: '0 20px 50px rgba(0,0,0,.35)', zIndex: 102, display: 'flex', flexDirection: 'column', gap: 8, ...pos }}>
        <span className="m" style={{ fontSize: 12 }}>{i + 1} of {steps.length}</span>
        <b style={{ fontSize: 18 }}>{s.title}</b>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: '#3A3D41' }}>{s.body}</p>
        <div style={{ display: 'flex', gap: 6, margin: '4px 0' }} aria-hidden="true">{steps.map((_, n) => <span key={n} style={{ width: n === i ? 18 : 6, height: 6, borderRadius: 3, background: n === i ? '#0A0A0A' : '#C7CBD0' }} />)}</div>
        <div className="r">
          <button style={{ background: 'none', color: '#6B7076', fontSize: 14, padding: '10px 4px' }} onClick={finish}>Skip</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && <button className="btn2" style={{ width: 'auto', height: 40, padding: '0 16px', fontSize: 14 }} onClick={() => setI(i - 1)}>Back</button>}
            <button ref={nextRef} className="btn" style={{ width: 'auto', height: 40, padding: '0 22px', fontSize: 14 }} onClick={() => (last ? finish() : setI(i + 1))}>{last ? 'Done' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
