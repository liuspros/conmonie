import { adb, adminReady } from '@/lib/admin';
import { authUser, json } from '@/lib/server';
import { proActive, proUntil } from '@/lib/plans';
export const runtime = 'nodejs';
export async function GET(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const d = (await adb().doc('users/' + u.uid).get()).data() || {};
  return json({ isPro: proActive(d), until: proUntil(d) });
}
