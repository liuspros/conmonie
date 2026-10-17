import { adminReady } from '@/lib/admin';
import { psReady, settleBilling } from '@/lib/billing';
import { authUser, json } from '@/lib/server';
export const runtime = 'nodejs';
export async function POST(req) {
  if (!adminReady() || !psReady()) return json({ error: 'not_configured' }, 501);
  const u = await authUser(req); if (!u) return json({ error: 'unauthorized' }, 401);
  const { reference } = await req.json().catch(() => ({}));
  const m = reference ? await settleBilling(String(reference)) : null;
  return m && m.uid === u.uid ? json({ ok: true, until: m.until || null }) : json({ error: 'not_paid' }, 402);
}
