import { adb, adminReady } from '@/lib/admin';
import { authUser, isStaff, json } from '@/lib/server';
export const runtime = 'nodejs';

export async function GET(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req);
  if (!u || !(await isStaff(u.uid))) return json({ error: 'forbidden' }, 403);
  const db = adb(), uid = new URL(req.url).searchParams.get('uid');
  if (uid) {
    const f = {};
    for (const k of ['selfie', 'id', 'statement']) f[k] = ((await db.doc(`verifications/${uid}/files/${k}`).get()).data() || {}).data || null;
    return json({ files: f });
  }
  const s = await db.collection('verifications').where('status', '==', 'pending').limit(30).get();
  return json({ items: s.docs.map((d) => ({ uid: d.id, ...d.data() })) });
}
