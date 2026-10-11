'use client';
import { useEffect, useRef, useState } from 'react';
import { loadFace, detect, earOf, yawRatio } from '@/lib/face';
import Loader from '@/components/Loader';

const STEPS = ['Look straight at the camera', 'Blink twice, slowly', 'Turn your head a little to one side', 'Now turn to the other side'];
const HINTS = ['Hold still, face the camera and move to better light.', 'Close your eyes firmly for a moment, twice.', 'Turn your head a bit more, slowly.', 'Turn the other way, a bit more.'];
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const snap = (v) => { const c = document.createElement('canvas'), w = 320, h = Math.round((320 * v.videoHeight) / v.videoWidth); c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h); return c.toDataURL('image/jpeg', 0.7); };

// Active liveness check on the phone. Thresholds are relative to the person's own face (eye openness and head position when
// looking straight), so it works for different faces, glasses and cameras.
export default function Liveness({ onDone }) {
  const vid = useRef(null), doneRef = useRef(onDone);
  doneRef.current = onDone;
  const [step, setStep] = useState(-1), [loadingTools, setLoadingTools] = useState(true), [face, setFace] = useState(false), [hint, setHint] = useState(''), [err, setErr] = useState(''), [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const s = { stage: 0, base: [], yaw0: 0.5, ear0: 0.28, blinks: 0, wasClosed: false, side: 0, desc: null, shot: null, stop: false, miss: 0, errs: 0, since: Date.now() };
    let stream, timer;
    const next = (n) => { s.stage = n; s.since = Date.now(); setStep(n); setHint(''); };
    function tick(det) {
      const p = det.landmarks.positions, yaw = yawRatio(p), ear = earOf(p);
      if (s.stage === 0) {
        if (Math.abs(yaw - 0.5) < 0.2) s.base.push({ yaw, ear, d: det.descriptor }); else s.base = [];
        if (s.base.length >= 8) { s.yaw0 = median(s.base.map((b) => b.yaw)); s.ear0 = Math.max(0.18, median(s.base.map((b) => b.ear))); s.desc = Array.from(s.base[s.base.length - 1].d); s.shot = snap(vid.current); next(1); }
      } else if (s.stage === 1) {
        if (ear < s.ear0 * 0.75) s.wasClosed = true; else if (ear > s.ear0 * 0.9 && s.wasClosed) { s.wasClosed = false; s.blinks++; }
        if (s.blinks >= 2) next(2);
      } else if (s.stage === 2) {
        if (Math.abs(yaw - s.yaw0) > 0.1) { s.side = yaw > s.yaw0 ? 1 : -1; next(3); }
      } else if (s.stage === 3 && (yaw - s.yaw0) * s.side < -0.1) {
        s.stop = true; setStep(4); doneRef.current({ descriptor: s.desc, selfie: s.shot, liveness: true });
      }
    }
    (async () => {
      try {
        const f = await loadFace(); setLoadingTools(false);
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
        vid.current.srcObject = stream; await vid.current.play(); setStep(0);
        const loop = async () => {
          if (s.stop) return;
          try {
            const det = await detect(f, vid.current, 320); s.errs = 0;
            if (det) { s.miss = 0; setFace(true); tick(det); } else if (++s.miss > 12) { setFace(false); setHint('We cannot see your face. Hold the phone at eye level, in good light, and move a little closer.'); }
            if (det && Date.now() - s.since > 9000 && s.stage < 4) setHint(HINTS[s.stage]);
          } catch { if (++s.errs > 8) { s.stop = true; setErr('The face tools stopped working on this phone. Close other apps and try again.'); return; } }
          timer = setTimeout(loop, 90);
        };
        loop();
      } catch (e) { setLoadingTools(false); setErr(e && e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.' : 'Could not start the camera or load the face tools. Check your connection and try again.'); }
    })();
    return () => { s.stop = true; clearTimeout(timer); stream && stream.getTracks().forEach((t) => t.stop()); };
  }, [attempt]);

  if (err) return <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><p role="alert" style={{ fontWeight: 600 }}>{err}</p><button className="btn" onClick={() => { setErr(''); setStep(-1); setLoadingTools(true); setAttempt((n) => n + 1); }}>Try again</button></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {loadingTools && <Loader label="Loading face tools (about 7 MB the first time)..." />}
      <div style={{ display: loadingTools ? 'none' : 'block', width: 280, height: 280, borderRadius: '50%', overflow: 'hidden', border: '5px solid ' + (face ? '#C8F135' : '#C7CBD0'), background: '#E3E5E8', transition: 'border-color .2s' }}>
        <video ref={vid} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
      </div>
      {!loadingTools && <>
        <b style={{ fontSize: 18, textAlign: 'center' }} role="status">{step < 0 ? 'Starting camera...' : step >= 4 ? 'Done' : STEPS[step]}</b>
        <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">{STEPS.map((_, n) => <span key={n} style={{ width: n === step ? 20 : 8, height: 8, borderRadius: 4, background: n <= step ? '#0A0A0A' : '#C7CBD0' }} />)}</div>
        <span className="st" style={{ background: face ? '#E3F6D0' : '#ECEDEF', color: face ? '#2C7A1F' : '#6B7076' }}>{face ? 'Face detected' : 'Looking for your face'}</span>
        {hint && <p className="m" role="status" style={{ textAlign: 'center', fontSize: 14, lineHeight: 1.5, maxWidth: 300 }}>{hint}</p>}
      </>}
    </div>
  );
}
