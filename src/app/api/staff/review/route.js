import { adb, push, adminReady } from '@/lib/admin';
import { authUser, isStaff, json } from '@/lib/server';
export const runtime = 'nodejs';

export async function POST(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req);
  if (!u || !(await isStaff(u.uid))) return json({ error: 'forbidden' }, 403);
  const { uid, decision, note } = await req.json().catch(() => ({})), db = adb();
  const v = (await db.doc('verifications/' + uid).get()).data();
  if (!v || v.status !== 'pending' || !['approve', 'reject'].includes(decision)) return json({ error: 'bad_request' }, 400);
  const ok = decision === 'approve', at = Date.now(), why = String(note || '').slice(0, 200), b = db.batch();
  b.update(db.doc('verifications/' + uid), { status: ok ? 'approved' : 'rejected', decidedAt: at, decidedBy: u.uid, note: why });
  b.set(db.doc('users/' + uid), ok ? { verified: true, verifyStatus: 'verified', verifiedAt: at, legalName: v.legalName } : { verified: false, verifyStatus: 'rejected' }, { merge: true });
  for (const k of ['selfie', 'id', 'statement']) b.delete(db.doc(`verifications/${uid}/files/${k}`)); // images are deleted once reviewed
  await b.commit();
  await push([uid], { title: 'Identity check', body: ok ? 'You are now verified.' : 'Your identity check was not approved' + (why ? ': ' + why : '.') + ' You can try again.', link: '/me' });
  return json({ ok: true });
}
