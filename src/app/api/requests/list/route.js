import { adb, adminReady } from '@/lib/admin';
import { authUser, json } from '@/lib/server';
export const runtime = 'nodejs';

export async function GET(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const gid = new URL(req.url).searchParams.get('gid'), db = adb(), g = gid && (await db.doc('groups/' + gid).get()).data();
  if (!g || g.adminId !== u.uid) return json({ error: 'forbidden' }, 403);
  const s = await db.collection('joinRequests').where('gid', '==', gid).where('status', '==', 'pending').get();
  return json({ items: s.docs.map((d) => d.data()).sort((a, b) => a.createdAt - b.createdAt) });
}
