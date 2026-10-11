'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRequireAuth } from '@/context/AuthContext';
import { naira } from '@/lib/utils';
import Skeleton from '@/components/Skeleton';

const when = (t) => new Date(t).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

// A printable record for the group admin: name, verification status, terms acceptance and every contribution. No ID, address or documents.
export default function Record() {
  const { id, uid } = useParams(), { user } = useRequireAuth(), [d, setD] = useState(null), [bad, setBad] = useState(false);
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const g = (await getDoc(doc(db, 'groups', id))).data();
        if (!g || g.adminId !== user.uid) return setBad(true);
        const [m, u, c] = await Promise.all([getDoc(doc(db, 'groups', id, 'members', uid)), getDoc(doc(db, 'users', uid)), getDocs(query(collection(db, 'groups', id, 'contributions'), where('uid', '==', uid)))]);
        setD({ g, m: m.data() || {}, u: u.data() || {}, c: c.docs.map((x) => x.data()).sort((a, b) => a.createdAt - b.createdAt) });
      } catch { setBad(true); }
    })();
  }, [user, id, uid]);
  if (bad) return <main className="app"><h1 style={{ fontSize: 24, fontWeight: 700 }}>Only the group admin can view this record.</h1></main>;
  if (!d) return <main className="app"><Skeleton n={3} h={100} /></main>;
  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <Link href={'/g/' + id + '/info'} style={{ color: 'inherit', textDecoration: 'none' }}>&lsaquo; Back</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Member record</h1>
      <div className="glass" style={{ fontSize: 14, lineHeight: 1.8 }}>
        <b>{d.u.verified && d.u.legalName ? d.u.legalName : d.m.name}</b> {d.u.verified && <span className="tag k">Verified</span>}<br />
        Group: {d.g.name}<br />Agreed to the group terms: {d.m.termsAt ? when(d.m.termsAt) + ' (version ' + (d.m.termsVersion || 1) + ')' : 'not recorded'}<br />Generated: {when(Date.now())}
      </div>
      <div className="glass" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <b>Contributions</b>
        {!d.c.length && <span className="m">No contributions yet.</span>}
        {d.c.map((x, i) => <div key={i} className="r" style={{ fontSize: 13 }}><span>Round {x.cycle + 1} &middot; {x.count} &times; &middot; {naira(x.required)}{x.late ? ' (late)' : ''}<br /><span className="m">{when(x.createdAt)}{x.reason ? ' &middot; ' + x.reason : ''}</span></span><span className={'tag' + (x.status === 'confirmed' ? ' k' : '')}>{x.status === 'confirmed' ? 'Confirmed' : x.status === 'rejected' ? 'Rejected' : 'Awaiting'}</span></div>)}
      </div>
      <p className="m" style={{ fontSize: 12, lineHeight: 1.5 }}>This is a record of activity in Conmonie. It is not legal advice. Take it to a lawyer or the relevant authority if you need to recover money.</p>
      <button className="btn" onClick={() => window.print()}>Print or save as PDF</button>
    </main>
  );
}
