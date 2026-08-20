# Oshap

QR-based table ordering and payment system. Customers scan a QR at a table, browse a menu, order, and pay via bank transfer or by requesting a POS terminal. The merchant gets push notifications and verifies payments from a staff-gated dashboard.

This repo holds the **frontend only**. The Python/FastAPI backend lives in a separate repo and is built against the contract in [`docs/openapi.yaml`](docs/openapi.yaml).

Product docs:
- [`PRD.md`](PRD.md) — what Oshap is, v1.1 MVP scope, lifecycles
- [`docs/jtbd.md`](docs/jtbd.md) — what Oshap is hired to do (Jobs To Be Done)
- [`docs/plans.md`](docs/plans.md) — what each subscription plan includes. Every plan gets the whole product; they differ by capacity (Lite is capped at 3 staff accounts and 10 tables), not capability.
- [`docs/notifications.md`](docs/notifications.md) — spec for the admin notifications tab: which events become notifications, who they route to, and the endpoints the backend needs to build.

## Stack

| Layer | Tool |
|---|---|
| Apps | Vite 6 + React 19 + TypeScript |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) |
| Data | TanStack Query v5 over typed `fetch` wrappers |
| Push (admin only) | Firebase Cloud Messaging (web push) |
| Admin install | PWA — installable to home screen, `display: standalone` |
| Hosting | Vercel (SPA fallback via per-app `vercel.json`) |
| Package manager | npm workspaces (Node 20+) |

## Repository layout

```
oshap/
├── apps/
│   ├── customer/         Public Vite SPA — /menu /checkout /pay /orders
│   ├── admin/            Staff-gated Vite SPA — / (dashboard) /kitchen /history /menu /settings /analytics
│   └── platform/         Internal operator portal — tenant onboarding, subscriptions, system health
├── packages/
│   └── shared/           Typed API client, TanStack hooks, design tokens, UI primitives
├── e2e/                  Playwright — customer ordering, against the mock
├── smoke/                Playwright — deployed apps against the live API
├── docs/
│   ├── openapi.yaml          Source of truth for the backend contract
│   ├── data-model.md         Where the schema lives (pointer — models are in the backend repo)
│   ├── integration-reconciliation.md  Known frontend/backend divergences
│   ├── fcm-notifications.md  Push-notification trigger points (7 types)
│   └── jtbd.md               Jobs To Be Done — user-facing rationale
├── PRD.md                Product requirements (v1.1)
└── tokens/               Source design-token JSON (Figma export)
```

## Quick start

```bash
# Node 20+
npm install

# No backend needed — mock API auto-activates
npm run dev:customer   # http://localhost:5173
npm run dev:admin      # http://localhost:5174 (login: 0803 000 0001 / password)
npm run dev:platform   # http://localhost:5176 (operator portal; any access code in mock)
```

> **Cross-app mock sync:** customer (`:5173`) and admin (`:5174`) are different origins and **don't share `localStorage`**, so on the mock API a customer order won't reach the admin app on its own. Start the relay to bridge them: `npm run relay` (`ws-relay.js`, port 5175), then **refresh both tabs**. Tabs of the *same* app already sync via `localStorage` without it.

