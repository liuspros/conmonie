'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Icon from '@/components/Icon';

const Ctx = createContext({ verified: false, requireKyc: () => true, promptFirst() {} });
export const useKyc = () => useContext(Ctx);

// People can look around freely. KYC is only demanded when they try to join or create a group.
export function KycProvider({ children }) {
  const { profile } = useAuth(), r = useRouter(), path = usePathname(), [modal, setModal] = useState(null);
  const verified = !!(profile && profile.verified);
  useEffect(() => { setModal(null); }, [path]);
  const requireKyc = () => { if (verified) return true; setModal('need'); return false; };
  const promptFirst = () => { if (verified) return; try { if (localStorage.getItem('conmonie-kyc-prompted')) return; localStorage.setItem('conmonie-kyc-prompted', '1'); } catch {} setModal('first'); };
  const go = () => { setModal(null); r.push('/onboarding'); };
  return (
    <Ctx.Provider value={{ verified, requireKyc, promptFirst }}>
      {children}
      {modal && !verified && (
        <div role="dialog" aria-modal="true" aria-label="KYC verification" onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(10,10,12,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(400px, 100%)', background: '#fff', borderRadius: 28, padding: 24, display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center', alignItems: 'center' }}>
            <span className="ibadge g" style={{ width: 60, height: 60 }}><Icon n="shield" s={28} /></span>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>{modal === 'first' ? 'Verify your KYC now' : 'KYC verification required'}</h2>
            <p className="m" style={{ fontSize: 15, lineHeight: 1.5 }}>{modal === 'first' ? 'To join or create a group you need to verify your identity. It takes about 5 minutes. You can look around the app first.' : 'You must verify your KYC to join or create a group.'}</p>
            <button className="btn" onClick={go}>Verify now</button>
            <button className="m" style={{ background: 'none', textDecoration: 'underline', padding: 8 }} onClick={() => setModal(null)}>{modal === 'first' ? 'Later' : 'Not now'}</button>
          </div>
        </div>)}
    </Ctx.Provider>
  );
}
