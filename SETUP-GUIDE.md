# EX-CAP Football Tournament — Complete Setup Guide (from zero)

A professional, responsive, cross-browser web app for the EX-CAP (Alumni Association of
SCPSC) football tournament — with registrations, payments, a **live scoreboard**,
fixtures, champions board, and a **QR check-in system**.

Free-tier stack:

> **StackBlitz** (write code) -> **GitHub** (store code) -> **Vercel** (host + serverless +
> your domain) -> **Firebase/Firestore** (database + admin login + live sync) ->
> **EmailJS** (email) -> **SMSQ** (SMS). **bKash** is built in and you switch it on when
> your merchant account is ready.

You do **not** need to be a developer. Work top to bottom; don't skip steps.

---

## What the platform does

**Public site** (any phone/tablet/desktop, any ratio, any modern browser):
- Animated home with live countdowns (open / deadline / kick-off), live slot counter, a
  **Live & latest** strip and a **Champions** banner when results are published.
- Registration: **Team** (multi-step + players + guests + payment), **Guest**,
  **Visitor**, **Current student**, **Volunteer**.
- **Live scoreboard** — scores update in real time (no refresh) as organizers record them.
- **Fixtures** — full schedule by stage. **Champions & awards** — podium + individual awards.
- Teams, tournament info, help. Every approved registration gets a **real scannable QR pass**.

**Admin panel** (organizer login):
- Dashboard KPIs.
- **Scoreboard** — create/schedule matches, set them live, +/- scores, record scorers,
  half-time / full-time. Pushes live to every public device instantly.
- **Results & awards** — set champion, runner-up, third place, top scorer, best player,
  best goalkeeper, fair play; publish to the public site.
- **Check-in** — scan QR passes with a phone/tablet camera (or type the code) to check in
  teams, individual players and guests; live counts + recent list.
- Teams, Registrations, **Volunteers** (assign role/zone/shift, monitor duty), Payments,
  Record manual/cash payment.
- **Broadcast center** — email and/or SMS to any audience.
- Branding & logos, Announcement bar, Settings, **My profile** (name/photo/password),
  and a tamper-proof **Activity log**.
- Approving any registration auto-sends an **approval email + SMS**.

> **Runs immediately in demo mode.** Open it in StackBlitz and click around — data is
> stored locally in your browser, admin password `excap2026`. Everything below turns demo
> mode into the real, shared, live, paid, notifying platform. Once Firebase is connected,
> demo mode switches off automatically.

---

## Phase 1 — Open the project in StackBlitz

1. Unzip `excap-sports.zip`.
2. stackblitz.com -> **Sign in with GitHub**.
3. **New project -> Static (HTML/JS/CSS)**.
4. Delete the sample files it creates.
5. Drag in the unzipped files **and folders** (`index.html`, `css`, `js`, `api`, config
   files). Make sure **`index.html` is at the root**.
6. Preview shows the site in demo mode. (The `/api` functions only run on Vercel — that's
   expected. The QR scanner needs a camera + HTTPS, so it works on the live site, not in
   the StackBlitz preview.)

---

## Phase 2 — Push to GitHub

1. **Connect Repository** (top-left) -> name `excap-sports` -> **Create repo & push**.
2. After each edit, click **Commit** to push. Vercel will auto-redeploy once Phase 7 is done.

---

## Phase 3 — Firebase: database + admin login + live sync

### 3.1 Create project
console.firebase.google.com -> **Add project** -> `excap-sports` -> Create.

### 3.2 Firestore
1. **Build -> Firestore Database -> Create database** -> **Production mode** -> region
   **asia-south1 (Mumbai)** -> Enable.
2. **Rules** tab -> replace all with the contents of `firestore.rules` -> **Publish**.
   (Public can submit registrations and read the scoreboard/results; only signed-in admins
   manage data; admin profiles are protected; the activity log is append-only.)

> Firestore's real-time listeners are what make the scoreboard update live across every
> device — no extra service needed.

### 3.3 Authentication
1. **Build -> Authentication -> Get started -> enable Email/Password**.
2. **Users -> Add user** -> create each organizer's email + strong password (their admin
   login). They can change their own name/photo/password later in **My profile**.

### 3.4 Web config
1. Project Overview -> **</> (Web)** -> register app `web`.
2. Copy `firebaseConfig` values into **js/config.js** `firebase: { }`. Commit.

> These web values are safe to be public — security is in the rules you published.

---

## Phase 4 — EmailJS: three templates

