'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { PRO_PRICE, proActive, proUntil } from '@/lib/plans';
import ProCheckout from '@/components/ProCheckout';
import TabBar from '@/components/TabBar';
import Icon from '@/components/Icon';

const Tick = () => <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-lime-200 text-lime-900"><Icon n="check" s={12} /></span>;
export default function ProPage() {
  const { user, profile } = useRequireAuth(), [checkout, setCheckout] = useState(false), [note, setNote] = useState('');
  const pro = proActive(profile), until = proUntil(profile);
  useEffect(() => { // back from Paystack's hosted page
    if (!user) return;
    const ref = new URLSearchParams(window.location.search).get('reference') || new URLSearchParams(window.location.search).get('trxref');
    if (ref) { setNote('Confirming your payment...'); api('/api/billing/verify', { reference: ref }).then(() => setNote('Payment confirmed. Welcome to Pro.')).catch(() => setNote('We could not confirm that payment yet. If you were charged, it will activate automatically within a few minutes.')); }
  }, [user]);
  return (
    <main className="app" style={{ paddingBottom: 130 }}>
      <Link href="/me" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: 8, alignItems: 'center' }}><Icon n="back" s={18} />Me</Link>
      <div><h1 className="text-2xl font-bold">Conmonie plans</h1><p className="text-sm text-gray-500">Run bigger groups and nudge late payers with one tap.</p></div>
      {note && <p role="status" className="rounded-2xl bg-lime-100 p-3 text-sm font-semibold text-lime-900">{note}</p>}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Conmonie Free</h2>{!pro && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">Current tier</span>}</div>
        <p className="mt-1 text-2xl font-bold">&#8358;0</p>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">{['Max 5 members per created group', 'Max 10 total group joins', 'Manual chat-based follow-ups'].map((t) => <li key={t} className="flex gap-2"><Tick />{t}</li>)}</ul>
        <button disabled className="mt-4 w-full rounded-2xl bg-gray-100 px-4 py-3 font-semibold text-gray-400">{pro ? 'Free plan' : 'Current Active Tier'}</button>
      </div>
      <div className="rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-400 p-[2px] shadow-lg">
        <div className="rounded-[22px] bg-white p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Conmonie Pro</h2><span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">&#8358;{PRO_PRICE.toLocaleString('en-NG')} / month</span></div>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">{['Unlimited created group members', 'Unlimited community group joins', '🚨 Ping Trigger button unlocked', 'Priority server queues'].map((t) => <li key={t} className="flex gap-2"><Tick />{t}</li>)}</ul>
          {pro && <p className="mt-3 text-sm font-semibold text-indigo-700">Active{until ? ' until ' + new Date(until).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</p>}
          <button onClick={() => setCheckout(true)} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white shadow hover:from-indigo-700 hover:to-violet-700">{pro ? 'Extend by 30 days' : 'Upgrade to Pro'}</button>
        </div>
      </div>
      {checkout && <ProCheckout onClose={() => setCheckout(false)} onPaid={() => setNote('Payment confirmed. Welcome to Pro.')} />}
      <TabBar />
    </main>
  );
}
