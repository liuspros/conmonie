'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { cycleInfo, naira, haptic, compressImage, sha256 } from '@/lib/utils';
import TabBar from '@/components/TabBar';
import Skeleton from '@/components/Skeleton';
import { notify } from '@/lib/notify';

export default function Pay() {
  const { id } = useParams(), r = useRouter(), { user, profile } = useRequireAuth();
  const [g, setG] = useState(), [count, setCount] = useState(1), [rec, setRec] = useState([]), [copied, setCopied] = useState(false), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  useEffect(() => { if (user) getDoc(doc(db, 'groups', id)).then((s) => (s.exists() ? setG({ id, ...s.data() }) : r.replace('/'))); }, [user, id]);
  if (!g) return <main className="app"><Skeleton n={3} h={110} /></main>;

  const ci = cycleInfo(g), per = g.amount + (ci.late ? g.lateFee : 0), required = per * count;
  const unread = rec.some((x) => !x.x || x.x.amount == null), total = rec.reduce((s, x) => s + (x.x?.amount || 0), 0);
  const short = rec.length && !unread ? Math.max(0, required - total) : 0;
  const copy = () => { navigator.clipboard.writeText(g.acct.number); haptic(); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  async function onFile(e) {
    for (const file of Array.from(e.target.files || [])) {
      const img = await compressImage(file), hash = await sha256(img);
      setRec((p) => [...p, { img, hash, x: null, busy: true }]);
      let x = null;
      try {
        const res = await fetch('/api/extract', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (await auth.currentUser.getIdToken()) }, body: JSON.stringify({ image: img }) });
        if (res.ok) x = await res.json();
      } catch {}
      setRec((p) => p.map((q) => (q.hash === hash ? { ...q, x, busy: false } : q)));
    }
    e.target.value = '';
  }
  async function submit() {
    if (!navigator.onLine) { window.alert('You are offline. Connect to the internet to submit your receipt.'); return; }
    setBusy(true);
    const names = (profile?.name || '').toLowerCase().split(/\s+/);
    const flagsFor = async (q) => {
      const f = [], x = q.x;
      if ((await getDoc(doc(db, 'groups', id, 'refs', q.hash))).exists()) f.push('same image used before');
      if (x?.reference && (await getDoc(doc(db, 'groups', id, 'refs', 'r_' + x.reference))).exists()) f.push('reference already used');
      if (x?.suspicious) f.push('looks edited: ' + (x.reason || ''));
      if (x?.date && new Date(x.date).getTime() < ci.due - 864e5 * (g.frequencyDays || 1)) f.push('receipt date looks old');
      if (x?.senderName && !names.some((n) => n.length > 2 && x.senderName.toLowerCase().includes(n))) f.push('sender name differs');
      if (!x || x.amount == null) f.push('could not be read');
      return f;
    };
    const cref = await addDoc(collection(db, 'groups', id, 'contributions'), { uid: user.uid, name: profile?.name || 'Member', cycle: ci.k, count, required, late: ci.late, status: 'pending', createdAt: Date.now() });
    for (const q of rec) {
      await addDoc(collection(db, 'groups', id, 'receipts'), { uid: user.uid, cid: cref.id, image: q.img, hash: q.hash, extracted: q.x, flags: await flagsFor(q), createdAt: Date.now() });
      await setDoc(doc(db, 'groups', id, 'refs', q.hash), { uid: user.uid });
      if (q.x?.reference) await setDoc(doc(db, 'groups', id, 'refs', 'r_' + q.x.reference), { uid: user.uid });
    }
    haptic(); setDone(true); notify('submitted', id);
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
        <button className="btn2" style={{ width: 44, height: 44 }} aria-label="More" onClick={() => setCount(count + 1)}>+</button></div></div>
      <div style={{ textAlign: 'center' }}><div className="m" style={{ fontSize: 15 }}>Make the payment of</div><div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1 }}>{naira(required)}</div>
        <div className="m" style={{ fontSize: 15 }}>{count} &times; {naira(per)}{ci.late ? ' (includes ' + naira(g.lateFee) + ' late fee each)' : ''} &middot; to the account below</div></div>
      <div className="dark" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, color: '#B8BCC2' }}>{g.acct.bank}</div>
        <div className="r"><span style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>{g.acct.number}</span>
          <button onClick={copy} aria-label="Copy account number" style={{ minWidth: 44, height: 44, borderRadius: 14, padding: '0 10px', background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: 13 }}>{copied ? 'Copied' : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>}</button></div>
        <div>{g.acct.name}</div></div>
      {!ci.late && <p className="m" style={{ textAlign: 'center' }}>Pay before {g.dueTime}. After that, +{naira(g.lateFee)} per contribution.</p>}
      <label className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>Upload receipt<input type="file" accept="image/*" multiple onChange={onFile} style={{ display: 'none' }} /></label>
      {rec.map((q) => (
        <div key={q.hash} className="glass" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <img src={q.img} alt="Receipt" style={{ width: 64, height: 86, objectFit: 'cover', borderRadius: 12 }} />
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>{q.busy ? <b>Reading receipt...</b> : q.x?.amount != null ? <><b>{naira(q.x.amount)}</b><div className="m">{q.x.senderName || 'Sender unknown'}</div></> : <><b>Could not read it</b><div className="m">The admin will check it by hand.</div></>}</div>
        </div>))}
      {short > 0 && <div className="glass" style={{ fontWeight: 600 }}>Receipts total {naira(total)}. The payment you made is {naira(short)} short of {naira(required)}. Upload another receipt for the balance.</div>}
      <button className="btn" disabled={!rec.length || rec.some((q) => q.busy) || short > 0 || busy} onClick={submit}>{busy ? 'Sending...' : 'Submit for confirmation'}</button>
      <TabBar />
    </main>
  );
}
