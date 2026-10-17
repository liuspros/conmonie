import { adminReady } from '@/lib/admin';
import { psReady, psCharge, pickTransfer } from '@/lib/billing';
import { authUser, json } from '@/lib/server';
import { PRO_PRICE } from '@/lib/plans';
export const runtime = 'nodejs';

// Custom bank-transfer desk: asks Paystack's Charge API for a dedicated account number for this payment (valid 30 minutes).
// This needs "Pay with Transfer" to be enabled on your Paystack account; if it is not, the reply says so and the app falls back.
export async function POST(req) {
  if (!adminReady() || !psReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const expires = new Date(Date.now() + 30 * 60000).toISOString();
  const raw = await psCharge({ email: u.email || u.uid + '@pay.conmonie.app', amount: PRO_PRICE * 100, bank_transfer: { account_expires_at: expires }, metadata: { purpose: 'pro', uid: u.uid, months: 1 } });
  const t = raw && raw.status ? pickTransfer(raw) : null;
  if (!t) return json({ error: 'transfer_not_available', message: (raw && raw.message) || 'Bank transfer details are not available right now.' }, 502);
  return json({ ok: true, amount: PRO_PRICE, account: { ...t, expiresAt: t.expiresAt || expires } });
}
