# Oshap — Implementation Phases

**Last updated:** 2026-06-03
**Companion docs:** [`PRD.md`](../PRD.md) · [`docs/jtbd.md`](jtbd.md) · [`docs/smoke-test.md`](smoke-test.md)

---

## Status legend

| Symbol | Meaning |
|---|---|
| ✅ | Complete |
| 🔄 | In progress |
| ⏭️ | Deferred (tracked, not started) |
| ⬜ | Not started |

---

## Phase 0 — Handoff Polish

**Goal:** Tighten the MVP build before adding anything new.
**Status:** ✅ Complete (one deferred item)

| Task | Status | Notes |
|---|---|---|
| Theme persistence + no-FOUC inline script | ✅ | `localStorage` under `oshap-theme`; falls back to OS `prefers-color-scheme` for first-time visitors |
| Replace all `alert()` with toast system | ✅ | New `<Toaster />` + `toast` util in `@oshap/shared/ui`; 12 call-sites replaced across customer + admin |
| Typecheck across all workspaces | ✅ | `npm run typecheck` passes clean |
| README sweep | ✅ | Added dark mode docs, Toaster docs, Vercel deploy section, product doc links |
| Smoke-test checklist | ✅ | [`docs/smoke-test.md`](smoke-test.md) — 18 paths mapped to JTBD codes |
| Build asset verification | ✅ | Admin: favicon, maskable icon, manifest, firebase SW. Customer: favicon. Both have inline theme script. |
| ESLint + flat config | ✅ | Installed v9 flat config, fixed all violations. Added to smoke-test. |

---

## Phase 0.5 — ESLint Setup

**Goal:** Restore the broken lint pipeline.
**Status:** ✅ Complete
**Effort:** ~half a day
**Dependencies:** None

