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

## Late fee (Paystack), verification and staff
- **Env:** `PAYSTACK_SECRET_KEY` (use `sk_test_` first), `PLATFORM_LATE_FEE` (default 100). In Paystack > Settings > API Keys & Webhooks set the webhook URL to `https://YOUR-DOMAIN/api/paystack/webhook`.
- **Flow:** after the due time `/g/[id]/pay` redirects to `/g/[id]/late`. The fee is paid on Paystack, confirmed server-side (return page and signed webhook) and stored in `groups/{id}/lateFees`. `/api/pay/info` only returns the admin's account once it is paid. `/api/contribute` is the only way to create a contribution and re-checks lateness itself. Platform revenue is logged in the `fees` collection.
- **Account numbers** now live in `groups/{id}/private/acct`. Existing groups are migrated automatically by the reminder job.
- **Verification:** Me > Identity check runs free on-device checks (liveness, face match, statement name/address). Results are a pre-screen; a staff member approves at `/staff`. To make yourself staff: Firebase console > Firestore > `users` > your document > add field `staff` (boolean) = `true`. Images are deleted when a decision is saved.
- Face models and the PDF worker are copied into `public/` by `scripts/copy-assets.js` on `npm install`.
- Republish `firestore.rules` after updating.
