# InsightHub

Phone intelligence and privacy-first visitor analytics in one Next.js application.

- **PhoneCheck** — validate any phone number with the [Numverify](https://numverify.com/) API.
- **Visitor analytics** — a self-hosted dashboard powered by [IPstack](https://ipstack.com/) and MongoDB.

No third-party trackers, no cookies, no fingerprinting.

---

## Features

### PhoneCheck (`/phonecheck`)

- Validates a number and reports country, ISO code, calling prefix, carrier and line type
  (mobile, landline, VoIP, …).
- Shows both local and international formatting.
- Keeps a lookup history **in your browser only**, under the `phonecheck.history.v1`
  localStorage key. Nothing about your lookups is sent anywhere except the Numverify
  request you trigger.
- Rate limited to 20 requests per minute per IP.

### Visitor analytics (`/admin`, admin only)

- **Dashboard** — total, new, returning and currently-active visitors; activity over time;
  device, browser, page and traffic-source breakdowns.
- **Visitors** — searchable, filterable, sortable, paginated table with CSV export.
- **Visitor detail** — every recorded signal for one IP: network, geolocation, device,
  timezone and activity.
- **Geography** — country and city breakdowns.
- **Users** — list accounts, grant or revoke the admin role, deactivate, reactivate, delete.
- **Settings** — toggle tracking, choose the active-visitor window and the data-retention period.
- Date ranges are stored in the URL, so any dashboard view is shareable and survives a refresh.
- All date boundaries are computed in **UTC**; the UI labels the period so it is never ambiguous.

### Accounts & roles

InsightHub uses real accounts in MongoDB with two roles:

| Role    | Can do                                                                    |
| ------- | ------------------------------------------------------------------------- |
| `admin` | Everything: visitor analytics, settings, exports **and** user management. |
| `user`  | Sign in, view and edit their own account. No analytics, no visitor data.  |

- **Registration is open** — anyone can create an account at `/signup`, and every
  self-registered account is created with the `user` role. The role is hard-coded
  server-side, so there is no request field that can promote an account to admin.
- **The first admin is created by a script**, not through the UI:

  ```bash
  npm run seed:admin -- --email you@example.com --name "Your Name"
  # prompts for the password without echoing it

  npm run seed:admin -- --email you@example.com --password "a-long-passphrase"
  # non-interactive; add --force to reset an existing account
  ```

- **Further admins are granted from `/admin/users`**, so adding an administrator is
  always an auditable action taken by a signed-in admin rather than a shell command.
- `/admin/users` also lists accounts, shows live session counts, and can deactivate,
  reactivate or delete accounts. Deactivating revokes that account's sessions
  immediately.

### Authentication

- Passwords are hashed with **scrypt** (memory-hard, no native dependency) and
  compared with `timingSafeEqual`. A missing account still performs a verification, so
  a wrong email and a wrong password take the same time and cannot be used to
  enumerate registered addresses.
- Sessions are **opaque random tokens stored hashed in MongoDB**, which is what makes
  sign-out, admin deactivation and "revoke everywhere" possible. Only an HMAC digest is
  persisted, keyed with `ADMIN_SECRET`, so a database dump alone cannot be turned into
  working cookies.
- The cookie is `httpOnly`, `SameSite=Lax` and `Secure` in production. It contains no
  user data.
- Every check is server-side. `app/admin/layout.tsx` guards the pages, and each
  `/api/admin/*` route independently re-checks the session **and** the role. There is no
  client-side-only gate, and no `proxy.ts`/middleware hop to keep in sync.

### Privacy

- No names, e-mail addresses, phone numbers or form contents are ever stored in analytics.
- The raw `User-Agent` header is **not** persisted — only the parsed
  `deviceType` / `browser` / `operatingSystem` triple.
- Locations come from IP addresses and are approximate. They represent the network
  location, not a precise physical position.
- Passwords are one-way hashed; sessions are stored only as keyed digests.
- One document per IP address, so repeat visits are counted without storing a per-hit log.

---

## Tech stack

| Concern    | Choice                                        |
| ---------- | --------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack)            |
| Language   | TypeScript                                    |
| Styling    | Tailwind CSS 4 + shadcn/ui                    |
| Database   | MongoDB (Atlas or self-hosted) via Mongoose   |
| Geo/ISP    | IPstack                                       |
| Phone data | Numverify                                     |
| Charts     | Recharts                                      |

---

## Installation

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run sync:indexes        # create the MongoDB indexes
npm run seed:admin -- --email you@example.com --name "Your Name"
npm run dev
```

Open <http://localhost:3000>. Sign in at `/login`; the dashboard is at `/admin`.

### Seeding demo data

```bash
npm run seed                 # inserts 240 demo visitors
npm run seed -- --count 500  # insert a different number
npm run seed -- --reset      # delete existing visitors first
```

Demo visitors include synthetic geolocation data, so the dashboard is populated before
any real traffic arrives.

---

## Environment variables

All variables are read **server-side only**. Never prefix any of them with
`NEXT_PUBLIC_`, which would ship the value to the browser.

| Variable               | Required | Description                                                                                             |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `NUMVERIFY_API_KEY`    | Yes      | Numverify key powering phone validation.                                                                |
| `MONGODB_URI`          | Yes      | MongoDB connection string, including the database name. Stores accounts, sessions and analytics.        |
| `ADMIN_SECRET`         | Yes      | HMAC pepper used to derive session token digests. Required in production.                                |
| `IPSTACK_API_KEY`      | No       | Enables geolocation. Without it visitors are still tracked, but with no location data.                 |
| `TRUSTED_PROXY_COUNT`  | No       | Number of trusted proxies in front of the app (e.g. `1` for Vercel). Leave unset when reached directly. |
| `NEXT_PUBLIC_SITE_URL` | No       | Absolute site URL used for metadata. Defaults to `http://localhost:3000`.                               |

`ADMIN_SECRET` is no longer a login password — it is a server-side pepper. Without it the
app still works in development using a per-process random value, but **every restart
invalidates open sessions**, so always set it in production.

Generate a strong value:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Getting a MongoDB URI

**Atlas** — create a free cluster, then *Database Access* → add a user, then
*Network Access* → allow your IP or `0.0.0.0/0`. The URI looks like:

```
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/insighthub?retryWrites=true&w=majority
```

**Self-hosted** — include the database name before the query string:

```
mongodb://127.0.0.1:27017/insighthub
```

---

## Architecture

```
app/
  (public)/              public shell: navbar, footer, visitor tracker
    page.tsx             marketing homepage
    phonecheck/          the phone module
    history/             browser-local lookup history
    login/  signup/      account creation and sign-in
    account/             own profile (any signed-in role)
  admin/                 auth-guarded dashboard (admin role only)
    layout.tsx           session + role check, sidebar shell
    page.tsx             dashboard (+ dashboard-view.tsx)
    visitors/            table (+ visitors-view.tsx) and [id] detail
    geography/           country and city breakdowns
    users/               user management (+ users-view.tsx)
    settings/            collection and dashboard settings
  api/
    analytics/track/     POST page view (public, rate limited)
    auth/                register, login, logout, session
    admin/               stats, visitors, visitors/[id], geography,
                         settings, export, users, users/[id]
    phone/validate/      existing Numverify endpoint (unchanged behaviour)

components/
  admin/                 dashboard widgets shared across admin pages
  analytics/             visitor-tracker.tsx
  layout/                navbar, footer, use-session.ts (session probe)
  phone/                 existing PhoneCheck UI
  ui/                    shadcn primitives

lib/
  analytics.ts           upsert, dashboard aggregates, filters, export
  mongodb.ts             cached Mongoose connection + health check
  auth.ts                scrypt hashing, sessions, credentials
  auth-guard.ts          requireUser / requireAdmin for route handlers
  auth-pages.ts          redirect helper for /login and /signup
  users.ts               admin user management, last-admin protection
  password-policy.ts     shared client/server password bounds
  ipstack.ts             IPstack client, typed errors, health check
  settings.ts            singleton settings over defaults
  date-range.ts          UTC range resolution and bucket granularity
  get-client-ip.ts       proxy-aware client IP extraction
  user-agent.ts          privacy-preserving UA parsing
  rate-limit.ts          in-memory sliding window
  csv.ts                 RFC 4180 escaping
  analytics-format.ts    shared display formatting

models/
  User.ts                accounts (email unique, role, active flag)
  Session.ts             revocable sessions (TTL index)
  Visitor.ts             the single analytics collection
  AppSetting.ts          singleton settings document

types/
  auth.ts                roles, public user shape, auth error codes
  analytics.ts           visitor, breakdown, dashboard, settings types
  ipstack.ts             upstream response and error mapping

scripts/
  seed.ts               demo visitors
  seed-admin.ts         first administrator
  sync-indexes.ts       reconcile MongoDB indexes with the schemas
  tsconfig.json         path aliases + a server-only stub for plain Node
```

### Route protection

`app/admin/layout.tsx` verifies the session cookie and the role on the server:
unauthenticated visitors go to `/login`, and a signed-in non-admin goes to `/account`.
Every `/api/admin/*` route independently re-checks both, so the browser is never the
thing deciding whether it may read visitor data. `/login` and `/signup` do the reverse
and send an already-signed-in visitor to the page their role allows.

### Data model

**Accounts** — `users` collection:

```
email, emailNormalized (unique), name, passwordHash (scrypt, select:false),
role ("admin" | "user"), isActive, lastLoginAt, createdAt, updatedAt
```

`passwordHash` is excluded by default, so it cannot leak into a listing by accident.

**Sessions** — `sessions` collection:

```
tokenHash (HMAC digest), userId, expiresAt (TTL index), lastSeenAt, userAgent, ip
```

MongoDB removes expired sessions on its own. Deactivating an account deletes its rows
immediately rather than waiting for expiry.

**Analytics** — one document per visitor **IP address** (`unique` index on `ip`):

```
ip, ipType
countryCode, countryName, countryFlag, callingCode, isEu
regionCode, regionName
city, zip, latitude, longitude
timezone, timezoneCode, timezoneOffset, currencyCode
asn, isp, org, connectionType
deviceType, browser, operatingSystem
referrer, page
firstSeen, lastSeen, visitCount, geolocatedAt
```

Indexed on `lastSeen` (range queries), `firstSeen` (new-visitor counts),
`countryCode + city`, and `deviceType + lastSeen`. A singleton `appsettings` collection
holds the dashboard configuration.

Range membership uses **`lastSeen`**; "new" visitors use **`firstSeen`**. Repeat visits
increment `visitCount` instead of creating a new document.

Run `npm run sync:indexes` after changing any schema, so index options such as
`unique` and `expireAfterSeconds` are actually applied.

### Tracking flow

1. `VisitorTracker` fires once per pathname on client-side navigation, using
   `navigator.sendBeacon` when available and falling back to `fetch(..., { keepalive: true })`.
2. `POST /api/analytics/track` rate limits by IP, validates the body, and derives the
   client IP from trusted proxy headers.
3. IPstack is called only when needed — never for private addresses, and at most once per
   IP per 24 hours. Every failure is logged and tolerated: the visit is still recorded,
   just without location data.
4. `upsertVisitor` writes with `$set` + `$inc` + `$setOnInsert`.

### Analytics graceful degradation

Analytics must never break the public site. A missing or unreachable database makes the
tracking endpoint return `{ success: true }` without recording anything, so visitors see
no error and the phone tool keeps working. The public pages do not depend on MongoDB at all.

---

## Rate limits

In-memory sliding window, per IP, per process:

| Endpoint                | Limit            |
| ----------------------- | ---------------- |
| `/api/phone/validate`   | 20 per minute    |
| `/api/analytics/track`  | 60 per minute    |
| `/api/auth/login`       | 10 per 15 minutes |
| `/api/auth/register`    | 5 per hour       |

Because the counters live in process memory, put a shared store (Redis, Upstash) behind
these endpoints before scaling to more than one instance.

---

## Data retention

`dataRetentionDays` sets the retention window shown in settings. `purgeExpiredVisitors()`
in `lib/analytics.ts` deletes documents whose `lastSeen` predates that cutoff. It is
deliberately **not** called automatically — run it from a scheduled job:

```ts
import { purgeExpiredVisitors } from "@/lib/analytics";

const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
const removed = await purgeExpiredVisitors(cutoff);
```

---

## Scripts

```bash
npm run dev            # start the dev server
npm run build          # production build
npm run start          # serve the production build
npm run lint           # eslint
npm run seed           # insert demo visitors
npm run seed:admin     # create or reset an administrator
npm run sync:indexes   # reconcile MongoDB indexes with the schemas
```

---

## Deployment notes

- Set every environment variable in the hosting platform. `.env.local` is ignored by git.
- The app is fully dynamic; no static generation of the dashboard is required.
- MongoDB connections are cached per process, which suits serverless and containers alike.
- If you terminate TLS at a proxy, set `TRUSTED_PROXY_COUNT` so the real client IP is read
  from the correct position in `x-forwarded-for`.
- Put IPstack and Numverify behind a cache or queue at high traffic: both are metered.

---

## Troubleshooting

**Dashboard shows nothing.** Check `MONGODB_URI`, then confirm the cluster is reachable
and that its network access list allows your host. Look for `[analytics/track]` messages
in the server log.

**Location columns are empty.** IPstack is failing or not configured. The log line
`[analytics/track] IPstack error …` carries the upstream error code. Without
`IPSTACK_API_KEY` the rest of the analytics still works.

**`/admin/login` says "Admin access is not configured".** That route no longer exists —
authentication happens at `/login` for both roles. If nobody can reach `/admin`, run
`npm run seed:admin` to create the first administrator.

**Everyone is refused access to `/admin`.** No active administrator exists. Create one
with `npm run seed:admin`, then check `npm run seed:admin -- --email … --force` to reset
an existing account.

**Signed out on every restart.** `ADMIN_SECRET` is not set, so session digests use a
per-process random pepper. Set it in the environment.

**Visitors all appear as "Direct / Unknown".** The referrer is absent, which is normal for
direct navigation, bookmarks and privacy-focused clients.