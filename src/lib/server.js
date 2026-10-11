import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cfg } from '@/lib/config';
import { adb } from '@/lib/admin';

export const json = (o, status = 200) => NextResponse.json(o, { status });
export const platformFee = () => +process.env.PLATFORM_LATE_FEE || 100; // naira, goes to the platform
const secret = () => process.env.SIGNING_SECRET || process.env.CRON_SECRET || 'conmonie-dev';
export const sign = (s) => crypto.createHmac('sha256', secret()).update(s).digest('hex');
export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Proves a receipt reading came from our own server for exactly that image.
export const sigOf = (hash, x) => sign([hash, x.amount ?? '', x.date ?? '', x.senderName ?? '', x.reference ?? '', x.suspicious ? 1 : 0].join('|'));
export const safeId = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 100);
export const lateDocPath = (gid, uid, k) => `groups/${gid}/lateFees/${uid}_${k}`;

export async function authUser(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const v = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + cfg.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) });
  if (!v.ok) return null;
  const u = (await v.json()).users?.[0];
  return u ? { uid: u.localId, email: u.email } : null;
}
export async function loadGroup(gid, uid) {
  if (!gid) return null;
  const g = (await adb().doc('groups/' + gid).get()).data();
  return g && g.members.includes(uid) ? g : null;
}
export async function acctOf(gid, g) {
  const p = await adb().doc(`groups/${gid}/private/acct`).get();
  return p.exists ? p.data() : g.acct || null; // older groups still hold it on the group until the cron moves it
}
export const isStaff = async (uid) => ((await adb().doc('users/' + uid).get()).data() || {}).staff === true;
