import { adb, push, adminReady } from '@/lib/admin';
import { authUser, adminsOf, json } from '@/lib/server';
import { proActive } from '@/lib/plans';
import { cycleInfo } from '@/lib/utils';
export const runtime = 'nodejs';

// Pro feature: sends a high-priority alarm notification to every member who still owes this round.
export async function POST(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const { gid } = await req.json().catch(() => ({})), db = adb(), g = gid && (await db.doc('groups/' + gid).get()).data();
  if (!g || !adminsOf(g).includes(u.uid)) return json({ error: 'forbidden' }, 403);
  const me = (await db.doc('users/' + u.uid).get()).data() || {};
  if (!proActive(me)) return json({ code: 'PRO_REQUIRED', error: 'Upgrade to Conmonie Pro to use the Ping Trigger.' }, 403);
  const now = Date.now();
  if (g.lastPingAt && now - g.lastPingAt < 30 * 60000) return json({ code: 'TOO_SOON', error: 'You pinged this group recently. Try again in a few minutes.' }, 429);
  const ci = cycleInfo(g), cons = (await db.collection(`groups/${gid}/contributions`).where('cycle', '==', ci.k).get()).docs.map((d) => d.data());
  const owing = g.members.filter((m) => !adminsOf(g).includes(m) && !cons.some((c) => c.uid === m && c.status !== 'rejected'));
  if (!owing.length) return json({ ok: true, count: 0, sent: 0 });
  const sent = await push(owing, { title: g.name, body: 'Reminder from your admin: your contribution is still outstanding.', link: '/g/' + gid + '/pay', alarm: true });
  const b = db.batch(); b.update(db.doc('groups/' + gid), { lastPingAt: now });
  b.set(db.collection(`groups/${gid}/messages`).doc(), { type: 'system', text: 'Admin pinged ' + owing.length + ' member' + (owing.length > 1 ? 's' : '') + ' with an outstanding payment', uid: g.adminId, at: now });
  await b.commit();
  return json({ ok: true, count: owing.length, sent });
}
