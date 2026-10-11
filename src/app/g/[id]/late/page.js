'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { naira } from '@/lib/utils';
import Skeleton from '@/components/Skeleton';

// First stop for anyone paying after the due time. The pay page and the server both refuse them until this fee is paid.
export default function Late() {
  const { id } = useParams(), r = useRouter(), { user } = useRequireAuth();
  const [info, setInfo] = useState(), [busy, setBusy] = useState(''), [err, setErr] = useState('');
  useEffect(() => {
    if (!user) return;
    (async () => {
      const ref = new URLSearchParams(location.search).get('reference');
      try {
        if (ref) { setBusy('Confirming your payment...'); await api('/api/paystack/verify', { reference: ref }); }
        const j = await api('/api/pay/info?gid=' + id);
        if (j.status === 'ok') return r.replace('/g/' + id + '/pay');
        setInfo(j);
      } catch (e) { setErr(ref ? 'We could not confirm your payment yet. If you were charged, wait a minute and refresh this page. It is credited automatically.' : 'Could not load this page. Check your connection.'); }
      setBusy('');
    })();
  }, [user, id]);
  async function pay() {
    setBusy('Opening Paystack...'); setErr('');
    try { const j = await api('/api/paystack/init', { gid: id }); if (j.status === 'ok') return r.replace('/g/' + id + '/pay'); location.href = j.url; }
    catch { setErr('Could not start the payment. Try again.'); setBusy(''); }
  }
  return (
    <main className="app">
      <Link href={'/g/' + id} style={{ color: 'inherit', textDecoration: 'none' }}>&lsaquo; Back to chat</Link>
      {!info && !err && <Skeleton n={3} h={110} />}
      {info && <>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>This payment is late</h1>
          <p className="m" style={{ fontSize: 15, lineHeight: 1.5 }}>It was due by {info.dueTime}. Before you pay your admin, a small late fee applies.</p>
        </div>
        <div className="dark" style={{ textAlign: 'center' }}><div style={{ fontSize: 13, color: '#B8BCC2' }}>Late fee</div><div style={{ fontSize: 48, fontWeight: 700 }}>{naira(info.platformFee)}</div></div>
        <div className="glass m" style={{ fontSize: 14, lineHeight: 1.6 }}>This fee goes to Conmonie to keep the service running. It is not paid to your admin. After it is confirmed, you will see the account to pay your contribution{info.lateFee ? ' (your admin also adds ' + naira(info.lateFee) + ' for late payment)' : ''}.</div>
        <button className="btn" disabled={!!busy} onClick={pay}>{busy || 'Pay ' + naira(info.platformFee) + ' with Paystack'}</button>
      </>}
      {busy && !info && <p role="status" className="m" style={{ textAlign: 'center' }}>{busy}</p>}
      {err && <p role="alert" style={{ fontWeight: 600, textAlign: 'center' }}>{err}</p>}
    </main>
  );
}