1. emailjs.com -> **Email Services -> Add New Service** -> note **Service ID**.
2. Create **three templates** (set each template's **To Email** to `{{to_email}}`):

   | Purpose | Body variables |
   |---|---|
   | Approval | `{{to_name}} {{reg_id}} {{reg_type}} {{venue}} {{event_date}} {{message}}` |
   | Contact | `{{from_name}} {{from_email}} {{message}}` |
   | Broadcast | `{{to_name}} {{subject}} {{message}}` |

3. **Account -> API Keys** -> copy **Public Key**.
4. Put all five values into **js/config.js** `emailjs: { }`. Commit.

---

## Phase 5 — SMSQ: automated + broadcast SMS

Secrets go in Vercel (Phase 7), never the repo.
1. In your SMSQ panel (api.smsq.global/swagger) confirm the send-SMS **path** and
   **request-body field names**.
2. `api/send-sms.js` posts to `https://api.smsq.global/api/v2/SendSMS` with
   `{ApiKey, ClientId, SenderId, Message, MobileNumbers}` and supports **multiple numbers**
   (broadcast). Change the two commented spots if your field names differ.
3. Vercel vars: `SMSQ_API_URL`, `SMSQ_API_KEY`, `SMSQ_CLIENT_ID`, `SMSQ_SENDER_ID`.

---

## Phase 6 — bKash: built now, switch on later

- Leave `bkash.enabled: false` in `js/config.js`. Teams pay via **manual/cash** and admins
  record it. Nothing is blocked.
- Sandbox creds ship in `.env.example` for testing.
- When live: set `bkash.enabled: true`, set `BKASH_SANDBOX=false` in Vercel + your four live
  credentials, redeploy.

---

## Phase 7 — Vercel: host + serverless + env vars

1. vercel.com -> sign in with GitHub -> **Add New -> Project -> Import** `excap-sports` ->
   preset **Other** -> **Deploy**.
2. **Settings -> Environment Variables**:

   | Variable | Value |
   |---|---|
   | `SITE_URL` | `https://sports.excapscpsc.com` |
   | `BKASH_SANDBOX` | `true` now -> `false` live |
   | `BKASH_USERNAME` / `BKASH_PASSWORD` / `BKASH_APP_KEY` / `BKASH_APP_SECRET` | bKash |
   | `SMSQ_API_URL` | `https://api.smsq.global/api/v2/SendSMS` |
   | `SMSQ_API_KEY` / `SMSQ_CLIENT_ID` / `SMSQ_SENDER_ID` | from SMSQ |

3. **Redeploy** so vars take effect.

---

## Phase 8 — Custom domain: sports.excapscpsc.com

1. Vercel -> **Settings -> Domains -> Add** -> `sports.excapscpsc.com`.
2. Create this DNS record at your registrar (where excapscpsc.com lives):
   - **Type:** CNAME  **Name/Host:** `sports`  **Value:** `cname.vercel-dns.com`
3. Wait for propagation; Vercel issues HTTPS automatically.
4. Confirm `SITE_URL` is the live URL; redeploy.
5. **Firebase -> Authentication -> Settings -> Authorized domains -> Add**
   `sports.excapscpsc.com` (else admin login fails on the live domain).

> HTTPS matters: the **camera-based QR check-in only works over HTTPS** — i.e. on your live
> Vercel/domain URL, not in the StackBlitz preview.

---

## Phase 9 — Match-day operations

**Scoreboard (admin -> Scoreboard)**
1. **+ New match** -> pick round, the two teams (from confirmed teams), kick-off, field.
2. Build the full schedule this way (or as the tournament progresses).
3. On match day: **Start (live)** -> use **+ / -** or **+ Scorer** to update the score ->
   **Half-time** / **Full-time**. The public **Live** page and home strip update instantly
   on every device.

**Results (admin -> Results & awards)**
- Fill champion / runner-up / third / individual awards -> tick **Publish**. The public
  **Champions & awards** page and the home banner light up.

**Check-in (admin -> Check-in)**
- Open it on a phone/tablet at the gate (must be the **HTTPS live URL**). **Start camera**,
  scan a pass -> instant check-in with a confirmation card; duplicates are flagged.
- No camera? Type the code (e.g. `EXCAP-FT26-T001`) and **Check in**.
- To check in individual players/guests, open the team in **Teams -> View -> QR passes**:
  each player and guest has a unique code you can **Print** or show on screen. Codes look
  like `EXCAP-FT26-T001#P3` (player 3) and `...#G2` (guest 2).

---

## Feature -> file map

| Feature | Where |
|---|---|
| Responsive cross-browser SPA | `index.html` + `css/*` + `js/*` |
| Database + auth + live sync | Firebase (`js/store.js`) |
| Registrations (team/guest/visitor/student/volunteer) | `js/public.js` |
| Real scannable QR passes | `js/qr.js` (qrcode-generator) |
| **Live scoreboard / fixtures / champions** | `js/scoreboard.js` (public) + admin (`js/admin.js`) |
| **QR check-in (camera)** | `js/qr.js` (html5-qrcode) + admin Check-in |
| Approve -> email + SMS | `approveReg()` -> `Notify.onApproved()` |
| Broadcast center | Admin -> Broadcast |
| Volunteers | Admin -> Volunteers |
| Manual/cash payments | Admin -> Record payment |
| bKash (switch on later) | `api/bkash-*`, `js/bkash.js` |
| Profiles + password + activity log | `js/store.js`, admin |

---

## Notes & limits

- **EmailJS** free tier caps monthly volume; **SMSQ** charges per SMS — broadcast wisely,
  test on yourself first.
- **QR scanner** needs HTTPS + camera permission (works on the live domain).
- Keep logos under ~1.5 MB, photos under ~1 MB (stored in the database).

## Common issues

- Admin login fails live -> add the domain to Firebase Authorized domains (8.5).
- "Email skipped" / "SMS env vars not set" -> placeholder still in `config.js`, or a Vercel
  var missing.
- Scoreboard not live for the public -> Firebase config still has placeholders (demo mode).
- Camera won't open -> not on HTTPS, or permission denied.
- bKash create fails -> off by design until `bkash.enabled:true` + live env vars.

## Go-live recap

[ ] In StackBlitz, index.html at root  [ ] pushed to GitHub  [ ] Firebase config in config.js
[ ] rules published  [ ] admin user created  [ ] EmailJS 5 values  [ ] SMSQ vars in Vercel
[ ] bKash off for now  [ ] deployed  [ ] sports.excapscpsc.com + SSL  [ ] domain authorized in Firebase
[ ] logos + settings entered  [ ] tested: register -> approve -> email/SMS, scoreboard live,
    results publish, QR check-in, volunteer assign, broadcast test.

— Built for EX-CAP - Alumni Association of SCPSC. Developed by Talha Jubair.
