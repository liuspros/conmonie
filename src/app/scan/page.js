'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import jsQR from 'jsqr';
import { useRequireAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import Icon from '@/components/Icon';

const codeFrom = (t) => { const s = String(t).trim(), m = s.match(/\/join\/([A-Za-z0-9]{6,})/) || s.match(/^([a-f0-9]{8})$/i); return m ? m[1] : null; };
const decode = (src, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, 0, 0, w, h); return jsQR(x.getImageData(0, 0, w, h).data, w, h); };

export default function Scan() {
  useRequireAuth();
  const r = useRouter(), vid = useRef(null), [state, setState] = useState('starting'), [msg, setMsg] = useState(''), [manual, setManual] = useState('');
  const go = (t) => { const c = codeFrom(t); if (c) { r.push('/join/' + c); return true; } setMsg('That QR code is not a Conmonie group.'); return false; };

  useEffect(() => {
    let stream, timer, stop = false, last = 0;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 960 } }, audio: false });
        vid.current.srcObject = stream; await vid.current.play(); setState('ready');
        const loop = () => {
          if (stop) return;
          const v = vid.current;
          if (v.videoWidth) { const w = 480, h = Math.round((480 * v.videoHeight) / v.videoWidth), q = decode(v, w, h); if (q && q.data && Date.now() - last > 1500) { last = Date.now(); if (go(q.data)) { stop = true; return; } } }
          timer = setTimeout(loop, 140);
        };
        loop();
      } catch (e) { setState(e && e.name === 'NotAllowedError' ? 'blocked' : 'error'); }
    })();
    return () => { stop = true; clearTimeout(timer); stream && stream.getTracks().forEach((t) => t.stop()); };
  }, []);
  function onFile(e) {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const img = new Image(); img.onload = () => { const w = Math.min(img.width, 900), h = Math.round((w * img.height) / img.width), q = decode(img, w, h); if (q && q.data) go(q.data); else setMsg('We could not find a QR code in that picture.'); URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(f);
  }
  const corner = (s) => <span style={{ position: 'absolute', width: 36, height: 36, borderColor: '#C8F135', borderStyle: 'solid', borderWidth: 0, ...s }} />;
  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <Link href="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: 8, alignItems: 'center' }}><Icon n="back" s={18} />Home</Link>
      <div><h1 style={{ fontSize: 28, fontWeight: 700 }}>Scan group QR</h1><p className="m" style={{ fontSize: 14 }}>Point the camera at a Conmonie group QR code.</p></div>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 28, overflow: 'hidden', background: '#0A0A0A' }}>
        <video ref={vid} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: state === 'ready' ? 'block' : 'none' }} />
        {state === 'ready' && <><div style={{ position: 'absolute', inset: 28 }}>{corner({ top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 16 })}{corner({ top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 16 })}{corner({ bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 16 })}{corner({ bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 16 })}</div></>}
        {state === 'starting' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Loader label="Starting camera..." /></div>}
        {(state === 'blocked' || state === 'error') && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: '#fff', fontSize: 14, lineHeight: 1.5 }}>{state === 'blocked' ? 'Camera access was blocked. Allow the camera for this site, or use the options below.' : 'The camera could not start. Use the options below.'}</div>}
      </div>
      {msg && <p role="alert" style={{ fontWeight: 600, textAlign: 'center' }}>{msg}</p>}
      <label className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><Icon n="image" />Choose a QR picture<input type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} /></label>
      <div style={{ display: 'flex', gap: 8 }}><input className="inp" placeholder="Or paste an invite link or code" value={manual} onChange={(e) => setManual(e.target.value)} /><button className="btn" style={{ width: 90 }} onClick={() => go(manual)}>Go</button></div>
    </main>
  );
}
