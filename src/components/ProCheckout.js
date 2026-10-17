'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PRO_PRICE } from '@/lib/plans';
import { haptic } from '@/lib/utils';
import Loader from '@/components/Loader';
import OpayButton from '@/components/OpayButton';

// Our own payment desk (no Paystack popup). The bank-transfer card shows a dedicated account number from Paystack's Charge API;
// "other ways to pay" opens Paystack's hosted page (card-free: bank transfer and Pay with Bank, which includes OPay).
export default function ProCheckout({ onClose, onPaid }) {
  const [step, setStep] = useState('loading'), [tx, setTx] = useState(null), [hosted, setHosted] = useState(null), [err, setErr] = useState(''), [left, setLeft] = useState(null), [copied, setCopied] = useState(false);
  useEffect(() => {
    let off = false;
    (async () => {
      const [t, h] = await Promise.allSettled([api('/api/billing/transfer', {}), api('/api/billing/init', { plan: 'pro_month' })]);
      if (off) return;
      const acct = t.status === 'fulfilled' && t.value.account ? t.value.account : null, hurl = h.status === 'fulfilled' && h.value.data ? h.value.data : null;
      setTx(acct); setHosted(hurl);
      if (!acct && !hurl) { setErr('Payments are not available right now. Please try again later.'); setStep('error'); } else setStep('ready');
    })();
    return () => { off = true; };
  }, []);
  useEffect(() => { // count down the transfer window
    if (!tx || !tx.expiresAt) return;
    const t = setInterval(() => setLeft(Math.max(0, Math.round((new Date(tx.expiresAt).getTime() - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [tx]);
  useEffect(() => { // the webhook activates Pro; we just watch for it
    if (step !== 'ready') return;
    const t = setInterval(async () => { try { const j = await api('/api/billing/status'); if (j.isPro) { setStep('paid'); onPaid && onPaid(j); } } catch {} }, 4000);
    return () => clearInterval(t);
  }, [step]);
  const copy = async () => { try { await navigator.clipboard.writeText(tx.number); } catch {} haptic(); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const mmss = left == null ? '' : Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60" role="dialog" aria-modal="true" aria-label="Pay for Conmonie Pro" onClick={onClose}>
      <div className="w-full max-w-[430px] rounded-t-[28px] bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-gray-900">Upgrade to Pro</h2><button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-gray-500">&times;</button></div>
        {step === 'loading' && <Loader label="Preparing your payment desk..." />}
        {step === 'error' && <p role="alert" className="py-6 text-center font-semibold text-gray-700">{err}</p>}
        {step === 'paid' && <div className="py-6 text-center"><img src="/3d/badge.png" alt="" width="130" height="130" className="mx-auto" /><p className="mt-2 text-xl font-bold">You are now on Conmonie Pro</p><button className="btn mt-4" onClick={onClose}>Done</button></div>}
        {step === 'ready' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-gray-50 p-4 text-center"><p className="text-sm text-gray-500">Amount to pay</p><p className="text-3xl font-bold text-gray-900">&#8358;{PRO_PRICE.toLocaleString('en-NG')}</p><p className="text-xs text-gray-500">30 days of Pro</p></div>
            {tx && (
              <div className="rounded-2xl bg-gray-900 p-4 text-white">
                <p className="text-xs uppercase tracking-wide text-gray-400">Pay by bank transfer</p>
                <div className="mt-2 flex items-center justify-between gap-3"><span className="text-3xl font-bold tracking-widest">{tx.number}</span><button onClick={copy} className="rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/25">{copied ? 'Copied' : 'Copy'}</button></div>
                <p className="mt-1 text-sm text-gray-300">{tx.bank}{tx.name ? ' \u00B7 ' + tx.name : ''}</p>
                {mmss && <p className="mt-2 text-xs text-amber-300">This account is valid for {mmss}</p>}
                <div className="mt-3"><OpayButton account={tx.number} label="Pay with OPay" /></div>
                <p className="mt-2 text-xs text-gray-400">Send exactly the amount above. Pro switches on by itself within a minute of payment.</p>
              </div>)}
            {hosted && <button className="btn2" onClick={() => { window.location.href = hosted.authorization_url; }}>{tx ? 'Other ways to pay (OPay, bank)' : 'Continue to secure payment (OPay, bank)'}</button>}
            <p className="text-center text-xs text-gray-500">Waiting for your payment...</p>
          </div>)}
      </div>
    </div>
  );
}
