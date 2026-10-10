import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

export const adminReady = () => !!process.env.FIREBASE_SERVICE_ACCOUNT;
const app = () => getApps()[0] || initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
export const adb = () => getFirestore(app());

export async function push(uids, { title, body, link }) {
  const db = adb(); let sent = 0;
  for (const uid of [...new Set(uids)].filter(Boolean)) {
    await db.collection('users/' + uid + '/notifications').add({ title, body, link: link || '/', at: Date.now(), read: false });
    const ref = db.doc('users/' + uid), tokens = ((await ref.get()).data() || {}).fcmTokens || [];
    if (!tokens.length) continue;
    const r = await getMessaging(app()).sendEachForMulticast({ tokens, data: { title, body, link: link || '/' }, webpush: { headers: { Urgency: 'high' } } });
    const dead = tokens.filter((_, i) => !r.responses[i].success && /not-registered|invalid/.test(r.responses[i].error?.code || ''));
    if (dead.length) await ref.update({ fcmTokens: FieldValue.arrayRemove(...dead) });
    sent += r.successCount;
  }
  return sent;
}
