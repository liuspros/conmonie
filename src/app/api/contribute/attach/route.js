import { adb, push, adminReady } from '@/lib/admin';
import { authUser, loadGroup, sha, sigOf, safeId, json } from '@/lib/server';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Adds more receipts to a payment that is still pending (for example a deposit made earlier). The admin is notified and can
// confirm it once the balance is in.
export async function POST(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const { gid, cid, receipts } = await req.json().catch(() => ({})), g = await loadGroup(gid, u.uid);
  if (!g || !cid) return json({ error: 'forbidden' }, 403);
  if (!Array.isArray(receipts) || receipts.length < 1 || receipts.length > 4) return json({ error: 'bad_request' }, 400);
  const db = adb(), cref = db.doc(`groups/${gid}/contributions/${cid}`), c = (await cref.get()).data();
  if (!c || c.uid !== u.uid) return json({ error: 'forbidden' }, 403);
  if (c.status !== 'pending') return json({ code: 'NOT_PENDING', error: 'That payment has already been decided. Start a new payment instead.' }, 409);
  const me = (await db.doc('users/' + u.uid).get()).data() || {}, names = String(me.name || '').toLowerCase().split(/\s+/);
  const rows = []; let add = 0, unread = false;
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
    if (x && x.senderName && !names.some((t) => t.length > 2 && x.senderName.toLowerCase().includes(t))) flags.push('sender name differs');
    if (!x || x.amount == null) { flags.push('could not be read'); unread = true; } else add += +x.amount || 0;
    rows.push({ img, hash, x, flags });
  }
  const received = (c.received || 0) + add, at = Date.now(), b = db.batch();
  b.update(cref, { received, partial: received < c.required, updatedAt: at, receiptCount: (c.receiptCount || 1) + rows.length, held: false, ...(unread ? { needsCheck: true } : {}) });
  for (const q of rows) {
    b.set(db.collection(`groups/${gid}/receipts`).doc(), { uid: u.uid, cid, image: q.img, hash: q.hash, extracted: q.x, flags: q.flags, createdAt: at, addedLater: true });
    b.set(db.doc(`groups/${gid}/refs/${q.hash}`), { uid: u.uid });
    if (q.x && q.x.reference) b.set(db.doc(`groups/${gid}/refs/r_${safeId(q.x.reference)}`), { uid: u.uid });
  }
  b.set(db.collection(`groups/${gid}/messages`).doc(), { type: 'system', kind: 'attached', text: (me.name || 'A member') + ' added another receipt to a pending payment', amount: add || null, uid: u.uid, at });
  await b.commit();
  await push([g.adminId], { title: g.name, body: (me.name || 'A member') + ' added another receipt to their pending payment (' + (received >= c.required ? 'now fully paid' : '\u20A6' + received.toLocaleString('en-NG') + ' of \u20A6' + c.required.toLocaleString('en-NG')) + ').', link: '/g/' + gid });
  return json({ ok: true, received, required: c.required });
}
