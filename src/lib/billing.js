import { Timestamp } from 'firebase-admin/firestore';
import { adb, push } from '@/lib/admin';
import { PRO_PRICE, PRO_DAYS, proUntil } from '@/lib/plans';

const PS = 'https://api.paystack.co';
const H = () => ({ Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET_KEY, 'Content-Type': 'application/json' });
export const psReady = () => !!process.env.PAYSTACK_SECRET_KEY;
const call = async (path, body) => (await fetch(PS + path, { method: body ? 'POST' : 'GET', headers: H(), body: body ? JSON.stringify(body) : undefined })).json();
export const psInit = (b) => call('/transaction/initialize', b);   // hosted checkout: returns authorization_url, access_code, reference
export const psCharge = (b) => call('/charge', b);                 // Charge API: used for a dedicated transfer account
export const psVerify = (ref) => call('/transaction/verify/' + encodeURIComponent(ref));

// Paystack's reply shape for transfer details can vary, so look for the account number anywhere in the response.
export function pickTransfer(r) {
  const d = (r && r.data) || {};
  const find = (o, depth = 0) => { if (!o || typeof o !== 'object' || depth > 4) return null; if (o.account_number) return o; for (const k of Object.keys(o)) { const x = find(o[k], depth + 1); if (x) return x; } return null; };
  const t = find(d); if (!t) return null;
  return { number: String(t.account_number), name: t.account_name || '', bank: typeof t.bank === 'string' ? t.bank : (t.bank && t.bank.name) || t.bank_name || '', expiresAt: t.account_expires_at || t.expires_at || null, reference: d.reference || t.reference || null };
}

// Keeps each group's "creator is Pro" snapshot in step with the creator's plan.
export async function syncSnapshots(uid, pro) {
  const s = await adb().collection('groups').where('adminId', '==', uid).get();
  if (s.empty) return;
  const b = adb().batch(); s.docs.forEach((d) => b.update(d.ref, { creatorIsProSnapshot: pro })); await b.commit();
}
export async function activatePro(uid, days = PRO_DAYS) {
  const ref = adb().doc('users/' + uid), cur = (await ref.get()).data() || {};
  const until = Math.max(Date.now(), proUntil(cur) || 0) + days * 864e5;
  await ref.set({ isPro: true, proExpiresAt: Timestamp.fromMillis(until) }, { merge: true });
  await syncSnapshots(uid, true);
  await push([uid], { title: 'Conmonie Pro', body: 'Pro is active until ' + new Date(until).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) + '.', link: '/pro' });
  return until;
}
// Runs from the return page and from the webhook. Only a Paystack-confirmed payment of at least the price activates Pro, and each
// reference is counted once.
export async function settleBilling(reference) {
  const j = await psVerify(reference), d = j && j.data;
  if (!j || !j.status || !d || d.status !== 'success') return null;
  const m = d.metadata || {};
  if (m.purpose !== 'pro' || !m.uid) return null;
  const months = Math.max(1, Math.min(12, +m.months || 1));
  if (d.amount < PRO_PRICE * 100 * months) return null;
  try { await adb().doc('billing/' + String(reference).replace(/[^A-Za-z0-9_-]/g, '_')).create({ uid: m.uid, amount: d.amount / 100, months, at: Date.now() }); }
  catch { return { uid: m.uid, already: true }; }
  return { uid: m.uid, until: await activatePro(m.uid, PRO_DAYS * months) };
}