**Tasks:**
- Install `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `globals`
- Write `eslint.config.mjs` at repo root (flat config, TypeScript-aware)
- Add `lint` script back to each `package.json`
- Fix any existing violations flagged by the first run
- Add `npm run lint` to the Phase 3 smoke-test gate

---

## Phase 1 — Backend Integration

**Goal:** Real FastAPI backend replaces the mock. Everything that works in mock works against Postgres.
**Status:** ⬜ Not started (blocked on backend team)
**Effort:** 2–4 weeks (backend team primary)
**Dependencies:** Backend team, Firebase project, image storage bucket

**Tasks:**
- Backend implements all endpoints in [`docs/openapi.yaml`](openapi.yaml) (customer + admin)
- Apply [`docs/ddl.sql`](ddl.sql) as initial Alembic migration
- Set `VITE_API_BASE_URL` in each Vercel project's env vars
- Wire Firebase Admin SDK on backend for FCM push (7 trigger types in [`docs/fcm-notifications.md`](fcm-notifications.md))
- Choose and configure image storage (S3 + CloudFront recommended)
- Run full [`docs/smoke-test.md`](smoke-test.md) against staging — every path, mock and real
- End-to-end FCM test: call waiter, request POS → real push lands on real admin device
- Verify cross-device group ordering works (Postgres session store = no browser-local limitation)

---

## Phase 2 — Pilot Prep

**Goal:** One venue is ready to go live.
**Status:** ⬜ Not started
**Effort:** 1–2 weeks
**Dependencies:** Phase 1

**Tasks:**
- Onboard pilot restaurant: create restaurant record, bank details, table set, menu items
- Print and laminate QR codes per table
- Train staff (waiter dashboard, kitchen view, verify payment, clear table) — target: < 30 min
- Write one-page staff runbook (what the PIN unlocks, what each screen does, what to do if an order gets stuck)
- Instrument basic analytics events (order placed, payment claimed, payment verified) — log-level OK for now
- Set up error monitoring (Sentry recommended) on both Vercel projects

---

## Phase 3 — Pilot Launch

**Goal:** Run live, observe, and iterate.
**Status:** ⬜ Not started
**Effort:** 2–4 weeks (ongoing)
**Dependencies:** Phase 2

**Tasks:**
- Deploy to 1–2 venues
- Daily check-ins with venue staff for first 2 weeks
- Track JTBD success metrics (from [`docs/jtbd.md`](jtbd.md#success-outcomes)):
  - Customer: time-to-first-order < 90s, drop-off < 20%
  - Waiter: call → aware < 15s
  - Owner: zero unaccounted-for delivered orders
- Hotfix loop for real-world issues
- Capture feedback for v1.2 backlog

---

## Phase 4 — Restaurant Settings UI

**Goal:** Owners manage their own restaurant without needing a developer or database access.
**Status:** ✅ Complete
**Effort:** 1–2 weeks
**Dependencies:** Phase 1 (needs real backend to persist settings)
**Can run in parallel with Phase 1–3 (frontend-only until backend is wired)**

**Tasks:**
- Add `/admin/settings` route to admin app
- Forms: restaurant info (name, description), operating hours, bank account details, logo upload
- New backend endpoints: `GET /admin/settings`, `PATCH /admin/settings`
- Add to [`docs/openapi.yaml`](openapi.yaml) and shared types/hooks/mock

---

## Phase 5 — Customer Notification Center

**Goal:** Persistent customer notification feed so nothing is missed.
**Status:** ✅ Complete
**Effort:** 1–2 weeks
**Dependencies:** None — frontend-only
**Can start immediately**

**Tasks:**
- Bell icon in customer header (all routes)
- Slide-up bottom sheet: notification panel
- `localStorage`-backed feed (key: `oshap-notifications-{tableId}`)
- Hook every existing toast (`toast.success / error / info`) to also push an entry into the feed
- Mark-as-read and clear-all actions
- Unread badge count on the bell icon

---

### [x] Phase 6: Per-user Accounts + RBAC

**Goal:** Replace the shared PIN with individual staff accounts and role-separated access.
**Status:** ⬜ Not started
**Effort:** 3–5 weeks
**Dependencies:** Phase 1

**Roles to implement:** Owner, Manager, Cashier, Waiter, Kitchen Staff, Bartender

**Tasks:**
- Backend: `User` entity, `Role` enum, per-user sessions (JWT or session token)
- Admin app: replace PIN screen with email/password login
- Permission middleware: per-route access gates
- Staff Management UI: add/remove/assign role
- Kitchen view: show food orders only (currently shows all)
- Bartender view: show drink orders only (currently no split)
- Owner-only: analytics, settings, staff management
- Cashier: payment-only dashboard view
- Audit log for payment verification actions

---

## Phase 7 — Analytics Dashboard

**Goal:** Give owners data-driven visibility into operations.
**Status:** 🔄 In progress
**Effort:** 2–3 weeks
**Dependencies:** Phase 6 (owner-only gate)

**Tasks:**
- Backend aggregation endpoints (revenue by day/week/month, popular items, peak hours, table performance, staff activity)
- `/admin/analytics` route with chart components
- Date range picker
- CSV export
- Add to [`docs/openapi.yaml`](openapi.yaml) and shared types/hooks/mock

---

## Phase 8 — Payment Gateway + Tip

**Goal:** Card payments auto-verify via webhook; no manual waiter verification needed for card flows.
**Status:** ⬜ Not started
**Effort:** 2–4 weeks
**Dependencies:** Phase 1

**Tasks:**
- Integrate Paystack or Flutterwave (webhook on backend, verify signature)
- Customer pay page: "Pay by Card Online" CTA → redirect to gateway checkout → callback
- Tip slider on pay page (optional, pre-checkout)
- Auto-confirm orders on successful webhook → skip waiter verification step
- `pos_requested` FCM flow stays for in-person card (no gateway involved)

---

## Phase 9 — Real-Time Push (SSE)

**Goal:** Replace 5-second polling with server-sent events for sub-second updates.
**Status:** 🔄 In progress
**Effort:** 2–3 weeks
**Dependencies:** Phase 1

**Tasks:**
- Backend: `GET /events` SSE stream scoped by table or restaurant
- Frontend: `EventSource` wrapper in shared hooks, reconnect + missed-event recovery
- Replace `setInterval` polling on dashboard, pay page, My Orders
- Polling fallback for environments that block SSE
- Test on real mobile browsers (iOS Safari SSE behaviour)

---

## Phase 10 — Loyalty + CRM

**Goal:** Recognize returning customers and drive repeat visits.
**Status:** ⬜ Not started
**Effort:** 4–8 weeks
**Dependencies:** Phase 6 (customer identity)

**Tasks:**
- Optional OTP login for customers (phone number)
- Customer profile: order history, favourite items, points balance
- Points accrual rules (configurable by owner)
- Promotions: discount codes, happy-hour menus
- Segmented push to customer devices
- Repeat-order recommendations ("Last time you ordered...")

---

## Phase 11 — Reservations + Pre-ordering

**Goal:** Enable customers to book a table and pre-order before they arrive.
**Status:** ⬜ Not started
**Effort:** 3–5 weeks
**Dependencies:** Phase 6

**Tasks:**
- `Reservation` entity: table, time slot, party size, deposit
- Customer booking flow (separate from QR scan)
- Admin reservation management
- Pre-order link → customer browses menu and submits cart before arriving
- QR scan auto-links to pre-existing reservation session

---

## Phase 12 — Inventory + Multi-Branch + Platform Admin

**Goal:** Full restaurant OS for group operators and internal Oshap management.
**Status:** ✅ Complete (frontend mock-first; real backend wiring deferred to Phase 1)
**Effort:** 8+ weeks (estimated) — delivered as 3 pillars

### Pillar 1 — Inventory Management ✅
- `stock_count` + `low_stock_threshold` on `MenuItem` type and mock seed
- `PATCH /admin/inventory/:id` + `GET /admin/inventory/alerts` mock routes
- `useAdminInventoryAlerts()` + `useAdminUpdateStock()` hooks
- Admin Menu page: stock count badge, inline editor, "Untracked" state
- `LowStockBanner.tsx` on Menu page
- Dashboard: Low Stock Items chip (links to /menu)

### Pillar 2 — Multi-Branch ✅
- `RestaurantGroup`, `GroupAnalyticsResponse` types
- Mock routes: `GET /admin/group`, `GET /admin/group/analytics`
- `useAdminGroup()` + `useAdminGroupAnalytics()` hooks
- Branch selector dropdown in admin nav (Owner only, stores in `localStorage`)
- `/analytics/group` route with revenue bar chart + per-branch breakdown
- "Group View →" link from single-branch analytics page

### Pillar 3 — Platform Admin App ✅
- `apps/platform` — new Vite + React + Tailwind app (`npm run dev:platform`, port 5175)
- `VITE_PLATFORM_TOKEN` gate (static token check, sessionStorage-backed)
- Platform mock routes: `GET/POST/PATCH /platform/restaurants`, `GET /platform/health`
- `usePlatformRestaurants()`, `usePlatformRestaurant()`, `usePlatformHealth()`, `usePlatformCreateRestaurant()`, `usePlatformUpdateRestaurant()` hooks
- Routes: `/` (dashboard), `/restaurants`, `/restaurants/new` (2-step wizard), `/restaurants/:id`, `/subscriptions` (mock billing table), `/health` (uptime/latency/error metrics)
- `apps/platform/vercel.json` for SPA rewrite

---

## Phase summary

```
Phase 0    ✅  Handoff polish
Phase 0.5  ✅  ESLint setup
Phase 1    ⬜  Backend integration         ← current priority
Phase 2    ⬜  Pilot prep
Phase 3    ⬜  Pilot launch
Phase 4    ✅  Restaurant Settings UI
Phase 5    ✅  Customer Notification Center← can start immediately
Phase 6    ⬜  Per-user accounts + RBAC    ← after Phase 1
Phase 7    ⬜  Analytics dashboard         ← after Phase 6
Phase 8    ⬜  Payment gateway + tip       ← after Phase 1
Phase 9    ⬜  Real-time push (SSE)        ← after Phase 1
Phase 10   ⬜  Loyalty + CRM              ← after Phase 6
Phase 11   ⬜  Reservations + pre-ordering ← after Phase 6
Phase 12   ✅  Inventory + multi-branch + platform admin
```
