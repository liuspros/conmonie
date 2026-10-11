import { adb, push, adminReady } from '@/lib/admin';
import { authUser, isVerified, statsFor, json } from '@/lib/server';
export const runtime = 'nodejs';

// A verified member asks to join a public group. Their track record is attached by the server.
export async function POST(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  if (!(await isVerified(u.uid))) return json({ error: 'not_verified' }, 403);
  const { gid, message } = await req.json().catch(() => ({})), db = adb();
  const g = gid && (await db.doc('groups/' + gid).get()).data();
  if (!g || !g.public) return json({ error: 'not_public' }, 404);
  if (g.members.includes(u.uid)) return json({ error: 'already_member' }, 409);
  const ref = db.doc(`joinRequests/${gid}_${u.uid}`), cur = (await ref.get()).data();
  if (cur && cur.status === 'pending') return json({ error: 'already_requested' }, 409);
  const me = (await db.doc('users/' + u.uid).get()).data() || {};
  await ref.set({ gid, gname: g.name, uid: u.uid, name: me.name || 'Member', avatar: me.avatar || 0, message: String(message || '').slice(0, 300), stats: await statsFor(u.uid), status: 'pending', createdAt: Date.now() });
  await push([g.adminId], { title: g.name, body: (me.name || 'Someone') + ' asked to join your group. Check their record and decide.', link: '/g/' + gid });
  return json({ ok: true });
}
