# Oshap — Product Requirements Document (PRD)

**Version:** 1.1
**Status:** MVP build complete, backend handoff
**Last updated:** 2026-05-27

---

## Changelog — v1.0 → v1.1

The product pivoted significantly during the MVP build. v1.1 documents the system as it actually shipped to the backend handoff. The headline shifts:

- **WhatsApp merchant flow removed.** All merchant operations now happen in a dedicated Admin web app. WhatsApp commands (`PAID T12`, `TODAY`, `PENDING`, etc.) are gone. Push notifications are delivered via **Firebase Cloud Messaging (FCM) web push**, not WhatsApp.
- **Merchant dashboard is now in the MVP.** v1.0 deferred any dashboard to "future scope." v1.1 ships a full Admin SPA with Waiter Dashboard, Kitchen, History, and Menu management.
- **Kitchen workflow added.** Orders now move through `CREATED → PREPARING → READY` before payment. v1.0 had no kitchen states.
- **Group ordering moved into MVP.** v1.0 deferred "shared table ordering" to Phase 3. v1.1 ships PIN-based group sessions on day one.
- **Customer order history added.** v1.0 deferred this; v1.1 ships an Orders tab on the customer app.
- **Multi-restaurant support.** v1.0 implicitly assumed one merchant. v1.1 scopes every resource by `restaurant_id`; one admin PIN maps to one restaurant.
- **Tech stack frozen.** v1.0 had no stack commitment. v1.1 is Vite 6 + React 19 + TypeScript + Tailwind v4 + TanStack Query v5 across two apps in an npm workspace.
- **Payment proof upload.** v1.0 marked screenshot upload as optional/aspirational. v1.1 ships it as a real `proof_url` on the Payment entity.
- **Admin auth surface defined.** v1.0 was silent on merchant auth. v1.1 uses an `x-admin-pin` header; one PIN per restaurant; the customer app remains fully unauthenticated.

---

# 1. Product Overview

**Oshap** is a QR-based table-ordering and payment system for restaurants and bars. Customers scan a QR at their table, browse a menu, place orders, and pay via bank transfer — no app install, no waiter call, no login.

Merchants run a web-based Admin app that receives real-time FCM push notifications for new orders, payment claims, and flagged issues, and lets staff drive the kitchen, verify payments, and manage the menu without a POS.

The system ships as two SPAs against a shared FastAPI + PostgreSQL backend (separate repo).

---

# 2. Objectives

## Primary

- Reduce customer wait time for ordering and paying.
- Eliminate dependency on waiters for order capture and payment collection.
- Prevent payment leakage (staff diverting cash / unverified transfers).
- Give merchants a single screen for kitchen + payment + reconciliation, replacing the WhatsApp-driven workflow originally envisioned.

## Secondary

- Increase order frequency per table (frictionless re-ordering, group ordering).
- Build the foundation for a full restaurant OS (history, analytics, multi-location).

---

# 3. Target Users

## Customers

- Diners at restaurants
- Patrons at bars and lounges (high-frequency repeat orders, group tabs)

## Merchants

- Small to medium restaurants and bars
- Businesses without an existing POS
- Multi-staff venues that need a shared kitchen + waiter view

---

# 4. System Architecture

Two apps, one shared package, one backend.

```
oshap/                              this repo (frontend only)
├── apps/
│   ├── customer/        Public SPA — /menu /checkout /pay /orders
│   └── admin/           Merchant SPA — /dashboard /kitchen /history /menu
├── packages/
│   └── shared/          Typed API client, TanStack hooks, design tokens, utils
└── docs/openapi.yaml    Contract for the FastAPI backend (separate repo)
```

| Layer | Tool |
|---|---|
| Apps | Vite 6 + React 19 + TypeScript |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 (CSS-first `@theme` block) |
| Data | TanStack Query v5 over typed `fetch` wrappers |
| Push (admin only) | Firebase Cloud Messaging (web push) |
| Package manager | npm workspaces (Node 20+) |
| Backend | FastAPI + PostgreSQL 15 (separate repo, contract in [`docs/openapi.yaml`](docs/openapi.yaml)) |

**Auth surface (MVP):**

- Customer app — fully unauthenticated. No login, no session cookie, no JWT.
- Admin app — `x-admin-pin` header attached by `packages/shared/src/api/client.ts`. One PIN per restaurant; `GET /admin/me` resolves the PIN to its restaurant on login.

---

# 5. Core Features — Customer App

## 5.1 QR-based table entry

Each table has a printed QR encoding `https://oshap.app/menu?table=T12`. Scanning loads the menu scoped to that table's restaurant. No app install. Works on any mobile browser.

## 5.2 Menu browsing

- Restaurant name + table badge in header.
- Category tabs (built dynamically from menu items).
- Search.
- Item cards: image, name, price, optional description.
- "Add" button per item; quantity controls inline.

