'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Icon from '@/components/Icon';
import { blobOf, shareOrSave, save } from '@/lib/receipt';
import { haptic } from '@/lib/utils';

// A printable card: group name on top, the QR in the middle. Works with Conmonie's scanner and any other QR scanner.
async function cardBlob(url, name) {
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 640, errorCorrectionLevel: 'M' });
  const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = qr; });
  const cv = document.createElement('canvas'); cv.width = 800; cv.height = 1000;
  const c = cv.getContext('2d'), F = '-apple-system, system-ui, sans-serif';
  c.fillStyle = '#fff'; c.fillRect(0, 0, 800, 1000); c.textAlign = 'center';
  c.fillStyle = '#0A0A0A'; c.font = `700 46px ${F}`; c.fillText(name.length > 26 ? name.slice(0, 24) + '...' : name, 400, 100);
  c.fillStyle = '#6B7076'; c.font = `400 26px ${F}`; c.fillText('Scan to join this Ajo on Conmonie', 400, 150);
  c.drawImage(img, 80, 200, 640, 640);
  c.fillStyle = '#C8F135'; c.fillRect(300, 880, 200, 8); c.fillStyle = '#0A0A0A'; c.font = `700 32px ${F}`; c.fillText('Conmonie', 400, 945);
  return blobOf(cv);
}
export default function QrSheet({ url, name, onClose }) {
  const [src, setSrc] = useState(''), [note, setNote] = useState('');
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 560, errorCorrectionLevel: 'M' }).then(setSrc); }, [url]);
  const slug = name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const act = (fn) => async () => { haptic(); const b = await cardBlob(url, name); setNote(await fn(b)); };
  return (
    <div role="dialog" aria-modal="true" aria-label="Group QR code" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(10,10,12,.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(430px, 100%)', background: '#fff', borderRadius: '28px 28px 0 0', padding: '22px 22px calc(env(safe-area-inset-bottom) + 22px)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div className="r" style={{ width: '100%' }}><b style={{ fontSize: 18 }}>{name}</b><button aria-label="Close" onClick={onClose} style={{ background: 'none' }}><Icon n="x" /></button></div>
        {src ? <img src={src} alt={'QR code to join ' + name} width="260" height="260" style={{ borderRadius: 16, border: '1px solid #E6E8EB' }} /> : <div className="sk" style={{ width: 260, height: 260 }} />}
        <p className="m" style={{ textAlign: 'center', fontSize: 13, lineHeight: 1.5 }}>Scan with the Conmonie scanner or any phone camera. New members still need to be verified before they can join.</p>
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button className="btn2" style={{ height: 46 }} onClick={act((b) => save(b, 'conmonie-' + slug + '-qr.png'))}>Download</button>
          <button className="btn" style={{ height: 46 }} onClick={act((b) => shareOrSave(b, 'conmonie-' + slug + '-qr.png', name))}>Share</button>
        </div>
        {note === 'saved' && <span role="status" className="m">Saved to your downloads.</span>}
      </div>
    </div>
  );
}
