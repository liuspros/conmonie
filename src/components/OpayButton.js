'use client';
import { useState } from 'react';
import { payWithOpay } from '@/lib/opay';
import { haptic } from '@/lib/utils';
import Icon from '@/components/Icon';

export default function OpayButton({ account, label = 'Pay with OPay' }) {
  const [msg, setMsg] = useState('');
  async function go() {
    haptic(); const r = await payWithOpay(account);
    setMsg(r.platform === 'desktop' ? (r.copied ? 'Account number copied. Open OPay on your phone and paste it.' : 'Copy the account number and open OPay on your phone.') : r.copied ? 'Account number copied. If OPay asks, paste it in Transfer.' : 'Opening OPay. Type the account number in Transfer.');
  }
  if (!account) return null;
  return (
    <div>
      <button type="button" className="btn" onClick={go} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon n="forward" s={18} />{label}</button>
      {msg && <p role="status" className="m" style={{ fontSize: 12, textAlign: 'center', marginTop: 6 }}>{msg}</p>}
    </div>
  );
}
