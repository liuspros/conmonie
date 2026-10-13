export const metadata = { title: 'Privacy | Conmonie' };
const ITEMS = [
  ['What we collect', 'Your sign-in details, full legal name, a phone number (verified by a code), your WhatsApp number, a trusted contact, your ID photo, a live selfie, the first page of a bank statement (with your name and address), the groups you join, your contributions, receipts and messages, and a device token if you turn on notifications.'],
  ['Why we use it', 'To confirm every member is a real, traceable person, to run your Ajo groups, to send reminders, and to support a report if someone commits fraud.'],
  ['Who can see it', 'Group members and admins see your display name, Verified badge, payment status and streak. Your ID, selfie, statement, address, phone numbers and trusted contact are visible only to Conmonie. Your receipts are visible to you and your group admin. They may be shared as described in the member agreement if someone breaks their promises on purpose, or when the law requires it.'],
  ['Services we rely on', 'Google Firebase stores data and sends notifications. Vercel hosts the app. Receipt images are sent to Anthropic\'s Claude to read the amount, date and name. Face matching happens on your phone.'],
  ['How long we keep it', 'While your account is active and for up to six years after your last Ajo ends, or longer if a dispute or investigation is open.'],
  ['Money', 'Conmonie never holds, moves or guarantees money. Payments go directly to the account shown by the admin.'],
  ['Your rights', 'Under the Nigeria Data Protection Act you can ask to see, correct or delete your data, and complain to the Nigeria Data Protection Commission. Some data must be kept for open disputes or legal duties.'],
  ['Contact', '[add your support email here]'],
];
export default function Privacy() {
  return (
    <main className="app" style={{ paddingBottom: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Privacy and policy</h1>
      {ITEMS.map(([h, t]) => <div key={h} className="glass"><b>{h}</b><p className="m" style={{ marginTop: 4, fontSize: 14, lineHeight: 1.6 }}>{t}</p></div>)}
      <a href="/agreement" className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Read the member agreement</a>
      <a href="/me" className="btn2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Back</a>
    </main>
  );
}
