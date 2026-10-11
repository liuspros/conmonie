import { adb, adminReady } from '@/lib/admin';
import { psReady, psInit } from '@/lib/paystack';
import { authUser, loadGroup, platformFee, lateDocPath, json } from '@/lib/server';
import { cycleInfo } from '@/lib/utils';
export const runtime = 'nodejs';

export async function POST(req) {
  if (!adminReady() || !psReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const { gid } = await req.json().catch(() => ({})), g = await loadGroup(gid, u.uid);
  if (!g) return json({ error: 'forbidden' }, 403);
  const ci = cycleInfo(g);
  if (!ci.late || (await adb().doc(lateDocPath(gid, u.uid, ci.k)).get()).exists) return json({ status: 'ok' });
  const fee = platformFee(), reference = `lf-${gid}-${ci.k}-${u.uid}-${Date.now().toString(36)}`.slice(0, 100);
  const r = await psInit({ email: u.email, amount: fee * 100, currency: 'NGN', reference, callback_url: new URL(req.url).origin + '/g/' + gid + '/late', metadata: { purpose: 'late_fee', gid, uid: u.uid, cycle: ci.k, fee } });
  if (!r.status) return json({ error: 'paystack_failed' }, 502);
  return json({ url: r.data.authorization_url });
}
