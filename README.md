# Conmonie (Ajo platform)

Next.js 14 (App Router) + Tailwind + Firebase (Auth, Firestore). Deploys on Vercel.

## Run locally
1. `cp .env.example .env.local` (add `ANTHROPIC_API_KEY` to turn on receipt reading)
2. `npm install && npm run dev`

## Firebase setup (project `conmonie`)
1. Authentication > Sign-in method > enable Email/Password.
2. Firestore Database > create database, then paste `firestore.rules` into Rules and Publish.
3. Authentication > Settings > Authorized domains > add your Vercel domain.

## Deploy
Push to GitHub, import in Vercel, add the variables from `.env.example` and deploy.

## Structure
- `src/app` pages: `/` home, `/g/[id]` group chat + admin, `/g/[id]/pay`, `/join/[code]`, `/new`, `/me`, `/activities`, `/terms`, `/api/extract`
- `src/lib` firebase, cycle/late-fee logic, image compression, hashing
- `firestore.rules` role-based security (members, admin, private receipts)

## Push notifications and reminders
1. Firebase console > Project settings > Cloud Messaging > Web Push certificates > Generate key pair. Put it in `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
2. Project settings > Service accounts > Generate new private key. Paste the whole JSON into `FIREBASE_SERVICE_ACCOUNT` on Vercel.
3. Set `CRON_SECRET` on Vercel to a long random string.
4. GitHub repo > Settings > Secrets and variables > Actions: add `CRON_SECRET` (same value) and `APP_URL` (for example https://conmonie.vercel.app). `.github/workflows/reminders.yml` then calls `/api/cron/reminders` every 15 minutes (due-time, late and packing-day reminders, each sent once).
5. Republish `firestore.rules`. Each member turns notifications on from the Me tab. On iPhone the app must be added to the Home Screen first.

## Group tools
- Tap the group name in the chat for Group info: description, photo (upload or preset), members, remove member, packing order, admins-only messaging, invite link, leave group.
- The checklist and "contribution confirmed" cards are posted into the chat each time they change, and a new checklist is posted at the start of every round.
- The bell on Home opens the notification centre. Entries are created by the server, so `FIREBASE_SERVICE_ACCOUNT` must be set. Republish `firestore.rules` after updating.

## App PIN and offline
- Me > Fingerprint or Face ID lock: optional. Uses the phone's own biometric check (WebAuthn platform authenticator); only a credential id is stored on the device. The app locks on open and after 30 seconds in the background. Logging out removes it.
- `public/sw.js` saves pages, scripts and images so the app opens offline; Firestore keeps data in its offline cache. Bump `V` in `sw.js` to force a fresh cache. It only registers in production builds.

## Install and app guide
- `InstallContext` captures the browser install prompt. Android and desktop get a one-tap Install app button; iPhone gets Add to Home Screen steps.
- Home shows an install card once on the first visit (after the guide); Me > Install app is always there until the app is installed.
- `components/Tour.js` is a reusable spotlight guide. Home and the group chat each show it on first visit. Targets are marked with `data-tour="..."`. Me > App guide replays it.

## Onboarding, verification and the feed
- **Sign-in:** Google, phone (SMS) and email. In Firebase > Authentication > Sign-in method switch on Google, Phone and Email/Password, and add your domain under Settings > Authorized domains. Phone sign-in needs the Blaze plan for real SMS.
- **Google inside an installed iPhone app or Safari:** the app uses a redirect there. If it fails, use a first-party auth domain: set `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` to your site (for example `conmonie.vercel.app`) in Vercel, and add `https://conmonie.vercel.app/__/auth/handler` to the authorised redirect URIs of the web OAuth client (Google Cloud console > APIs & Services > Credentials). `next.config.js` already proxies `/__/auth`. The login page shows the Firebase error code if something fails.
- **Onboarding is required** (`/onboarding`): your details (legal name, a phone number verified by an SMS code, WhatsApp number, a trusted contact), ID photo, live selfie (spoken guide in `public/voice`), bank statement PDF and the member agreement (`lib/agreement.js`). One phone number can belong to one account. Approval is automatic: `/api/onboarding/submit` re-checks the statement, phone and signature. Face scores come from the phone, so the images are kept as evidence and can be viewed in the Firebase console under `verifications/{uid}`. Rules block unverified users from creating or joining anything.
- **Statement reader** (`lib/statement.js`): finds name, address and date as "Label: value", a label with the value underneath, or a header row with values below, and many date formats. If a wallet statement prints no address, the member types it (`ALLOW_TYPED_ADDRESS` in `lib/limits.js`).
- **Home:** total contributions, Create / Join / Scan, then two cards: Ajos (`/ajos`) and ConGoal (`/goals`).
- **ConGoal:** shared savings goals with a target and deadline (`/goals`, `/goal/[id]`). Members give any amount; the organizer confirms receipts; progress ring, milestones, a "who has given" board, an append-only spending log and organizer updates. Server routes: `/api/goal/info`, `/api/goal/contribute`.
- **Explore feed:** admins switch on "Show in Explore"; members request to join; admins approve or decline after seeing a server-computed record (`/api/requests/*`).
- **QR codes:** each Ajo and ConGoal has a QR for its invite link (`components/QrSheet.js`); `/scan` reads them with the camera.
- **Receipts:** Transactions (Activities tab) opens a shareable receipt image (`lib/receipt.js`) for Ajo and ConGoal payments.
- **Installed app:** pull down from the top to refresh (`components/PullToRefresh.js`).
- Face models and the PDF worker are copied into `public/` by `scripts/copy-assets.js` on `npm install`. Republish `firestore.rules` after updating.

## Plans, alarm, KYC timing and deposits
- **Conmonie Pro** (`/pro`): Free groups hold 5 members and a free account can join 10 groups (enforced in `/api/join` and when admins approve requests). Pro unlocks unlimited members/joins and the **Ping Trigger** (`/api/ping`, admin + Pro only). Plan fields on `users` (`isPro`, `proExpiresAt`, `joinedGroupsCount`) and `groups.creatorIsProSnapshot` are written only by the server. Set the price with `NEXT_PUBLIC_PRO_PRICE` (default 2000).
- **Paystack:** needs `PAYSTACK_SECRET_KEY`. `/api/billing/init` (hosted checkout, channels `bank_transfer` and `bank`; Paystack's `mobile_money` channel is Ghana/Kenya only), `/api/billing/transfer` (Charge API: dedicated transfer account for the custom desk; needs Pay with Transfer enabled on your Paystack account), `/api/billing/webhook` (set it in Paystack: `https://YOUR-DOMAIN/api/billing/webhook`). Expired plans are downgraded by the 15-minute cron.
- **Reminder alarm:** `lib/alarm.js` loops `/sounds/alarm.mp3` for exactly 10 seconds, unlocked by the first tap; `context/AlarmContext.js` stores and arms reminders (Home schedules due reminders); server alarms (`alarm: '1'` push) ring in-app or show a notification that stays until tapped. The sound is precached by `public/sw.js`.
- **OPay button:** `lib/opay.js`. Confirm the Android package id against OPay's Play Store URL.
- **KYC is asked for late:** people can browse; the popup appears at first sign-in and again when they try to join or create. SMS verification and phone sign-in are removed for now.
- **Deposits:** a member can send a partial payment as a deposit, and add more receipts to a pending payment (`/api/contribute/attach`). Admins see "Received X of Y", can Hold, Confirm or Reject, and are notified of every change.
- **Phone privacy:** `/api/members` returns legal names, phone numbers and payment records only to a group admin.
