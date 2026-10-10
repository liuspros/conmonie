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
    const nameOf = async (u) => ((await db.doc('users/' + u).get()).data() || {}).name || 'the packer';
    // A fresh checklist at the start of every round
    if (ci.isPackingDay && await once(id, ci.k + '_list')) {
      const ms = (await db.collection(`groups/${id}/members`).get()).docs, nm = Object.fromEntries(ms.map((x) => [x.id, x.data().name]));
      const st = (u) => (cons.find((c) => c.uid === u && c.status !== 'rejected') || {}).status || 'none';
      await db.collection(`groups/${id}/messages`).add({ type: 'checklist', text: 'Round ' + (ci.k + 1) + ' checklist', rows: g.members.map((u) => ({ uid: u, name: nm[u] || 'Member', s: st(u) })), uid: g.adminId, at: now });
    }
    if (now >= ci.due - 2 * H && now < ci.due && unpaid.length && await once(id, ci.k + '_due'))
      n += await push(unpaid, { title: g.name, body: `Pay ${naira(g.amount)} before ${g.dueTime} to avoid the ${naira(g.lateFee)} late fee.`, link });
    if (now >= ci.due && now < ci.due + 2 * H && unpaid.length && await once(id, ci.k + '_late'))
      n += await push(unpaid, { title: g.name, body: `Payment is late. A ${naira(g.lateFee)} late fee now applies.`, link });
    // Remind the admin about receipts waiting more than 30 minutes (at most every 6 hours)
    const pend = (await db.collection(`groups/${id}/contributions`).where('status', '==', 'pending').get()).docs.filter((x) => now - x.data().createdAt > 30 * 60000);
    if (pend.length && await once(id, 'pend_' + Math.floor(now / (6 * H))))
      n += await push([g.adminId], { title: g.name, body: `${pend.length} receipt${pend.length > 1 ? 's are' : ' is'} waiting for you to confirm.`, link });
    // Packing day: nudge the admin every 4 hours until they mark the packer paid
    if (ci.isPackingDay && now >= ci.due && ci.packerUid && g.packedCycle !== ci.k) {
      if (await once(id, ci.k + '_pack_' + Math.floor(now / (4 * H)))) n += await push([g.adminId], { title: g.name, body: `Packing day: pay ${await nameOf(ci.packerUid)} and mark it paid.`, link });
      if (ci.packerUid !== g.adminId && await once(id, ci.k + '_packer')) n += await push([ci.packerUid], { title: g.name, body: 'It is your turn to be paid today.', link });
    }
  }
  return NextResponse.json({ sent: n });
}
