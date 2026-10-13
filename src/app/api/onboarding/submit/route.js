import { adb, adminReady } from '@/lib/admin';
import { authUser, json } from '@/lib/server';
import { nameMatches } from '@/lib/statement';
import { normalizePhone } from '@/lib/phone';
import { AGREEMENT_VERSION } from '@/lib/agreement';
import { FACE_MAX, STATEMENT_MAX_DAYS, ALLOW_TYPED_ADDRESS } from '@/lib/limits';
export const runtime = 'nodejs';
export const maxDuration = 30;

const EDITORS = /photoshop|canva|ilovepdf|smallpdf|sejda|pdfescape|pdf24|illustrator|inkscape|wps|foxit.*editor/i;

// Automatic approval. The post date, statement and signature are re-checked here; the face scores come from the phone, so the stored
// selfie, ID and statement page are kept as evidence (see the agreement). Nothing here is reviewed by a person.
export async function POST(req) {
  if (!adminReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const b = await req.json().catch(() => ({})), sc = b.scores || {}, st = b.statement || {}, tc = b.trustedContact || {};
  const img = (s, max) => typeof s === 'string' && s.startsWith('data:image/') && s.length <= max;
  if (!img(b.selfie, 200000) || !img(b.id, 700000) || !img(b.stmt, 700000) || !b.legalName || String(b.legalName).length > 80) return json({ error: 'bad_request' }, 400);

  const why = [], wa = normalizePhone(b.whatsapp), tcPhone = normalizePhone(tc.phone);
  if (!u.phone) why.push('Verify your phone number with the code we send you.');
  if (!wa) why.push('Enter a valid WhatsApp number.');
  if (String(tc.name || '').trim().length < 3 || !tcPhone || tcPhone === u.phone) why.push('Add a trusted contact with their own phone number.');
  if (!sc.liveness) why.push('The live check was not completed.');
  if (!(+sc.distance <= FACE_MAX)) why.push('Your face did not match the photo on your ID. Retake both in good light.');
  if (!st.isPdf) why.push('Upload your bank statement as a PDF.');
  if (!st.name || !nameMatches(st.name, b.legalName)) why.push('The name on the statement does not match your legal name.');
  if (String(st.address || '').trim().length < 8) why.push('We need your home address.');
  if (st.addressSource === 'typed' && !ALLOW_TYPED_ADDRESS) why.push('The address must be printed on your bank statement.');
  const age = st.date ? (Date.now() - Date.parse(st.date)) / 864e5 : null;
  if (age == null || isNaN(age) || age > STATEMENT_MAX_DAYS || age < -1) why.push('The statement must be from the last 3 months.');
  if (EDITORS.test(String(st.producer || '') + ' ' + String(st.creator || ''))) why.push('The PDF looks like it was edited. Download it again from your bank app.');
  if (!b.agree || !nameMatches(String(b.signedName || ''), b.legalName)) why.push('Type your full legal name exactly as above to sign the agreement.');
  if (why.length) return json({ ok: false, reasons: why }, 422);

  const db = adb(), cut = (v, n) => String(v || '').slice(0, n), now = Date.now(), legalName = cut(b.legalName, 80).trim();
  const me = (await db.doc('users/' + u.uid).get()).data() || {};
  const toks = legalName.split(/\s+/), display = toks.length > 1 ? toks[0] + ' ' + toks[toks.length - 1] : legalName;
  const batch = db.batch();
  batch.set(db.doc('verifications/' + u.uid), {
    status: 'approved', legalName, phone: u.phone, whatsapp: wa, trustedContact: { name: cut(tc.name, 80), phone: tcPhone, relation: cut(tc.relation, 40) }, authEmail: u.email, submittedAt: now, verifiedAt: now,
    scores: { distance: +sc.distance, liveness: true },
    statement: { name: cut(st.name, 100), address: cut(st.address, 250), addressSource: st.addressSource === 'typed' ? 'typed' : 'statement', date: cut(st.date, 40), producer: cut(st.producer, 100), creator: cut(st.creator, 100) },
    agreement: { version: AGREEMENT_VERSION, signedName: cut(b.signedName, 80), at: now, ip: cut((req.headers.get('x-forwarded-for') || '').split(',')[0], 60), userAgent: cut(req.headers.get('user-agent'), 200) },
  });
  batch.set(db.doc(`verifications/${u.uid}/files/selfie`), { data: b.selfie });
  batch.set(db.doc(`verifications/${u.uid}/files/id`), { data: b.id });
  batch.set(db.doc(`verifications/${u.uid}/files/statement`), { data: b.stmt });
  batch.set(db.doc('users/' + u.uid), { verified: true, verifyStatus: 'verified', verifiedAt: now, ...(me.name ? {} : { name: display }) }, { merge: true });
  await batch.commit();
  return json({ ok: true });
}
