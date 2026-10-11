import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { cfg } from '@/lib/config';
import { adb } from '@/lib/admin';

export const json = (o, status = 200) => NextResponse.json(o, { status });
const secret = () => process.env.SIGNING_SECRET || process.env.CRON_SECRET || 'conmonie-dev';
export const sign = (s) => crypto.createHmac('sha256', secret()).update(s).digest('hex');
export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Proves a receipt reading came from our own server for exactly that image.
export const sigOf = (hash, x) => sign([hash, x.amount ?? '', x.date ?? '', x.senderName ?? '', x.reference ?? '', x.suspicious ? 1 : 0].join('|'));
export const safeId = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 100);

export async function authUser(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const v = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + cfg.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) });
  if (!v.ok) return null;
  const u = (await v.json()).users?.[0];
  return u ? { uid: u.localId, email: u.email || null, phone: u.phoneNumber || null } : null;
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
export const isVerified = async (uid) => ((await adb().doc('users/' + uid).get()).data() || {}).verified === true;

// A member's track record, worked out on the server so it cannot be faked.
export async function statsFor(uid) {
  const db = adb(), gs = (await db.collection('groups').where('members', 'array-contains', uid).get()).docs;
  let best = 0, confirmed = 0, late = 0;
  for (const g of gs) {
    best = Math.max(best, ((await db.doc(`groups/${g.id}/members/${uid}`).get()).data() || {}).best || 0);
    const cs = (await db.collection(`groups/${g.id}/contributions`).where('uid', '==', uid).get()).docs.map((d) => d.data());
    confirmed += cs.filter((c) => c.status === 'confirmed').length;
    late += cs.filter((c) => c.status === 'confirmed' && c.late).length;
  }
  return { groups: gs.length, bestStreak: best, confirmed, late };
}
