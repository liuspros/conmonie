'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { naira, haptic, compressImage, sha256 } from '@/lib/utils';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';

export default function Pay() {
  const { id } = useParams(), r = useRouter(), { user } = useRequireAuth();
  const [info, setInfo] = useState(), [loadErr, setLoadErr] = useState(''), [count, setCount] = useState(1), [rec, setRec] = useState([]), [copied, setCopied] = useState(false), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [err, setErr] = useState('');
  useEffect(() => {
    if (!user) return;
    api('/api/pay/info?gid=' + id).then((j) => (j.status === 'late_fee_required' ? r.replace('/g/' + id + '/late') : setInfo(j))).catch(() => setLoadErr('Could not load. Check your connection and try again.'));
  }, [user, id]);
  if (loadErr) return <main className="app"><p role="alert" style={{ fontWeight: 600 }}>{loadErr}</p></main>;
  if (!info) return <main className="app"><Skeleton n={3} h={110} /></main>;

  const per = info.amount + info.packingFee + (info.late ? info.lateFee : 0), required = per * count;
  const unread = rec.some((x) => !x.x || x.x.amount == null), total = rec.reduce((s, x) => s + (x.x?.amount || 0), 0);
  const short = rec.length && !unread ? Math.max(0, required - total) : 0;
  const copy = () => { navigator.clipboard.writeText(info.acct.number); haptic(); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  async function onFile(e) {
    for (const file of Array.from(e.target.files || [])) {
      const img = await compressImage(file), hash = await sha256(img);
      setRec((p) => [...p, { img, hash, x: null, sig: null, busy: true }]);
      let x = null, sig = null;
      try { const res = await api('/api/extract', { image: img }); sig = res.sig; const { sig: _s, ...rest } = res; x = rest; } catch {}
      setRec((p) => p.map((q) => (q.hash === hash ? { ...q, x, sig, busy: false } : q)));
    }
    e.target.value = '';
  }
  async function submit() {
    if (!navigator.onLine) return setErr('You are offline. Connect to the internet to submit your receipt.');
    setBusy(true); setErr('');
    try { await api('/api/contribute', { gid: id, count, receipts: rec.map((q) => ({ img: q.img, hash: q.hash, x: q.x, sig: q.sig })) }); haptic(); setDone(true); }
    catch (e) {
      if (e.data?.error === 'late_fee_required') return r.replace('/g/' + id + '/late');
      setErr(e.data?.error === 'short' ? 'Your receipts total ' + naira(e.data.total) + ', which is short of ' + naira(e.data.required) + '. Upload another receipt for the balance.' : 'Could not send. Check your connection and try again.');
    }
    setBusy(false);
  }

  if (done) return (
    <main className="app" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
      <img src="/3d/badge.png" width="190" height="190" alt="" />
      <h1 style={{ fontSize: 30, fontWeight: 700 }}>Receipt sent</h1>
      <p className="m" style={{ fontSize: 15, lineHeight: 1.5, maxWidth: 280 }}>Your admin will confirm it shortly. It shows as awaiting admin in the group checklist.</p>
      <div className="glass r" style={{ width: '100%' }}><span className="m">Amount</span><b>{naira(required)}</b></div>
      <button className="btn" onClick={() => r.replace('/g/' + id)}>Back to group</button>
    </main>);
  return (
    <main className="app">
      <h1 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' }}>Pay contribution</h1>
      <div className="glass r"><span className="m">Contributions to send</span><div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn2" style={{ width: 44, height: 44 }} aria-label="Fewer" onClick={() => setCount(Math.max(1, count - 1))}>&minus;</button><b style={{ fontSize: 22 }}>{count}</b>
        <button className="btn2" style={{ width: 44, height: 44 }} aria-label="More" onClick={() => setCount(Math.min(20, count + 1))}>+</button></div></div>
      <div style={{ textAlign: 'center' }}><div className="m" style={{ fontSize: 15 }}>Make the payment of</div><div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>{naira(required)}</div>
        <div className="m" style={{ fontSize: 14, lineHeight: 1.5 }}>{count} &times; {naira(per)}: contribution {naira(info.amount)}{info.packingFee ? ', packing fee ' + naira(info.packingFee) : ''}{info.late && info.lateFee ? ', late fee ' + naira(info.lateFee) : ''}</div></div>
      <div className="dark" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, color: '#B8BCC2' }}>{info.acct?.bank}</div>
        <div className="r"><span style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>{info.acct?.number || 'Not set'}</span>
          <button onClick={copy} aria-label="Copy account number" style={{ minWidth: 44, height: 44, borderRadius: 14, padding: '0 10px', background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 13 }}>{copied ? 'Copied' : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>}</button></div>
        <div>{info.acct?.name}</div></div>
      {info.late ? <p className="m" style={{ textAlign: 'center' }}>Platform late fee paid.</p> : <p className="m" style={{ textAlign: 'center' }}>Pay before {info.dueTime}. After that a late fee applies before you can pay.</p>}
      <label className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>Upload receipt<input type="file" accept="image/*" multiple onChange={onFile} style={{ display: 'none' }} /></label>
      {rec.map((q) => (
        <div key={q.hash} className="glass" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <img src={q.img} alt="Receipt" style={{ width: 64, height: 86, objectFit: 'cover', borderRadius: 12 }} />
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>{q.busy ? <b>Reading receipt...</b> : q.x?.amount != null ? <><b>{naira(q.x.amount)}</b><div className="m">{q.x.senderName || 'Sender unknown'}</div></> : <><b>Could not read it</b><div className="m">The admin will check it by hand.</div></>}</div>
        </div>))}
      {short > 0 && <div className="glass" style={{ fontWeight: 600 }}>Receipts total {naira(total)}. The payment you made is {naira(short)} short of {naira(required)}. Upload another receipt for the balance.</div>}
      {err && <p role="alert" style={{ fontWeight: 600 }}>{err}</p>}
      <button className="btn" disabled={!rec.length || rec.some((q) => q.busy) || short > 0 || busy} onClick={submit}>{busy ? 'Sending...' : 'Submit for confirmation'}</button>
      <TabBar />
    </main>
  );
}