## 5.3 Cart

- Persists per browser tab.
- Add / remove / change quantity.
- Running total in the cart bar.
- Cart drawer for full review before checkout.

## 5.4 Order placement

1. Customer taps "Checkout".
2. Order summary shown with running total.
3. Customer confirms — order is created (`POST /order`) and assigned a unique reference `OSHAP-{tableId}-{4-digit random}`.
4. Order appears in the customer's "My Orders" tab and on the admin Kitchen screen.

Pre-session orders are scoped by an anonymous `device_token` (UUID per browser tab) so one phone can't see another phone's orders at the same table.

## 5.5 Group ordering (shared session)

Promoted from v1.0 Phase 3 into MVP.

- Anyone at the table can tap "Order together" to **start** a session — backend generates a 4-digit PIN.
- Others tap "Join" and enter the PIN. Existing unclaimed orders on their device migrate into the session.
- All session members see the shared tab and can pay individually or jointly.
- Sessions are `ACTIVE` until the admin closes the table or all orders are paid.

## 5.6 Payment

Bank transfer with reference matching — no payment gateway in v1.1.

The Pay Bill screen shows:

- Total amount (sum of unpaid orders on the device or session)
- Bank name
- Account name
- Account number
- Payment reference (the order reference, or combined for multi-order pay)

After transferring, the customer taps **"I've sent the money"**, optionally uploads a screenshot (`proof_url`), and the orders move to `PAYMENT_PENDING` (Order) / `CLAIMED` (Payment). The admin sees the table go pending and verifies in the Waiter Dashboard.

## 5.7 Customer order history

A "My Orders" tab lists every order on this device or session with its current status (`CREATED → PREPARING → READY → PAYMENT_PENDING → CONFIRMED`).

---

# 6. Core Features — Admin App

A merchant SPA — gated by a 4-digit PIN — that replaces the v1.0 WhatsApp command surface entirely.

## 6.1 PIN login + restaurant resolution

- Staff enter a 4-digit PIN. Shared `client.ts` attaches it as `x-admin-pin` on every admin request.
- `GET /admin/me` resolves the PIN to a `Restaurant` (one PIN = one restaurant). The frontend stores the restaurant in sessionStorage and uses `restaurant.id` for FCM device registration.

## 6.2 Waiter Dashboard

- Live table list (polled every 5s via `GET /admin/tables`).
- Each table card shows: unpaid total, pending-payment total, and action buttons.
- **Verify Payment** — `POST /admin/verify` flips all `PAYMENT_PENDING` orders on that table to `CONFIRMED`.
- **Clear Table** — `POST /admin/close` with reason `paid` or `abandoned`. Closing an abandoned table cancels its orders.

## 6.3 Kitchen view

- Lists active orders in `CREATED`, `PREPARING`, `READY` states.
- Kitchen taps "Start" → `PREPARING`. Taps "Ready" → `READY`.
- Customer sees the same status update on their My Orders tab.

## 6.4 History

- Paginated list of `CONFIRMED` + `CANCELLED` orders.
- Per-page summary: confirmed count, cancelled count, page revenue.
- Filterable by date range.

## 6.5 Menu management

- CRUD on menu items: name, price, category, description, image, availability, sort order.
- **Image upload**: admin posts FormData to `POST /admin/menu/upload`; backend returns `{ url }`. Storage backend (S3 + CloudFront, local disk + nginx, or GCS/R2) is a backend deployment choice — the response shape is fixed.

## 6.6 FCM push notifications

Admin staff register their browser as an FCM device on login (`POST /devices/register` with `fcm_token` and `restaurant_id`). The backend sends push on four triggers:

- New order placed
- Payment claimed (customer hit "I've sent the money")
- Payment verified (cross-device sync to other staff)
- Issue flagged

Trigger points are documented in [`docs/fcm-notifications.md`](docs/fcm-notifications.md). The Firebase service worker is generated at build time from `VITE_FCM_*` env vars (see [`apps/admin/generateFirebaseSw.ts`](apps/admin/generateFirebaseSw.ts)). FCM is not imported in the customer app.

---

# 7. Data Model & Lifecycles

Full schema lives in [`docs/data-model.md`](docs/data-model.md) and [`docs/ddl.sql`](docs/ddl.sql). Key entities: `Restaurant`, `Table`, `MenuItem`, `Order`, `OrderItem`, `Payment`, `TableSession`, `DeviceToken`.

## 7.1 Order lifecycle (v1.1 — kitchen states added)

```
CREATED ──► PREPARING ──► READY
   │                         │
   │  (customer claims pay)  │
   └────► PAYMENT_PENDING ◄──┘
              │
        ┌─────┴─────┐
        ▼           ▼
    CONFIRMED   CANCELLED
   (verified)  (abandoned, admin force-close)
```

## 7.2 Payment lifecycle

