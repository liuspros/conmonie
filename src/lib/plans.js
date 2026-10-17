// Conmonie Free vs Pro. The price is shown in the app and checked on the server, so change it in one place (Vercel env or here).
export const PRO_PRICE = +process.env.NEXT_PUBLIC_PRO_PRICE || 2000; // naira per month
export const PRO_DAYS = 30;
export const FREE = { groupMembers: 5, joinedGroups: 10 };
export const CREATOR_LIMIT_MSG = 'This free-tier group has reached its maximum capacity of 5 members.';
export const JOIN_LIMIT_MSG = 'Free accounts can join up to 10 groups. Upgrade to Conmonie Pro to join more.';
const ms = (t) => (t == null ? null : typeof t === 'number' ? t : typeof t.toMillis === 'function' ? t.toMillis() : t.seconds != null ? t.seconds * 1000 : t._seconds != null ? t._seconds * 1000 : null);
export const proUntil = (u) => ms(u && u.proExpiresAt);
// Pro is on while the flag is set and the expiry (if any) is still in the future.
export const proActive = (u, now = Date.now()) => !!u && u.isPro === true && (proUntil(u) == null || proUntil(u) > now);
