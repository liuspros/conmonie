import { adb, adminReady } from '@/lib/admin';
import { authUser, loadGroup, acctOf, json } from '@/lib/server';
import { cycleInfo } from '@/lib/utils';
export const runtime = 'nodejs';

// Members get the payment account from here, never from the group document. Also reports a payment of theirs that is still
// pending, so they can attach another receipt to it.
export async function GET(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const gid = new URL(req.url).searchParams.get('gid'), g = await loadGroup(gid, u.uid);
  if (!g) return json({ error: 'forbidden' }, 403);
  const ci = cycleInfo(g);
  const p = (await adb().collection(`groups/${gid}/contributions`).where('uid', '==', u.uid).where('status', '==', 'pending').get()).docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt)[0];
  const pending = p ? { id: p.id, required: p.required, received: p.received ?? null, count: p.count, createdAt: p.createdAt, cycle: p.cycle, held: !!p.held, receiptCount: p.receiptCount || 1 } : null;
  return json({ status: 'ok', name: g.name, amount: g.amount, packingFee: g.packingFee || 0, lateFee: g.lateFee || 0, dueTime: g.dueTime, late: ci.late, cycle: ci.k, acct: await acctOf(gid, g), pending });
}
