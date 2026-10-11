import { adb, adminReady } from '@/lib/admin';
import { authUser, json } from '@/lib/server';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Identity check submission. The browser's face and statement checks are only a pre-screen: nothing becomes "Verified" until a staff member approves.
export async function POST(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const b = await req.json().catch(() => ({}));
  const img = (s, max) => typeof s === 'string' && s.startsWith('data:image/') && s.length <= max;
  if (!img(b.selfie, 200000) || !img(b.id, 700000) || !img(b.stmt, 700000) || !b.legalName || String(b.legalName).length > 80) return json({ error: 'bad_request' }, 400);
  const db = adb(), cur = (await db.doc('verifications/' + u.uid).get()).data();
  if (cur && (cur.status === 'pending' || cur.status === 'approved')) return json({ error: 'already' }, 409);
  const sc = b.scores || {}, st = b.statement || {}, cut = (v, n) => String(v || '').slice(0, n);
  const batch = db.batch();
  batch.set(db.doc('verifications/' + u.uid), {
    status: 'pending', legalName: cut(b.legalName, 80).trim(), submittedAt: Date.now(),
    flags: (Array.isArray(b.flags) ? b.flags : []).slice(0, 12).map((s) => cut(s, 120)),
    scores: { distance: +sc.distance || null, liveness: !!sc.liveness },
    statement: { name: cut(st.name, 100), address: cut(st.address, 250), date: cut(st.date, 40), isPdf: !!st.isPdf, producer: cut(st.producer, 100) },
  });
  batch.set(db.doc(`verifications/${u.uid}/files/selfie`), { data: b.selfie });
  batch.set(db.doc(`verifications/${u.uid}/files/id`), { data: b.id });
  batch.set(db.doc(`verifications/${u.uid}/files/statement`), { data: b.stmt });
  batch.set(db.doc('users/' + u.uid), { verifyStatus: 'pending' }, { merge: true });
  await batch.commit();
  return json({ ok: true });
}