To point at a real backend, set `VITE_API_BASE_URL` in a `.env.local` file **at the repository root** (see `.env.example`) — every app's `vite.config.ts` sets `envDir` to the root, so that one file serves all three. It is the backend **origin only** — `http://localhost:8000`, not `.../api/v1`. The `/api/v1` prefix is owned by the shared client (`API_PREFIX` in [`packages/shared/src/api/client.ts`](packages/shared/src/api/client.ts)), so it can't be lost to a mistyped env var. The mock API is tree-shaken when a real backend URL is configured.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev:customer` / `dev:admin` / `dev:platform` | Vite dev server for the named app |
| `npm run build:customer` / `build:admin` / `build:platform` | Production build into `apps/*/dist` |
| `npm run build` | Builds every workspace |
| `npm run typecheck` | `tsc --noEmit` across every workspace |
| `npm run lint` / `lint:fix` | ESLint (flat config) across the repo |
| `npm test` / `test:watch` | Vitest — data-layer + mock-API tests (jsdom) |
| `npm run test:e2e` | Playwright over the customer app, driven against the **mock** |
| `npm run smoke` | Playwright against the **deployed** apps and the **live** API — see below |

## Things that will catch you

Four contract details that are not guessable, each of which has cost real time.

**Tables have two identifiers, and they are not interchangeable.** A table's
*name* (`T1`) repeats across restaurants, so it identifies nothing on its own —
`GET /table/T1` used to return whichever restaurant's `T1` the database found
first, along with their bank accounts. Path params now take the table's uuid;
body and query fields take the name.

| Call | Takes | Wrong one gives |
|---|---|---|
| `GET /table/{id}`, `call-waiter`, `request-pos` | **uuid** | `422` |
| `POST /orders {table}`, `POST /session {tableId}` | **name** | `404` |
| `GET /session/orders?table_id=` | **name** | `200` with an empty list |

That last row is the dangerous one — it succeeds and returns nothing.

**Money is integer kobo, everywhere.** `price: 350000` is ₦3,500. Convert only
at the edges: `formatCurrency()` to render, `nairaToKobo()` to read what a
person typed. Rates are integer **basis points** — `750` is 7.5%.

**Order prices are asymmetric.** `POST /orders` takes each item's *base* price
and the server adds the modifier deltas; the order that comes back carries the
resolved figure. Sending an already-adjusted price double-charges every
modifier.

**The Z-report buckets by UTC, and the restaurant closes out in WAT.** An order
settled at 00:30 Lagos time appears on the *previous* day's report, because the
server stamps `created_at` in UTC and `?date=` filters on that. For a kitchen
that closes at midnight this is not academic: a chunk of Saturday's takings
lands in Friday's close, and the till will not reconcile. Verified — a sale
recorded at `2026-08-19T23:59:46` UTC is absent from `?date=2026-08-20` and
present in full on `?date=2026-08-19`.

It also makes the report look broken when it is not. Querying today's local date
after midnight returns zeros across the board, which reads as "nothing was
recorded" rather than "you asked about the wrong day".

## Testing

Three suites, answering different questions.

| Suite | Runs against | Answers |
|---|---|---|
| `npm test` | mock | Is the data layer correct? |
| `npm run test:e2e` | mock, real browser | Does the UI work? |
| `npm run smoke` | **deployed apps, live API** | Do the two halves still agree? |

The first two cannot see a contract break, because the mock is something we
wrote. The smoke check exists for exactly that gap, and for CORS — which is
enforced by browsers and invisible to any `fetch` from Node. It runs daily in
CI and needs `OSHAP_PLATFORM_TOKEN`; without it the contract half skips and the
browser checks still run.

It creates a throwaway tenant and deletes it, so never point it at a
deployment holding data you care about.

## Backend dev — start here

The contract is [`docs/openapi.yaml`](docs/openapi.yaml). Recommended starting points:

1. **Read [`docs/integration-reconciliation.md`](docs/integration-reconciliation.md) first.** The two repos disagree in three places — response envelope, paths, and the bank-accounts schema. It lists what to change on each side.
2. **Generate the Alembic baseline from `app/connections/models.py`** in the backend repo. `migrations/versions/` is currently empty, so `alembic upgrade head` succeeds without creating any tables.

   > There used to be a `docs/ddl.sql` here, described as the baseline to apply. It had gone stale — no `staff_members`, no `bank_accounts`, no `restaurant_groups`, no inventory fields — so it has been deleted rather than left as a trap. The SQLModel models are the source of truth; see [`docs/data-model.md`](docs/data-model.md).
3. Seed a restaurant, an owner login, tables and menu items. Mirror the mock's dataset in [`packages/shared/src/api/mock.ts`](packages/shared/src/api/mock.ts) — [`docs/smoke-test.md`](docs/smoke-test.md) assumes those tables and items exist.
4. Reconcile against the OpenAPI spec — every endpoint in the three apps is already typed against these schemas.
5. Read [`docs/fcm-notifications.md`](docs/fcm-notifications.md) for the notification trigger points (order placed, payment claimed, payment verified, issue flagged).

**Every response is wrapped** in `{ success, message, code, data }` by the backend's `app/responses.py`. The per-path schemas in `openapi.yaml` describe the `data` member; the shared client unwraps it. See the spec's `Envelope` schema.

Auth surfaces:

- **Customer app** — unauthenticated.
- **Admin app** — staff log in with email/password (`POST /auth/login`), which returns a short-lived JWT access token (15 min) plus a refresh token (7 days). The access token is sent as `Authorization: Bearer` on every admin call; the shared client refreshes it automatically on a 401 and retries, so staff are only returned to the login screen once the refresh token expires too. `GET /auth/me` resolves the staff member (its `role` drives RBAC tab gating) and their restaurant; `restaurant.id` is used for FCM device registration. Roles: `OWNER`, `MANAGER`, `CASHIER`, `WAITER`, `KITCHEN`, `BARTENDER`. Multi-branch owners can scope reads to one branch via the optional `branch_id` query param — the shared client appends it to admin GETs automatically when a branch is selected. There is no `VITE_RESTAURANT_ID` env var.
- **Platform app** — internal operators authenticate with a platform access code; the shared client sends it as the `x-platform-token` header (backend env `PLATFORM_TOKEN`) on all `/platform/*` calls. **Enforce this server-side — the client-side gate is UX only.**

### Admin push notifications (FCM)

1. Create a Firebase project in the console.
2. Add a Web app under **Project Settings → General → Your apps**.
3. Copy the SDK config values into `.env.local` — the `VITE_FCM_*` keys.
4. **Project Settings → Cloud Messaging → Web configuration** → generate a VAPID key pair → set `VITE_FCM_VAPID_KEY`.
5. Backend sends messages from the FastAPI side using a Firebase Admin SDK service account (separate JSON, **not** committed). See [`docs/fcm-notifications.md`](docs/fcm-notifications.md) for trigger points.
6. `firebase-messaging-sw.js` is generated at Vite build from these env vars ([`apps/admin/generateFirebaseSw.ts`](apps/admin/generateFirebaseSw.ts)). **If values are empty the service worker initializes empty and silently fails — the build itself does not error.**

### Menu image storage

The admin app posts FormData to `POST /admin/menu/upload` and expects `{ url: string }` back ([`adminUploadImage`](packages/shared/src/api/admin.ts)). Backend picks one of:

- **S3 + CloudFront** — recommended for production. Backend signs uploads, returns the CDN URL.
- **Local disk + nginx** — fine for single-VPS deploys. Backend writes to a static dir, returns the public path.
- **GCS / R2 / equivalent** — same pattern as S3.

Whichever — the response shape stays `{ url: string }`. No frontend change.

## Environment variables

See [`.env.example`](.env.example). Both apps consume Vite env vars (`VITE_*`). The admin app additionally needs FCM web push credentials.

### Table QR codes

Settings → Tables generates a QR code per table, encoding
`{VITE_CUSTOMER_APP_URL}/menu?table={id}`. Per-table preview with PNG download,
plus **Print QR Codes** for the whole set — the print dialog's "Save as PDF"
covers PDF export, so there's no PDF dependency.

The sheet is rendered into a hidden portal (`#oshap-print-root`) and is
deliberately not theme-aware: paper is white, and a dark-theme admin hitting
Print should not produce an unreadable page. If `VITE_CUSTOMER_APP_URL` points
at localhost, the UI warns before you print codes no guest can scan.

## Design system

Tokens live in [`packages/shared/src/tokens/tokens.css`](packages/shared/src/tokens/tokens.css) as a Tailwind v4 `@theme` block. Both apps `@import` it.

Semantic color utilities (`bg-primary`, `text-on-surface-variant`, etc.) auto-swap based on `[data-theme="dark"]` on `<html>` — no `dark:` prefix needed in markup. The full ramp (`bg-primary-50`, `text-secondary-30`) is also available.

Typography utilities `text-h1` through `text-h6`, `text-p`, `text-caption-*`, plus Figma aliases (`text-p1`, `text-label-l3`, `text-display-h1`, `text-emphasized-lg`). Heading sizes shrink at `<768px`.

### Dark mode

Both apps expose a `<ThemeToggle />` button (from `@oshap/shared/ui`). The user's choice persists in `localStorage` under `oshap-theme`. An inline `<script>` in each `index.html` applies the stored theme synchronously before React mounts, so there's no light-flash on dark loads. New visitors with no stored preference fall back to the OS `prefers-color-scheme`.

### Toasts

Use `toast.success(msg)`, `toast.error(msg)`, `toast.info(msg)` from `@oshap/shared/ui` for any user-visible feedback. The `<Toaster />` is mounted once at each app root; auto-dismiss is 4s, tap to dismiss earlier. Don't use the native `alert()` — there are no callers left in the codebase.

## Adding a new endpoint

1. Add the request/response types to [`packages/shared/src/types/index.ts`](packages/shared/src/types/index.ts).
2. Add a typed fetch fn to the matching `packages/shared/src/api/*.ts` (`menu`, `tables`, `orders`, `payments`, `sessions`, `admin`, `devices`).
3. Add a key to the `queryKeys` factory in [`packages/shared/src/api/keys.ts`](packages/shared/src/api/keys.ts), then a TanStack Query hook in `packages/shared/src/hooks/` that uses it (don't hand-write inline key arrays — invalidation relies on the factory).
4. Add a handler in `packages/shared/src/api/mock.ts` so the frontend keeps working without the backend.
5. Update [`docs/openapi.yaml`](docs/openapi.yaml) so the backend dev sees it.
6. If the endpoint triggers an FCM push, update [`docs/fcm-notifications.md`](docs/fcm-notifications.md).

## Deploy (Vercel)

Each app is its own Vercel project pointing at `apps/customer`, `apps/admin`, or `apps/platform` as the Root Directory. Each directory contains a `vercel.json` with an SPA rewrite — required so client-side routes survive page refresh and direct URL hits.

Per-project env vars (set in Vercel dashboard, **not** committed):
- `VITE_API_BASE_URL` — the FastAPI backend **origin only**, including the scheme (e.g. `https://oshap-cerebrum.useshappay.com`). Do not append `/api/v1`; the client adds it. If unset, the app runs in mock mode (great for previews, not for production).
- Admin only: `VITE_CUSTOMER_APP_URL` — the public customer app, **with `https://`** (e.g. `https://oshap.useshappay.com`). Every table QR code is built from this. A bare domain is not a URL: a QR reader treats `oshap.useshappay.com/menu?table=…` as plain text, and whether a guest's phone opens it, offers to search for it, or does nothing depends on the handset. This has already happened once, after the codes were printed and laminated.
- Admin only: `VITE_FCM_API_KEY`, `VITE_FCM_AUTH_DOMAIN`, `VITE_FCM_PROJECT_ID`, `VITE_FCM_STORAGE_BUCKET`, `VITE_FCM_MESSAGING_SENDER_ID`, `VITE_FCM_APP_ID`, `VITE_FCM_VAPID_KEY`.
- Platform only: **no token env var.** The operator types the access code at the login screen; it is held in sessionStorage, sent as `x-platform-token`, and validated by the backend. Never reintroduce `VITE_PLATFORM_TOKEN` — Vite inlines `VITE_`-prefixed values into the bundle, so a hosted platform app built with it publishes the secret that administers every tenant.

The customer app is unauthenticated; the admin app sends `Authorization: Bearer <access_token>` on every request; the platform app requires `x-platform-token`.
