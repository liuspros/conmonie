'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

// Admin tool: Pro admins can ping everyone who still owes this round. Free admins see it locked.
export default function PingTools({ gid, isPro }) {
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  async function ping() {
    setBusy(true); setMsg('');
    try { const j = await api('/api/ping', { gid }); setMsg(j.count ? 'Pinged ' + j.count + ' member' + (j.count > 1 ? 's' : '') + '.' : 'Everyone has paid this round.'); }
    catch (e) { setMsg(e.data?.error || 'Could not send the ping. Check your connection.'); }
    setBusy(false);
  }
  if (isPro) return (
    <div className="space-y-2">
      <button onClick={ping} disabled={busy} className="w-full rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white shadow hover:bg-red-700 disabled:opacity-60">{busy ? 'Sending...' : '🚨 Ping All Late Payers'}</button>
      {msg && <p role="status" className="text-sm text-gray-600">{msg}</p>}
    </div>);
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center">
      <p className="text-sm leading-relaxed text-gray-600">🔒 Ping Trigger Locked: Upgrade to Conmonie Pro to instantly broadcast high-priority reminder alerts to all pending payouts.</p>
      <Link href="/pro" className="mt-3 inline-block rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-white hover:bg-amber-600">Upgrade to Pro</Link>
    </div>);
}
