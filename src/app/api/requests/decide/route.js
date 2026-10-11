import { FieldValue } from 'firebase-admin/firestore';
import { adb, push, adminReady } from '@/lib/admin';
import { authUser, json } from '@/lib/server';
export const runtime = 'nodejs';

// The admin approves (accepting the risk) or declines; the requester may cancel their own request.
export async function POST(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const { gid, uid, decision } = await req.json().catch(() => ({})), db = adb();
  const g = gid && (await db.doc('groups/' + gid).get()).data(), ref = db.doc(`joinRequests/${gid}_${uid}`), r = (await ref.get()).data();
  if (!g || !r || r.status !== 'pending') return json({ error: 'not_found' }, 404);
  if (decision === 'cancel') { if (u.uid !== uid) return json({ error: 'forbidden' }, 403); await ref.delete(); return json({ ok: true }); }
  if (u.uid !== g.adminId || !['approve', 'decline'].includes(decision)) return json({ error: 'forbidden' }, 403);
  if (decision === 'decline') { await ref.update({ status: 'declined', decidedAt: Date.now() }); await push([uid], { title: g.name, body: 'Your request to join was not accepted.', link: '/feed' }); return json({ ok: true }); }
  if (!g.members.includes(uid)) {
    const b = db.batch(), now = Date.now();
    b.update(db.doc('groups/' + gid), { members: FieldValue.arrayUnion(uid), order: FieldValue.arrayUnion(uid), memberCount: FieldValue.increment(1) });
    b.set(db.doc(`groups/${gid}/members/${uid}`), { name: r.name, avatar: r.avatar || 0, streak: 0, best: 0, termsAt: now, termsVersion: 1, joinedBy: 'request' });
    b.set(db.collection(`groups/${gid}/messages`).doc(), { type: 'system', text: r.name + ' joined the group', uid: g.adminId, at: now });
    if (g.public) b.set(db.doc('publicGroups/' + gid), { memberCount: g.members.length + 1 }, { merge: true });
    await b.commit();
  }
  await ref.update({ status: 'approved', decidedAt: Date.now() });
  await push([uid], { title: g.name, body: 'You were accepted into the group.', link: '/g/' + gid });
  return json({ ok: true });
}
