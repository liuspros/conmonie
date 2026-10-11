import { auth } from '@/lib/firebase';
// Calls our own server routes with the signed-in user's token. Errors carry the server's reply in err.data.
export async function api(path, body) {
  const t = await auth.currentUser.getIdToken();
  const r = await fetch(path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + t, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'error'), { data: j, status: r.status });
  return j;
}
