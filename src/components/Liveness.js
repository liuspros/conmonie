'use client';
import { useEffect, useRef, useState } from 'react';
import { loadFace, detect, earOf, yawRatio } from '@/lib/face';

const STEPS = ['Look straight at the camera', 'Blink twice', 'Slowly turn your head to one side', 'Now turn to the other side'];
const snap = (v) => { const c = document.createElement('canvas'), w = 320, h = Math.round((320 * v.videoHeight) / v.videoWidth); c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h); return c.toDataURL('image/jpeg', 0.7); };

// Active liveness: centre, blink twice, turn one way, then the other. Runs entirely on the phone.
export default function Liveness({ onDone }) {
  const vid = useRef(null), S = useRef({ stage: 0, stable: 0, blinks: 0, closed: false, side: 0, desc: null, shot: null, last: null, stop: false });
  const [step, setStep] = useState(-1), [err, setErr] = useState(''), [slow, setSlow] = useState(false);
  useEffect(() => {
    let stream, timer, late;
    const go = (n) => setStep(n);
    function tick(det) {
      const s = S.current, p = det.landmarks.positions, yaw = yawRatio(p), ear = earOf(p);
      s.last = Array.from(det.descriptor);
      if (s.stage === 0) {
        s.stable = yaw > 0.4 && yaw < 0.6 ? s.stable + 1 : 0;
        if (s.stable >= 6) { s.desc = s.last; s.shot = snap(vid.current); s.stage = 1; go(1); }
      } else if (s.stage === 1) {
        if (ear < 0.2) s.closed = true; else if (ear > 0.26 && s.closed) { s.closed = false; s.blinks++; }
        if (s.blinks >= 2) { s.stage = 2; go(2); }
      } else if (s.stage === 2) {
        if (yaw < 0.36 || yaw > 0.64) { s.side = yaw < 0.5 ? -1 : 1; s.stage = 3; go(3); }
      } else if (s.stage === 3 && ((s.side === -1 && yaw > 0.64) || (s.side === 1 && yaw < 0.36))) {
        s.stop = true; onDone({ descriptor: s.desc, selfie: s.shot, liveness: true });
      }
    }
    (async () => {
      try {
        const f = await loadFace();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
        vid.current.srcObject = stream; await vid.current.play(); go(0);
        late = setTimeout(() => setSlow(true), 30000);
        const loop = async () => { if (S.current.stop) return; const det = await detect(f, vid.current, 320).catch(() => null); if (det) tick(det); timer = setTimeout(loop, 90); };
        loop();
      } catch (e) { setErr(e && e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.' : 'Could not start the camera or load the face tools. Check your connection and try again.'); }
    })();
    return () => { S.current.stop = true; clearTimeout(timer); clearTimeout(late); stream && stream.getTracks().forEach((t) => t.stop()); };
  }, []);
  // Fallback if the challenges will not complete: send the best frame for a person to review instead.
  const manual = () => { const s = S.current; s.stop = true; onDone({ descriptor: s.desc || s.last, selfie: s.shot || (vid.current ? snap(vid.current) : null), liveness: false }); };
  if (err) return <div className="glass"><p role="alert" style={{ fontWeight: 600 }}>{err}</p></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 280, height: 280, borderRadius: '50%', overflow: 'hidden', border: '4px solid #0A0A0A', background: '#E3E5E8' }}>
        <video ref={vid} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
      </div>
      <b style={{ fontSize: 18, textAlign: 'center' }} role="status">{step < 0 ? 'Starting camera...' : STEPS[step]}</b>
      <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">{STEPS.map((_, n) => <span key={n} style={{ width: n === step ? 18 : 6, height: 6, borderRadius: 3, background: n <= step ? '#0A0A0A' : '#C7CBD0' }} />)}</div>
      {slow && <button className="m" style={{ background: 'none', textDecoration: 'underline' }} onClick={manual}>Having trouble? Send for manual review</button>}
    </div>
  );
}
