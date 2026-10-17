import { adminReady } from '@/lib/admin';
import { psReady, psInit } from '@/lib/billing';
import { authUser, json } from '@/lib/server';
import { PRO_PRICE } from '@/lib/plans';
export const runtime = 'nodejs';

// Hosted checkout fallback. The amount is set here, never taken from the browser. Paystack's `mobile_money` channel only covers
// Ghana and Kenya, so for Nigerian naira we allow `bank_transfer` and `bank` (Pay with Bank, which includes OPay).
export async function POST(req) {
  if (!adminReady() || !psReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const raw = await psInit({ email: u.email || u.uid + '@pay.conmonie.app', amount: PRO_PRICE * 100, currency: 'NGN', channels: ['bank_transfer', 'bank'], callback_url: new URL(req.url).origin + '/pro', metadata: { purpose: 'pro', uid: u.uid, months: 1 } });
  return json(raw, raw && raw.status ? 200 : 502);
}
