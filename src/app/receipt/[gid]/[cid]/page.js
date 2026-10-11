'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { drawReceipt, blobOf, shareOrSave, save } from '@/lib/receipt';
import { haptic } from '@/lib/utils';
import Loader from '@/components/Loader';
import Icon from '@/components/Icon';

// A shareable receipt for one contribution, drawn as an image on the phone.
export default function Receipt() {
  const { gid, cid } = useParams(), { user } = useRequireAuth();
  const [d, setD] = useState(null), [img, setImg] = useState(''), [bad, setBad] = useState(false), [note, setNote] = useState('');
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [g, c] = await Promise.all([getDoc(doc(db, 'groups', gid)), getDoc(doc(db, 'groups', gid, 'contributions', cid))]);
      if (!g.exists() || !c.exists()) return setBad(true);
      const x = c.data(), data = { amount: x.required, status: x.status, group: g.data().name, round: x.cycle + 1, name: x.name, count: x.count, createdAt: x.createdAt, confirmedAt: x.confirmedAt, ref: 'CM-' + cid.slice(0, 8).toUpperCase(), late: x.late };
      setD(data); setImg(drawReceipt(data).toDataURL('image/png'));
    })().catch(() => setBad(true));
  }, [user, gid, cid]);
  const file = () => 'conmonie-receipt-' + (d?.ref || 'payment').toLowerCase() + '.png';
  const blob = () => blobOf(drawReceipt(d));
  if (bad) return <main className="app"><p role="alert" style={{ fontWeight: 600 }}>We could not find that payment.</p><Link href="/activities" className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Back</Link></main>;
  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <Link href="/activities" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: 8, alignItems: 'center' }}><Icon n="back" s={18} />Transactions</Link>
      {!img ? <Loader label="Preparing your receipt..." /> : <img src={img} alt={'Receipt for ' + d.group} style={{ width: '100%', borderRadius: 20, boxShadow: '0 10px 30px rgba(20,20,30,.15)' }} />}
      {img && <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={async () => { haptic(); setNote(save(await blob(), file())); }}><Icon n="download" s={18} />Download</button>
        <button className="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={async () => { haptic(); setNote(await shareOrSave(await blob(), file(), 'Conmonie receipt')); }}><Icon n="share" s={18} />Share</button>
      </div>}
      {note === 'saved' && <p role="status" className="m" style={{ textAlign: 'center' }}>Saved to your downloads.</p>}
    </main>
  );
}
