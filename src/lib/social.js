import { POST_MAX_DAYS } from '@/lib/limits';

// Phone numbers: Nigerian numbers may start with 0, 234 or +234. Returns +E.164 or null.
export function normalizePhone(s) {
  let d = String(s || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1); else if (d.startsWith('0')) d = '234' + d.slice(1); else if (d.length === 10) d = '234' + d;
  return /^\d{11,15}$/.test(d) && (!d.startsWith('234') || d.length === 13) ? '+' + d : null;
}

// X, TikTok, Instagram and LinkedIn post ids contain the time the post was made, so we can check "posted in the last 30 days"
// without logging in to those apps. (Ownership of the post cannot be proven this way.)
const B = (n) => BigInt(n), IG = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export function igTime(code) {
  let id = B(0);
  for (const ch of code.slice(0, 11)) { const i = IG.indexOf(ch); if (i < 0) return null; id = id * B(64) + B(i); }
  return Number((id >> B(23)) + B('1314220021721'));
}
const toUrl = (s) => { try { const u = new URL(String(s || '').trim()); return /^https?:$/.test(u.protocol) ? u : null; } catch { return null; } };
const host = (u) => u.hostname.replace(/^(www|m|mobile|vm)\./, '').toLowerCase();

export function checkPost(profileUrl, postUrl, now = Date.now()) {
  const pu = toUrl(profileUrl), po = toUrl(postUrl);
  if (!pu || !po) return { ok: false, reason: 'Enter both links, starting with https://' };
  const hp = host(pu), hq = host(po), path = po.pathname;
  let platform, ms = null, handle = null, same;
  if (/^(x|twitter)\.com$/.test(hq)) { const m = path.match(/^\/([^/]+)\/status\/(\d+)/); if (m) { platform = 'X'; handle = m[1].toLowerCase(); ms = Number((B(m[2]) >> B(22)) + B('1288834974657')); } same = /^(x|twitter)\.com$/.test(hp); }
  else if (hq === 'instagram.com') { const m = path.match(/^\/(?:([^/]+)\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/); if (m) { platform = 'Instagram'; handle = m[1] && !['p', 'reel', 'reels', 'tv'].includes(m[1]) ? m[1].toLowerCase() : null; ms = igTime(m[2]); } same = hp === 'instagram.com'; }
  else if (hq === 'tiktok.com') { const m = path.match(/^\/@([^/]+)\/video\/(\d+)/); if (m) { platform = 'TikTok'; handle = m[1].toLowerCase(); ms = Number(B(m[2]) >> B(32)) * 1000; } same = hp === 'tiktok.com'; }
  else if (hq === 'linkedin.com') { const m = (po.pathname + po.search).match(/activity[-:](\d{15,})/); if (m) { platform = 'LinkedIn'; ms = Number(B(m[1]) >> B(22)); } same = hp === 'linkedin.com'; }
  else return { ok: false, reason: 'Use a post from X, Instagram, TikTok or LinkedIn.' };
  if (!platform) return { ok: false, reason: 'That does not look like a link to a single post. Open the post and copy its link.' };
  if (!same) return { ok: false, reason: 'Your profile link and your post must be on the same app.' };
  const first = pu.pathname.split('/').filter(Boolean)[0];
  if (handle && first && first.replace(/^@/, '').toLowerCase() !== handle) return { ok: false, reason: 'That post is not from the profile you entered.' };
  if (!ms || isNaN(ms)) return { ok: false, reason: 'We could not read the date of that post. Try another post.' };
  const age = (now - ms) / 864e5;
  if (age < -1) return { ok: false, reason: 'We could not read the date of that post. Try another post.' };
  if (age > POST_MAX_DAYS) return { ok: false, reason: 'That post is older than ' + POST_MAX_DAYS + ' days. Pick one you posted recently.' };
  return { ok: true, data: { platform, profileUrl: pu.href, postUrl: po.href, postedAt: ms, daysAgo: Math.max(0, Math.round(age)) } };
}
