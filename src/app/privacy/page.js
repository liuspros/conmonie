export const metadata = { title: 'Privacy | Conmonie' };
const ITEMS = [
  ['What we collect', 'Your name and email, the groups you join, your contributions and chat messages, receipt images you upload, the payout account you save, and a device token if you turn on notifications.'],
  ['Why we use it', 'To run your Ajo group: show the checklist, let your admin confirm payments, remind you when payments are due, and show the packer\'s account on packing day.'],
  ['Who can see it', 'Group members see your name, your payment status and your messages. Your receipts are visible only to you and your group admin. The payout account you save is shown to your group when it is your turn.'],
  ['Services we rely on', 'Google Firebase stores your data and sends notifications. Vercel hosts the app. Paystack processes late-fee payments. Receipt images are sent to Anthropic\'s Claude to read the amount, date and name.'],
  ['Identity checks', 'If you choose to verify, your face is compared with your ID photo on your phone. We receive one selfie, your ID photo and the first page of your bank statement. A reviewer sees them once and they are then deleted. We keep your legal name, the result, and the name and address read from your statement. Admins never see them.'],
  ['Money', 'Conmonie never holds, moves or guarantees money. Payments go directly to the account shown by the admin.'],
  ['Your rights', 'Under the Nigeria Data Protection Act you can ask to see, correct or delete your data. Contact us using the details below and we will respond.'],
  ['Contact', '[add your support email here]'],
];
export default function Privacy() {
  return (
    <main className="app">
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Privacy and policy</h1>
      {ITEMS.map(([h, t]) => <div key={h} className="glass"><b>{h}</b><p className="m" style={{ marginTop: 4, fontSize: 14, lineHeight: 1.6 }}>{t}</p></div>)}
      <a href="/me" className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Back</a>
    </main>
  );
}
