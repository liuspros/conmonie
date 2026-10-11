import Icon from '@/components/Icon';
export const metadata = { title: 'How it works | Conmonie' };
const S = [
  ['users', 'What is an Ajo?', ['An Ajo (also called Esusu or Adashe) is a savings circle. A group of people each pay the same amount on a schedule, and every round one member collects the whole pot. Round after round, everyone gets their turn.', 'Conmonie is the notebook and the referee: the member list, the schedule, receipts, reminders and records. Conmonie never holds your money. You pay the group admin directly.']],
  ['shield', 'Getting started', ['Sign in with Google, your phone number or email. Then verify your identity once: your WhatsApp number, a recent social media post, your ID, a live selfie and a bank statement, then you sign the member agreement.', 'This is how every member knows everyone else is real. You cannot join or create an Ajo until it is done.']],
  ['link', 'Joining a group', ['Three ways: open an invite link from the admin, scan the group\'s QR code (use Scan on Home or any phone camera), or find a public group in Explore and send a request.', 'For public groups the admin decides. They can see your verified badge and your record: best streak, groups, confirmed payments and late payments.']],
  ['plus', 'Creating a group', ['Tap Create on Home. Set the contribution, how often a round runs, the due time, any late fee or packing fee, and the bank account members will pay into. Add a description and a photo.', 'Share the invite link or the QR code, or switch on "Show in Explore" so people can request to join.']],
  ['card', 'Paying your contribution', ['1. Open the group and tap Pay contribution.', '2. Choose how many contributions you are sending. The amount, including any fees, is shown.', '3. Copy the account number and pay from your bank app.', '4. Upload your payment receipt. We read the amount and name. If you paid too little, we tell you how much is short. You can upload more than one receipt.', '5. Tap Submit. The admin is notified.']],
  ['check', 'After you pay', ['Your admin checks the payment against their bank alert and taps Mark contribution. You get a notification, a confirmation in the group, and your streak grows if you paid on time.', 'If a receipt is rejected, the admin gives a reason and you can send a new one.']],
  ['swap', 'Packing day', ['Each round one member is the packer, the person who is paid. Their name and account are pinned in the group on that day and the admin is reminded to pay them. The admin can change the packing order in Group info.']],
  ['clock', 'Late payments', ['Each group has a due time. After it, a payment is late. Your admin may add a late fee. Late payments reset your streak and show on your record.']],
  ['bell', 'Notifications', ['Turn them on in Me. You get reminders before payments are due, a notice when your payment is confirmed, and requests to approve if you are an admin. The bell on Home keeps a history.']],
  ['doc', 'Receipts and records', ['Open Activities to see every payment you made. Tap one to get a receipt you can share or download as an image.']],
  ['lock', 'Staying safe', ['Only join groups run by people you know and trust. Never send money to anyone who is not the admin shown in the group. Do not share your one-time codes. Turn on the fingerprint or Face ID lock in Me so nobody else can open the app on your phone.', 'Remember: late or missed payment is normally a civil matter. Deliberately taking a payout and refusing to pay, or using fake documents, can be reported to the police. Read the member agreement in Me for the details.']],
];
export default function How() {
  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>How it works</h1>
      <p className="m" style={{ lineHeight: 1.5 }}>A quick guide to Ajo on Conmonie. Tap a section to open it.</p>
      {S.map(([icon, t, ps], i) => (
        <details key={t} open={i === 0} className="glass" style={{ padding: 0 }}>
          <summary style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, cursor: 'pointer', listStyle: 'none', fontWeight: 600 }}><span className="ibadge g"><Icon n={icon} /></span><span style={{ flex: 1 }}>{t}</span><Icon n="down" s={18} /></summary>
          <div style={{ padding: '0 16px 16px', fontSize: 14, lineHeight: 1.65 }}>{ps.map((p, k) => <p key={k} style={{ marginTop: k ? 8 : 0 }}>{p}</p>)}</div>
        </details>))}
      <a href="/me" className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Back</a>
    </main>
  );
}