```
NOT_PAID ──► CLAIMED ──► CONFIRMED   (auto on order confirm)
                    └──► VERIFIED    (admin manual verify)
```

One payment per order (`unique order_id`). Re-submissions upsert.

## 7.3 Session lifecycle

```
ACTIVE ──► CLOSED   (admin closes table, or all session orders paid)
```

## 7.4 Reference format

`OSHAP-{tableId}-{4-digit random}` — globally unique, used as the bank-transfer reference for reconciliation.

## 7.5 Matching logic

Reconciliation against bank alerts (manual today, automatable later) matches on:

- Payment reference (primary key)
- Amount (sanity check)
- Table ID (extracted from the reference)

---

# 8. UX Requirements

## Performance

- Load time < 2s on 3G.
- Lightweight bundle; tree-shaken mock API in prod builds.
- Optimized menu images (admin upload pipeline handles resize).

## Interaction

- ≤ 4 taps from QR scan to order placed.
- No login. No typing required for the golden path.
- Clear CTAs; bottom nav on customer app.

## First screen

- Restaurant name + table prominent.
- Categories before search — reduce decision fatigue.

## Design system

- Tailwind v4 `@theme` block in [`packages/shared/src/tokens/tokens.css`](packages/shared/src/tokens/tokens.css).
- Semantic color utilities (`bg-primary`, `text-on-surface-variant`) auto-swap on `[data-theme="dark"]`. No `dark:` prefix in markup.
- Typography scale (`text-h1` … `text-h6`, `text-p`, `text-caption-*`, plus Figma aliases). Headings shrink under 768px.
- Spacing/radius/typography fully tokenized; no inline styles or CSS modules.

---

# 9. Success Metrics

## Customer

- QR scan → first order conversion rate
- Time from scan to order placed
- Drop-off rate at each step

## Business

- Orders per table per day
- Average order value
- Payment completion rate (`CLAIMED` → `CONFIRMED`)
- Re-order rate within a session

## Merchant

- Time from `PAYMENT_PENDING` → `CONFIRMED` (verification latency)
- Kitchen throughput (`CREATED` → `READY`)
- Daily reconciliation accuracy (claimed vs. bank-reconciled)

---

# 10. Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Slow internet at venue | Lightweight bundle; menu cached via TanStack Query; mock API for offline dev |
| Payment fraud (false "I've paid" claims) | Reference codes + admin manual verify before order is considered paid; screenshot proof upload |
| Staff don't notice new orders | FCM web push with sound; multi-device registration so several phones/tablets ring |
| Customer loses session on refresh | `device_token` in sessionStorage; session PIN re-joinable |
| One PIN leaked across staff | Per-restaurant rotation; future scope: per-user accounts |
| FCM env misconfigured | Service worker initializes empty and silently fails — flagged in `docs/fcm-notifications.md` and README setup steps |
| Backend down | Customer app shows clear error states via `QueryError`; mock API for dev |

---

# 11. Rollout Plan

## Phase 1 — MVP build ✅ (complete, this handoff)

Frontend shipped: customer app (menu, cart, checkout, pay, orders, group sessions), admin app (dashboard, kitchen, history, menu, FCM), shared package, OpenAPI contract, DDL.

## Phase 2 — Backend integration

- Backend team implements FastAPI against [`docs/openapi.yaml`](docs/openapi.yaml).
- Apply [`docs/ddl.sql`](docs/ddl.sql) as the initial Alembic migration.
- Wire FCM Admin SDK on the backend (separate service account).
- Pick image storage backend (S3/CloudFront recommended).

## Phase 3 — Pilot

- Deploy to 1–2 venues.
- Monitor: scan-to-order conversion, payment verification latency, kitchen state usage.
- Iterate on copy, default categories, error messaging.

## Phase 4 — V1.2 enhancements

- Upsells / "frequently ordered with" on item cards
- Per-staff accounts (replace shared PIN)
- Loyalty: returning device recognition
- Tip flow
- Optional payment gateway (Paystack / Flutterwave) alongside bank transfer

---

# 12. Future Scope

- Payment gateway integration (Paystack, Flutterwave)
- Multi-location merchant accounts
- Reservations + pre-ordering
- Inventory / stock-out auto-disable
- CRM and loyalty
- Analytics dashboard
- Native mobile wrappers (only if web push limitations bite)

---

# 13. Out of Scope for v1.1

Documented explicitly so backend and product stay aligned:

- WhatsApp Business integration (deprecated from v1.0)
- Payment gateways (bank transfer + manual verify only)
- Customer accounts / login
- Tipping
- Multi-location admin (one PIN = one restaurant)
- Native apps
- Offline order queueing

---

# 14. Key Principle

> Oshap must always be faster than calling a waiter.
> If it's not faster, it fails.

Every UX decision and every backend optimization defers to this rule.
