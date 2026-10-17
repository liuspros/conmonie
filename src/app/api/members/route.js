import { adb, adminReady } from '@/lib/admin';
import { authUser, adminsOf, json } from '@/lib/server';
export const runtime = 'nodejs';

// Group member profiles. Legal names, phone numbers and payment records are added ONLY when the caller is an admin of the group;
// for everyone else those fields are never put in the response, so they cannot be read from the network.
export async function GET(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const gid = new URL(req.url).searchParams.get('gid'), db = adb(), g = gid && (await db.doc('groups/' + gid).get()).data();
  if (!g || !g.members.includes(u.uid)) return json({ error: 'forbidden' }, 403);
  const admins = adminsOf(g), isAdmin = admins.includes(u.uid);
  const ms = (await db.collection(`groups/${gid}/members`).get()).docs;
  const members = await Promise.all(ms.map(async (d) => {
    const m = d.data(), out = { uid: d.id, name: m.name || 'Member', avatar: m.avatar || 0, role: admins.includes(d.id) ? 'admin' : 'member' };
    if (!isAdmin) return out;
    const v = (await db.doc('verifications/' + d.id).get()).data() || {};
    const cs = (await db.collection(`groups/${gid}/contributions`).where('uid', '==', d.id).get()).docs.map((x) => x.data());
    return { ...out, legalName: v.legalName || null, phoneNumber: v.phone || null,
      record: { streak: m.streak || 0, bestStreak: m.best || 0, confirmed: cs.filter((c) => c.status === 'confirmed').length, pending: cs.filter((c) => c.status === 'pending').length, rejected: cs.filter((c) => c.status === 'rejected').length, late: cs.filter((c) => c.status === 'confirmed' && c.late).length, totalConfirmed: cs.filter((c) => c.status === 'confirmed').reduce((t, c) => t + (c.required || 0), 0) } };
  }));
  return json({ isAdmin, members });
}
