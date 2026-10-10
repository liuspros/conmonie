import { NextResponse } from 'next/server';
import { adb, push, adminReady } from '@/lib/admin';
import { cycleInfo, naira } from '@/lib/utils';
export const runtime = 'nodejs';
export const maxDuration = 60;
const H = 36e5;

// Called every 15 minutes by .github/workflows/reminders.yml. Each reminder is sent once (claimed with create()).
async function once(gid, key) {
  try { await adb().doc(`groups/${gid}/reminders/${key}`).create({ at: Date.now() }); return true; } catch { return false; }
}
export async function GET(req) {
  if (!adminReady() || !process.env.CRON_SECRET) return NextResponse.json({ error: 'not_configured' }, { status: 501 });
  if (req.headers.get('authorization') !== 'Bearer ' + process.env.CRON_SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const now = Date.now(), db = adb(); let n = 0;
  for (const d of (await db.collection('groups').get()).docs) {
    const g = d.data(), id = d.id, ci = cycleInfo(g, now), link = '/g/' + id;
    const cons = (await db.collection(`groups/${id}/contributions`).where('cycle', '==', ci.k).get()).docs.map((x) => x.data());
    const unpaid = g.members.filter((u) => !cons.some((c) => c.uid === u && c.status !== 'rejected'));
    if (now >= ci.due - 2 * H && now < ci.due && unpaid.length && await once(id, ci.k + '_due'))
      n += await push(unpaid, { title: g.name, body: `Pay ${naira(g.amount)} before ${g.dueTime} to avoid the ${naira(g.lateFee)} late fee.`, link });
    if (now >= ci.due && now < ci.due + 2 * H && unpaid.length && await once(id, ci.k + '_late'))
      n += await push(unpaid, { title: g.name, body: `Payment is late. A ${naira(g.lateFee)} late fee now applies.`, link });
    if (ci.isPackingDay && now >= ci.due && ci.packerUid && await once(id, ci.k + '_pack')) {
      const pk = ((await db.doc('users/' + ci.packerUid).get()).data() || {}).name || 'the packer';
      n += await push([g.adminId], { title: g.name, body: `Packing day: pay ${pk} today.`, link });
      if (ci.packerUid !== g.adminId) n += await push([ci.packerUid], { title: g.name, body: `It is your turn to be paid today.`, link });
    }
  }
  return NextResponse.json({ sent: n });
}
