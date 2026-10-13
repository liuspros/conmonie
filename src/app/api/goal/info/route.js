import { adminReady } from '@/lib/admin';
import { authUser, loadGoal, goalAcct, json } from '@/lib/server';
export const runtime = 'nodejs';

// Members get the collection account from here, never from the goal document.
export async function GET(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const gid = new URL(req.url).searchParams.get('gid'), g = await loadGoal(gid, u.uid);
  if (!g) return json({ error: 'forbidden' }, 403);
  return json({ name: g.name, target: g.target, collected: g.collected || 0, deadline: g.deadline, suggested: g.suggested || 0, status: g.status, acct: await goalAcct(gid) });
}
