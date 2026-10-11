import { adb } from '@/lib/admin';
import { lateDocPath, safeId } from '@/lib/server';

const PS = 'https://api.paystack.co';
const H = () => ({ Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type': 'application/json' });
export const psReady = () => !!process.env.PAYSTACK_SECRET_KEY;
export const psInit = async (body) => (await fetch(PS + '/transaction/initialize', { method: 'POST', headers: H(), body: JSON.stringify(body) })).json();
export const psVerify = async (ref) => (await fetch(PS + '/transaction/verify/' + encodeURIComponent(ref), { headers: H() })).json();

// Called from both the return page and the webhook; safe to run twice. Only a Paystack-confirmed payment unlocks anything.
export async function settle(reference) {
  const j = await psVerify(reference), d = j && j.data;
  if (!j || !j.status || !d || d.status !== 'success') return null;
  const m = d.metadata || {};
  if (m.purpose !== 'late_fee' || !m.gid || !m.uid || m.cycle == null || d.amount < (+m.fee || 0) * 100) return null;
  const db = adb(), at = Date.now();
  await db.doc(lateDocPath(m.gid, m.uid, m.cycle)).set({ reference, amount: d.amount / 100, at }, { merge: true });
  await db.doc('fees/' + safeId(reference)).set({ gid: m.gid, uid: m.uid, cycle: m.cycle, amount: d.amount / 100, kind: 'late_fee', at }, { merge: true });
  return m;
}
