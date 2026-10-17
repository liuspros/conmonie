import { NextResponse } from 'next/server';
import { cfg } from '@/lib/config';
import { adb, push, adminReady } from '@/lib/admin';
export const runtime = 'nodejs';

// The server builds the wording, so a client can only trigger known events for groups it belongs to.
export async function POST(req) {
  if (!adminReady()) return NextResponse.json({ error: 'not_configured' }, { status: 501 });
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const v = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + cfg.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) });
  const uid = v.ok ? (await v.json()).users?.[0]?.localId : null;
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { event, gid, target, kind } = await req.json(), goal = kind === 'goal';
  const g = (await adb().doc((goal ? 'goals/' : 'groups/') + gid).get()).data();
  if (!g || !g.members.includes(uid)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const adminId = g.adminId || g.organizerId, link = (goal ? '/goal/' : '/g/') + gid, title = g.name, admin = uid === adminId;
  let to = [], body = '';
  if (event === 'submitted') { const n = ((await adb().doc('users/' + uid).get()).data() || {}).name || 'A member'; to = [adminId]; body = n + ' sent a receipt for you to confirm.'; }
  else if (admin && g.members.includes(target) && event === 'confirmed') { to = [target]; body = 'Your contribution was confirmed by the admin.'; }
  else if (admin && g.members.includes(target) && event === 'rejected') { to = [target]; body = 'Your receipt was not accepted. Open the group to see why.'; }
  else if (admin && g.members.includes(target) && event === 'packed') { to = [target]; body = 'The admin has paid you for this round. Check your account.'; }
  else if (admin && g.members.includes(target) && event === 'held') { to = [target]; body = 'Your admin is holding your payment as pending. Open the group to see the balance and add another receipt.'; }
  else return NextResponse.json({ error: 'bad_event' }, { status: 400 });
  return NextResponse.json({ sent: await push(to, { title, body, link }) });
}
