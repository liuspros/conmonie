import crypto from 'crypto';
import { adminReady } from '@/lib/admin';
import { psReady, settle } from '@/lib/paystack';
import { json } from '@/lib/server';
export const runtime = 'nodejs';

// Set this URL in Paystack > Settings > API Keys & Webhooks. Requests without a valid signature are ignored.
export async function POST(req) {
  if (!adminReady() || !psReady()) return json({ error: 'not_configured' }, 501);
  const raw = await req.text();
  const sig = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  if (sig !== req.headers.get('x-paystack-signature')) return json({ error: 'bad_signature' }, 401);
  const ev = JSON.parse(raw);
  if (ev.event === 'charge.success' && ev.data && ev.data.reference) await settle(ev.data.reference);
  return json({ ok: true });
}
