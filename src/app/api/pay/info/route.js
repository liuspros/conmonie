import { adminReady } from '@/lib/admin';
import { authUser, loadGroup, acctOf, json } from '@/lib/server';
import { cycleInfo } from '@/lib/utils';
export const runtime = 'nodejs';

// Members get the payment account from here, never from the group document.
export async function GET(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const gid = new URL(req.url).searchParams.get('gid'), g = await loadGroup(gid, u.uid);
  if (!g) return json({ error: 'forbidden' }, 403);
  const ci = cycleInfo(g);
  return json({ status: 'ok', name: g.name, amount: g.amount, packingFee: g.packingFee || 0, lateFee: g.lateFee || 0, dueTime: g.dueTime, late: ci.late, cycle: ci.k, acct: await acctOf(gid, g) });
}
