import { FieldValue } from 'firebase-admin/firestore';
import { adb, adminReady } from '@/lib/admin';
import { authUser, isVerified, joinBlock, json } from '@/lib/server';
export const runtime = 'nodejs';

// Every invite-link join goes through here so the plan limits cannot be skipped: a free group holds 5 members, and a free
// account can join 10 groups. (ConGoals have no plan limits.)
export async function POST(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  if (!(await isVerified(u.uid))) return json({ code: 'KYC_REQUIRED', error: 'You must verify your KYC to join or create a group.' }, 403);
  const { code } = await req.json().catch(() => ({})), db = adb();
  const inv = code && (await db.doc('invites/' + String(code)).get()).data();
  if (!inv) return json({ code: 'INVALID_INVITE', error: 'This invite link is not valid.' }, 404);
  const goal = inv.kind === 'goal', col = goal ? 'goals' : 'groups', ref = db.doc(`${col}/${inv.gid}`), g = (await ref.get()).data();
  if (!g) return json({ code: 'INVALID_INVITE', error: 'This invite link is not valid.' }, 404);
  if (g.members.includes(u.uid)) return json({ code: 'ALREADY_MEMBER', error: 'You are already a member.', gid: inv.gid, kind: goal ? 'goal' : 'group' }, 409);
  if (!goal) { const blk = await joinBlock(g, u.uid); if (blk) return json(blk, 403); }
  const me = (await db.doc('users/' + u.uid).get()).data() || {}, now = Date.now(), b = db.batch();
  const base = { name: me.name || 'Member', avatar: me.avatar || 0, termsAt: now, termsVersion: 1 };
  if (goal) {
    b.update(ref, { members: FieldValue.arrayUnion(u.uid), memberCount: FieldValue.increment(1) });
    b.set(db.doc(`goals/${inv.gid}/members/${u.uid}`), { ...base, total: 0 });
  } else {
    b.update(ref, { members: FieldValue.arrayUnion(u.uid), order: FieldValue.arrayUnion(u.uid), memberCount: FieldValue.increment(1) });
    b.set(db.doc(`groups/${inv.gid}/members/${u.uid}`), { ...base, streak: 0, best: 0 });
    b.set(db.collection(`groups/${inv.gid}/messages`).doc(), { type: 'system', text: base.name + ' joined the group', uid: g.adminId, at: now });
    if (g.public) b.set(db.doc('publicGroups/' + inv.gid), { memberCount: g.members.length + 1 }, { merge: true });
  }
  await b.commit();
  if (!goal) { const n = (await db.collection('groups').where('members', 'array-contains', u.uid).get()).docs.filter((d) => d.data().adminId !== u.uid).length; await db.doc('users/' + u.uid).set({ joinedGroupsCount: n }, { merge: true }); }
  return json({ ok: true, gid: inv.gid, kind: goal ? 'goal' : 'group' });
}
