'use client';
import { useState } from 'react';
import { BANKS } from '@/lib/banks';
import Icon from '@/components/Icon';

// A bottom-sheet bank picker with search. (A native <select> overlapped its icon and looked different on every phone.)
export default function BankSelect({ value, onChange, dark, required }) {
  const [open, setOpen] = useState(false), [q, setQ] = useState('');
  const list = BANKS.filter((b) => b.toLowerCase().includes(q.trim().toLowerCase()));
  const muted = dark ? '#B8BCC2' : '#6B7076';
  const skin = dark ? { background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.14)', color: value ? '#fff' : muted } : { background: 'rgba(255,255,255,.85)', border: '1px solid #D3D6DA', color: value ? '#0A0A0A' : muted };
  const pick = (b) => { onChange(b); setOpen(false); setQ(''); };
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={'Bank: ' + (value || 'not selected')} style={{ ...skin, display: 'flex', alignItems: 'center', gap: 12, width: '100%', height: 50, borderRadius: 16, padding: '0 14px', textAlign: 'left', fontSize: 16 }}>
        <Icon n="bank" s={20} c={muted} /><span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || 'Select bank'}</span><Icon n="down" s={18} c={muted} />
      </button>
      {required && <input tabIndex={-1} aria-hidden="true" required value={value || ''} onChange={() => {}} style={{ position: 'absolute', left: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Choose your bank" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(10,10,12,.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(430px, 100%)', maxHeight: '78dvh', background: '#fff', color: '#0A0A0A', borderRadius: '28px 28px 0 0', padding: '20px 20px calc(env(safe-area-inset-bottom) + 16px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="r"><b style={{ fontSize: 18 }}>Choose your bank</b><button type="button" aria-label="Close" onClick={() => setOpen(false)} style={{ background: 'none' }}><Icon n="x" /></button></div>
            <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 14, top: 15, color: '#6B7076' }}><Icon n="search" s={20} /></span><input className="inp" style={{ paddingLeft: 44 }} placeholder="Search banks" value={q} onChange={(e) => setQ(e.target.value)} autoFocus /></div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {list.map((b) => <button type="button" key={b} onClick={() => pick(b)} className="rowline" style={{ background: 'none', textAlign: 'left', fontSize: 16, width: '100%' }}><span style={{ flex: 1 }}>{b}</span>{b === value && <Icon n="check" s={18} />}</button>)}
              {!list.length && <p className="m" style={{ padding: '12px 0' }}>No bank found. Try another spelling.</p>}
            </div>
          </div>
        </div>)}
    </div>
  );
}
