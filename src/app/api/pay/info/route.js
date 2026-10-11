import { adb, adminReady } from '@/lib/admin';
import { authUser, loadGroup, acctOf, platformFee, lateDocPath, json } from '@/lib/server';
import { cycleInfo } from '@/lib/utils';
export const runtime = 'nodejs';

// The only way members get the payment account. Late members get nothing until the platform late fee is paid.
export async function GET(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const gid = new URL(req.url).searchParams.get('gid'), g = await loadGroup(gid, u.uid);
  if (!g) return json({ error: 'forbidden' }, 403);
  const ci = cycleInfo(g), paid = !ci.late || (await adb().doc(lateDocPath(gid, u.uid, ci.k)).get()).exists;
  const base = { name: g.name, amount: g.amount, packingFee: g.packingFee || 0, lateFee: g.lateFee || 0, dueTime: g.dueTime, late: ci.late, platformFee: platformFee(), cycle: ci.k };
  if (!paid) return json({ status: 'late_fee_required', ...base });
  return json({ status: 'ok', ...base, lateFeePaid: ci.late, acct: await acctOf(gid, g) });
}
