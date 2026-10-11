import { adb, push, adminReady } from '@/lib/admin';
import { authUser, loadGroup, sha, sigOf, safeId, json } from '@/lib/server';
import { cycleInfo } from '@/lib/utils';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Every contribution is created here, never from the browser, so lateness and amounts cannot be tampered with.
export async function POST(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const { gid, count, receipts } = await req.json().catch(() => ({})), g = await loadGroup(gid, u.uid);
  if (!g) return json({ error: 'forbidden' }, 403);
  const n = Math.floor(+count);
  if (!(n >= 1 && n <= 20) || !Array.isArray(receipts) || receipts.length < 1 || receipts.length > 4) return json({ error: 'bad_request' }, 400);
  const db = adb(), ci = cycleInfo(g);

  const me = (await db.doc('users/' + u.uid).get()).data() || {}, names = String(me.name || '').toLowerCase().split(/\s+/);
  if (me.verified !== true) return json({ error: 'not_verified' }, 403);
  const required = (g.amount + (g.packingFee || 0) + (ci.late ? g.lateFee || 0 : 0)) * n;
  const rows = []; let total = 0, unread = false;
  for (const q of receipts) {
    const img = String((q && q.img) || '');
    if (!img.startsWith('data:image/') || img.length > 700000) return json({ error: 'bad_image' }, 400);
    const hash = sha(img);
    if (q.hash !== hash) return json({ error: 'bad_image' }, 400);
    const r = q.x && q.sig && q.sig === sigOf(hash, q.x) ? q.x : null;
    const x = r && { amount: r.amount ?? null, date: r.date ?? null, senderName: r.senderName ?? null, reference: r.reference ?? null, bank: r.bank ?? null, suspicious: !!r.suspicious, reason: String(r.reason || '').slice(0, 160) };
    const flags = [];
    if ((await db.doc(`groups/${gid}/refs/${hash}`).get()).exists) flags.push('same image used before');
    if (x && x.reference && (await db.doc(`groups/${gid}/refs/r_${safeId(x.reference)}`).get()).exists) flags.push('reference already used');
    if (x && x.suspicious) flags.push('looks edited: ' + x.reason);
    if (x && x.date && new Date(x.date).getTime() < ci.due - 864e5 * (g.frequencyDays || 1)) flags.push('receipt date looks old');
    if (x && x.senderName && !names.some((t) => t.length > 2 && x.senderName.toLowerCase().includes(t))) flags.push('sender name differs');
    if (!x || x.amount == null) { flags.push('could not be read'); unread = true; } else total += +x.amount || 0;
    rows.push({ img, hash, x, flags });
  }
  if (!unread && total < required) return json({ error: 'short', total, required }, 400);

  const b = db.batch(), cref = db.collection(`groups/${gid}/contributions`).doc(), at = Date.now();
  b.set(cref, { uid: u.uid, name: me.name || 'Member', cycle: ci.k, count: n, required, late: ci.late, status: 'pending', createdAt: at });
  b.set(db.collection(`groups/${gid}/messages`).doc(), { type: 'system', kind: 'submitted', text: (me.name || 'A member') + ' submitted payment', amount: required, uid: u.uid, at });
  for (const q of rows) {
    b.set(db.collection(`groups/${gid}/receipts`).doc(), { uid: u.uid, cid: cref.id, image: q.img, hash: q.hash, extracted: q.x, flags: q.flags, createdAt: at });
    b.set(db.doc(`groups/${gid}/refs/${q.hash}`), { uid: u.uid });
    if (q.x && q.x.reference) b.set(db.doc(`groups/${gid}/refs/r_${safeId(q.x.reference)}`), { uid: u.uid });
  }
  await b.commit();
  await push([g.adminId], { title: g.name, body: (me.name || 'A member') + ' sent a receipt for you to confirm.', link: '/g/' + gid });
  return json({ ok: true });
}
