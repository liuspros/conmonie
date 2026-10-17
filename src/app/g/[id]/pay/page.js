'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { naira, haptic, compressImage, sha256 } from '@/lib/utils';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';
import Loader from '@/components/Loader';
import OpayButton from '@/components/OpayButton';
import Icon from '@/components/Icon';

export default function Pay() {
  const { id } = useParams(), r = useRouter(), { user } = useRequireAuth();
  const [info, setInfo] = useState(), [loadErr, setLoadErr] = useState(''), [mode, setMode] = useState('new'), [count, setCount] = useState(1), [rec, setRec] = useState([]), [copied, setCopied] = useState(false), [busy, setBusy] = useState(false), [done, setDone] = useState(null), [err, setErr] = useState(''), [deposit, setDeposit] = useState(false);
  useEffect(() => { if (!user) return; api('/api/pay/info?gid=' + id).then((j) => { setInfo(j); setMode(j.pending ? 'attach' : 'new'); }).catch(() => setLoadErr('Could not load. Check your connection and try again.')); }, [user, id]);
  if (loadErr) return <main className="app"><p role="alert" style={{ fontWeight: 600 }}>{loadErr}</p></main>;
  if (!info) return <main className="app"><Skeleton n={3} h={110} /></main>;

  const pend = info.pending, attach = mode === 'attach' && !!pend;
  const per = info.amount + info.packingFee + (info.late ? info.lateFee : 0), required = attach ? pend.required : per * count;
  const unread = rec.some((x) => !x.x || x.x.amount == null), total = rec.reduce((s, x) => s + (x.x?.amount || 0), 0);
  const short = rec.length && !unread && !attach ? Math.max(0, required - total) : 0, balance = attach ? Math.max(0, pend.required - (pend.received || 0)) : null;
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
    const receipts = rec.map((q) => ({ img: q.img, hash: q.hash, x: q.x, sig: q.sig }));
    try {
      if (attach) { const j = await api('/api/contribute/attach', { gid: id, cid: pend.id, receipts }); setDone({ kind: 'attach', received: j.received, required: j.required }); }
      else { const part = deposit && short > 0; await api('/api/contribute', { gid: id, count, receipts, partial: part }); setDone({ kind: part ? 'deposit' : 'new' }); }
      haptic();
    } catch (e) { setErr(e.data?.error === 'short' ? 'Your receipts total ' + naira(e.data.total) + ', which is short of ' + naira(e.data.required) + '. Upload another receipt, or send it as a deposit.' : e.data?.code === 'NOT_PENDING' ? e.data.error : 'Could not send. Check your connection and try again.'); }
    setBusy(false);
  }

  if (done) return (
    <main className="app" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
      <img src="/3d/badge.png" width="190" height="190" alt="" />
      <h1 style={{ fontSize: 30, fontWeight: 700 }}>{done.kind === 'attach' ? 'Receipt added' : done.kind === 'deposit' ? 'Deposit sent' : 'Receipt sent'}</h1>
      <p className="m" style={{ fontSize: 15, lineHeight: 1.5, maxWidth: 300 }}>{done.kind === 'attach' ? 'Your admin has been told you added another receipt. They can confirm it once the balance is in.' : done.kind === 'deposit' ? 'Your admin sees it as a pending deposit. Add another receipt from this page when you pay the rest.' : 'Your admin will confirm it shortly. It shows as awaiting admin in the group checklist.'}</p>
      {done.kind === 'attach' && <div className="glass r" style={{ width: '100%' }}><span className="m">Received so far</span><b>{naira(done.received)} of {naira(done.required)}</b></div>}
      <button className="btn" onClick={() => r.replace('/g/' + id)}>Back to group</button>
    </main>);
  return (
    <main className="app">
      <h1 style={{ fontSize: 20, fontWeight: 700, textAlign: 'center' }}>{attach ? 'Add to your pending payment' : 'Pay contribution'}</h1>
      {attach && <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="r"><b>Your pending payment</b><span className="st st-wait">{pend.held ? 'On hold' : 'Pending'}</span></div>
        <div style={{ fontSize: 14, lineHeight: 1.7 }}>Total due: <b>{naira(pend.required)}</b><br />Received so far: <b>{pend.received != null ? naira(pend.received) : 'being checked'}</b>{balance ? <><br />Balance: <b>{naira(balance)}</b></> : null}<br /><span className="m">Sent {new Date(pend.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}. Upload another receipt below and your admin is notified.</span></div>
        <button className="m" style={{ background: 'none', textDecoration: 'underline', textAlign: 'left' }} onClick={() => setMode('new')}>Start a new payment instead</button>
      </div>}
      {!attach && <>
        {pend && <button className="m" style={{ background: 'none', textDecoration: 'underline', textAlign: 'left' }} onClick={() => setMode('attach')}>Add to your pending payment instead</button>}
        <div className="glass r"><span className="m">Contributions to send</span><div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="btn2" style={{ width: 44, height: 44 }} aria-label="Fewer" onClick={() => setCount(Math.max(1, count - 1))}>&minus;</button><b style={{ fontSize: 22 }}>{count}</b>
          <button className="btn2" style={{ width: 44, height: 44 }} aria-label="More" onClick={() => setCount(Math.min(20, count + 1))}>+</button></div></div>
        <div style={{ textAlign: 'center' }}><div className="m" style={{ fontSize: 15 }}>Make the payment of</div><div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>{naira(required)}</div>
          <div className="m" style={{ fontSize: 14, lineHeight: 1.5 }}>{count} &times; {naira(per)}: contribution {naira(info.amount)}{info.packingFee ? ', packing fee ' + naira(info.packingFee) : ''}{info.late && info.lateFee ? ', late fee ' + naira(info.lateFee) : ''}</div></div>
      </>}
      {attach && balance > 0 && <div style={{ textAlign: 'center' }}><div className="m" style={{ fontSize: 15 }}>Balance to pay</div><div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1 }}>{naira(balance)}</div></div>}
      <div className="dark" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, color: '#B8BCC2' }}>{info.acct?.bank}</div>
        <div className="r"><span style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>{info.acct?.number || 'Not set'}</span>
          <button onClick={copy} aria-label="Copy account number" style={{ minWidth: 44, height: 44, borderRadius: 14, padding: '0 10px', background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 13 }}>{copied ? 'Copied' : <Icon n="copy" s={20} />}</button></div>
        <div>{info.acct?.name}</div></div>
      <OpayButton account={info.acct?.number} />
      {!attach && <p className="m" style={{ textAlign: 'center' }}>Pay before {info.dueTime}.{info.lateFee ? ' After that your admin adds a late fee of ' + naira(info.lateFee) + '.' : ''}</p>}
      <label className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}><Icon n="camera" />{attach ? 'Add another receipt' : 'Upload receipt'}<input type="file" accept="image/*" multiple onChange={onFile} style={{ display: 'none' }} /></label>
      {rec.map((q) => (
        <div key={q.hash} className="glass" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <img src={q.img} alt="Receipt" style={{ width: 64, height: 86, objectFit: 'cover', borderRadius: 12 }} />
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>{q.busy ? <Loader inline size={26} label="Reading receipt..." /> : q.x?.amount != null ? <><b>{naira(q.x.amount)}</b><div className="m">{q.x.senderName || 'Sender unknown'}</div></> : <><b>Could not read it</b><div className="m">The admin will check it by hand.</div></>}</div>
        </div>))}
      {short > 0 && <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 600 }}>Receipts total {naira(total)}. That is {naira(short)} short of {naira(required)}.</div>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}><input type="checkbox" checked={deposit} onChange={(e) => setDeposit(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />Send this as a deposit. My admin will hold it as pending and I will add the balance later.</label>
      </div>}
      {err && <p role="alert" style={{ fontWeight: 600 }}>{err}</p>}
      <button className="btn" disabled={!rec.length || rec.some((q) => q.busy) || busy || (short > 0 && !deposit)} onClick={submit}>{busy ? 'Sending...' : attach ? 'Add receipt to my payment' : deposit && short > 0 ? 'Send deposit' : 'Submit for confirmation'}</button>
      <TabBar />
    </main>
  );
}
