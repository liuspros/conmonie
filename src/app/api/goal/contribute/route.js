import { adb, push, adminReady } from '@/lib/admin';
import { authUser, loadGoal, sha, sigOf, safeId, json } from '@/lib/server';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Every ConGoal contribution is created here, so receipts, amounts and duplicates are checked on the server.
export async function POST(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const { gid, amount, receipts } = await req.json().catch(() => ({})), g = await loadGoal(gid, u.uid);
  if (!g) return json({ error: 'forbidden' }, 403);
  const amt = Math.floor(+amount);
  if (!(amt >= 100 && amt <= 5000000) || !Array.isArray(receipts) || receipts.length < 1 || receipts.length > 4) return json({ error: 'bad_request' }, 400);
  if (g.status === 'closed') return json({ error: 'closed' }, 409);
  const db = adb(), me = (await db.doc('users/' + u.uid).get()).data() || {}, names = String(me.name || '').toLowerCase().split(/\s+/);
  if (me.verified !== true) return json({ error: 'not_verified' }, 403);
  const rows = []; let total = 0, unread = false;
  for (const q of receipts) {
    const img = String((q && q.img) || '');
    if (!img.startsWith('data:image/') || img.length > 700000) return json({ error: 'bad_image' }, 400);
    const hash = sha(img);
    if (q.hash !== hash) return json({ error: 'bad_image' }, 400);
    const r = q.x && q.sig && q.sig === sigOf(hash, q.x) ? q.x : null;
    const x = r && { amount: r.amount ?? null, date: r.date ?? null, senderName: r.senderName ?? null, reference: r.reference ?? null, bank: r.bank ?? null, suspicious: !!r.suspicious, reason: String(r.reason || '').slice(0, 160) };
    const flags = [];
    if ((await db.doc(`goals/${gid}/refs/${hash}`).get()).exists) flags.push('same image used before');
    if (x && x.reference && (await db.doc(`goals/${gid}/refs/r_${safeId(x.reference)}`).get()).exists) flags.push('reference already used');
    if (x && x.suspicious) flags.push('looks edited: ' + x.reason);
    if (x && x.date && new Date(x.date).getTime() < Date.now() - 14 * 864e5) flags.push('receipt date looks old');
    if (x && x.senderName && !names.some((t) => t.length > 2 && x.senderName.toLowerCase().includes(t))) flags.push('sender name differs');
    if (!x || x.amount == null) { flags.push('could not be read'); unread = true; } else total += +x.amount || 0;
    rows.push({ img, hash, x, flags });
  }
  if (!unread && total < amt) return json({ error: 'short', total, required: amt }, 400);
  const b = db.batch(), cref = db.collection(`goals/${gid}/contributions`).doc(), at = Date.now();
  b.set(cref, { uid: u.uid, name: me.name || 'Member', amount: amt, status: 'pending', createdAt: at });
  b.set(db.collection(`goals/${gid}/messages`).doc(), { type: 'system', kind: 'submitted', text: (me.name || 'A member') + ' submitted a contribution', amount: amt, uid: u.uid, at });
  for (const q of rows) {
    b.set(db.collection(`goals/${gid}/receipts`).doc(), { uid: u.uid, cid: cref.id, image: q.img, hash: q.hash, extracted: q.x, flags: q.flags, createdAt: at });
    b.set(db.doc(`goals/${gid}/refs/${q.hash}`), { uid: u.uid });
    if (q.x && q.x.reference) b.set(db.doc(`goals/${gid}/refs/r_${safeId(q.x.reference)}`), { uid: u.uid });
  }
  await b.commit();
  await push([g.organizerId], { title: g.name, body: (me.name || 'A member') + ' sent a contribution for you to confirm.', link: '/goal/' + gid });
  return json({ ok: true });
}
