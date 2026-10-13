import { auth } from '@/lib/firebase';
// Fire-and-forget: asks the server to push a notification about a group event.
export async function notify(event, gid, target, kind) {
  try {
    const t = await auth.currentUser.getIdToken();
    fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ event, gid, target, kind }) });
  } catch {}
}
