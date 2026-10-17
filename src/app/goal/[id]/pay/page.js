'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { naira, haptic, compressImage, sha256 } from '@/lib/utils';
import Skeleton from '@/components/Skeleton';
import Loader from '@/components/Loader';
import Icon from '@/components/Icon';
import OpayButton from '@/components/OpayButton';

export default function GoalPay() {
  const { id } = useParams(), r = useRouter(), { user } = useRequireAuth();
  const [info, setInfo] = useState(), [loadErr, setLoadErr] = useState(''), [amount, setAmount] = useState(''), [rec, setRec] = useState([]), [copied, setCopied] = useState(false), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [err, setErr] = useState('');
  useEffect(() => { if (user) api('/api/goal/info?gid=' + id).then((j) => { setInfo(j); if (j.suggested) setAmount(String(j.suggested)); }).catch(() => setLoadErr('Could not load. Check your connection and try again.')); }, [user, id]);
  if (loadErr) return <main className="app"><p role="alert" style={{ fontWeight: 600 }}>{loadErr}</p></main>;
  if (!info) return <main className="app"><Skeleton n={3} h={110} /></main>;

  const amt = Math.floor(+amount) || 0, unread = rec.some((x) => !x.x || x.x.amount == null), total = rec.reduce((s, x) => s + (x.x?.amount || 0), 0), short = rec.length && !unread ? Math.max(0, amt - total) : 0;
  const chips = [...new Set([info.suggested, 1000, 2000, 5000, 10000].filter((x) => x > 0))].slice(0, 5);
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
    try { await api('/api/goal/contribute', { gid: id, amount: amt, receipts: rec.map((q) => ({ img: q.img, hash: q.hash, x: q.x, sig: q.sig })) }); haptic(); setDone(true); }
    catch (e) { setErr(e.data?.error === 'short' ? 'Your receipts total ' + naira(e.data.total) + ', which is short of ' + naira(e.data.required) + '. Upload another receipt for the balance.' : e.data?.error === 'closed' ? 'This goal is closed.' : 'Could not send. Check your connection and try again.'); }
    setBusy(false);
  }
  if (done) return (
    <main className="app" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
      <img src="/3d/badge.png" width="190" height="190" alt="" /><h1 style={{ fontSize: 30, fontWeight: 700 }}>Contribution sent</h1>
      <p className="m" style={{ fontSize: 15, lineHeight: 1.5, maxWidth: 290 }}>The organizer will confirm it shortly. Once confirmed it counts toward the goal.</p>
      <div className="glass r" style={{ width: '100%' }}><span className="m">Amount</span><b>{naira(amt)}</b></div>
      <button className="btn" onClick={() => r.replace('/goal/' + id)}>Back to goal</button>
    </main>);
  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <Link href={'/goal/' + id} style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: 8, alignItems: 'center' }}><Icon n="back" s={18} />{info.name}</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Contribute</h1>
      <div style={{ textAlign: 'center' }}><div className="m" style={{ fontSize: 15 }}>How much are you giving?</div>
        <div style={{ position: 'relative', margin: '8px auto 0', maxWidth: 260 }}><span style={{ position: 'absolute', left: 0, top: 6, fontSize: 36, fontWeight: 700 }}>&#8358;</span><input aria-label="Amount in naira" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} placeholder="0" style={{ width: '100%', border: 0, borderBottom: '3px solid #2F7DE1', background: 'transparent', fontSize: 48, fontWeight: 700, textAlign: 'center', outline: 0, padding: '0 0 4px 30px' }} /></div></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>{chips.map((c) => <button key={c} type="button" className="pill" aria-pressed={amt === c} style={{ background: amt === c ? '#2F7DE1' : '#E3E5E8', color: amt === c ? '#fff' : '#0A0A0A' }} onClick={() => setAmount(String(c))}>{naira(c)}</button>)}</div>
      <div className="cg-head" style={{ borderRadius: 24, padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, color: '#B7D3F0' }}>{info.acct?.bank}</div>
        <div className="r"><span style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>{info.acct?.number || 'Not set'}</span>
          <button onClick={copy} aria-label="Copy account number" style={{ minWidth: 44, height: 44, borderRadius: 14, padding: '0 10px', background: 'rgba(255,255,255,.16)', color: '#fff', fontSize: 13 }}>{copied ? 'Copied' : <Icon n="copy" s={20} />}</button></div>
        <div>{info.acct?.name}</div></div>
      <OpayButton account={info.acct?.number} />
      <p className="m" style={{ textAlign: 'center', fontSize: 13 }}>Pay from your bank app, then upload the receipt. Money goes straight to this account.</p>
      <label className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><Icon n="camera" />Upload receipt<input type="file" accept="image/*" multiple onChange={onFile} style={{ display: 'none' }} /></label>
      {rec.map((q) => (
        <div key={q.hash} className="glass" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <img src={q.img} alt="Receipt" style={{ width: 64, height: 86, objectFit: 'cover', borderRadius: 12 }} />
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>{q.busy ? <Loader inline size={26} label="Reading receipt..." /> : q.x?.amount != null ? <><b>{naira(q.x.amount)}</b><div className="m">{q.x.senderName || 'Sender unknown'}</div></> : <><b>Could not read it</b><div className="m">The organizer will check it by hand.</div></>}</div>
        </div>))}
      {short > 0 && <div className="glass" style={{ fontWeight: 600 }}>Receipts total {naira(total)}. That is {naira(short)} short of {naira(amt)}. Upload another receipt for the balance.</div>}
      {err && <p role="alert" style={{ fontWeight: 600 }}>{err}</p>}
      <button className="btn" disabled={amt < 100 || !rec.length || rec.some((q) => q.busy) || short > 0 || busy} onClick={submit}>{busy ? 'Sending...' : 'Submit for confirmation'}</button>
    </main>
  );
}
