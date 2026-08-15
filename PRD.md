# Oshap — Product Requirements Document (PRD)

**Version:** 2.0
**Status:** Frontend complete (extended feature set) — backend integration pending
**Last updated:** 2026-06-04

> **What changed since v1.1:** the product grew from a two-app, shared-PIN MVP into a
> three-app system with per-user RBAC, analytics, settings, inventory, multi-branch
> support, a platform operator portal, a customer notification center, and SSE-based
> live updates. This document reflects the **current** shipped frontend. Items still
> not built are listed in [§16 Remaining Work / Roadmap](#16-remaining-work--roadmap).

---

# 1. Product Overview

## Product Name
Oshap

## Tagline
Order shap shap.

## Summary
Oshap is a QR-first ordering and payment platform for restaurants and bars.

Customers scan a QR code at their table, browse the menu, place orders, pay via bank
transfer or by requesting a POS terminal, and receive real-time order updates. Restaurant
staff manage orders, kitchen, payments, tables, menu, inventory, analytics, and settings
through an Admin web app with **per-user email/password login and role-based access**.
Internal Oshap operators onboard and manage tenant restaurants through a separate
**Platform** portal.

The goal is to eliminate ordering friction, reduce payment leakages, give merchants live
visibility into table state, and make ordering through Oshap measurably faster than calling
a waiter.

---

# 2. Problem Statement

Restaurants and bars commonly experience:
- Long wait times before customers can order
- Dependence on waiters for order capture
- Manual payment verification and payment leakages
- Poor visibility into active tables and stock
- Fragmented communication between front-of-house and kitchen

Customers commonly experience:
- Delayed service
- Difficulty getting staff attention
- Unclear order status
- Slow bill settlement

---

# 3. Product Vision

Create the fastest and simplest way for customers to order and pay at restaurants and bars
while giving merchants live visibility and control over operations — and giving Oshap a
scalable way to onboard and operate many tenants.

---

# 4. Target Users

## Customers
Restaurant guests, bar patrons, walk-in customers. No account required.

## Restaurant Staff (role-based)
Each staff member logs in with their own email + password. Access is gated by role:

| Role | Access |
|---|---|
| **Owner** | Everything, incl. analytics, settings, staff management, multi-branch switcher |
| **Manager** | Tables, kitchen, history, menu, settings |
| **Cashier / Waiter** | Tables dashboard (verify/clear) |
| **Kitchen / Bartender** | Kitchen/Bar order display only |

## Platform Operators (internal Oshap)
Staff who onboard tenant restaurants, manage subscription tiers, and monitor system health
through the Platform app.

---

# 5. Product Structure

Three web applications in a single npm workspace (`apps/*`), sharing one package
(`packages/shared`).

## Customer Web Application (`apps/customer`)
Public, unauthenticated SPA. QR-first ordering experience. Dev port `5173`.

## Admin Web Application (`apps/admin`)
Staff SPA with email/password login + RBAC. Dashboard, kitchen, history, menu + inventory,
analytics, settings. FCM web push. PWA-installable. Dev port `5174`.

## Platform Web Application (`apps/platform`)
Internal operator portal — tenant onboarding, subscriptions, system health. Gated by a
platform access code (`x-platform-token`). Dev port `5176`.

> An optional dev WebSocket relay (`ws-relay.js`, port `5175`) syncs mock state across
> customer/admin tabs in one browser; it is not required.

---

# 6. Customer Experience

## Entry Point
Customer scans a QR code printed on the table. The QR encodes:

```
https://oshap.app/menu?table=T12
```

The table ID resolves to its restaurant on the backend (`GET /table/:id`). No login. No
account. Pre-session orders on a single device are scoped by an anonymous `device_token`
(UUID stored in `sessionStorage` per browser tab).

### Unknown table &mdash; decided, not built

**Decision:** an unrecognised table ID is a **hard stop**. The customer app should refuse to
render the menu and show a dead end &mdash; *"This table doesn't exist. Check the code on your
table, or ask a member of staff."* &mdash; with no path forward into ordering.

**Why it needs deciding at all.** `GET /table/:id` already 404s for an unknown ID, but the app
degrades silently instead of stopping. The table pill in the header reads from the URL query
param rather than the API, so `?table=T13` renders a convincing `Table T13` badge beside an
address that has quietly fallen back to the app name. The guest sees a working menu and can
order against a table that does not exist.

**How it happens.** Not from a printed code &mdash; the QR generator only emits codes for
tables that exist in Settings &rarr; Tables. It happens from hand-typed URLs, shared links,
and codes left on a table after that table was renamed or removed.

**Scope when built:** applies to every customer route, not just the menu, since each reads
`?table=` independently. Behaves identically against the mock and a real backend, because both
404 the same way.

---

# 7. Customer Features

## 7.1 Menu Browsing
- Categories derived from the distinct values of `MenuItem.category` (no separate Category entity)
- Items: name, price, description, image, availability
- Search within the menu

## 7.2 Cart Management
- Add, remove, change quantity; running total; persists per browser tab

## 7.3 Order Placement
- Review summary in cart drawer → `POST /orders`
- Reference `OSHAP-{tableId}-{4-digit random}`
- Order enters the kitchen workflow as `CREATED`

## 7.4 Group / Shared Table Ordering ("Order Together")
- Any customer can **Start a session** → backend generates a 4-digit PIN
- Others **Join** with the PIN; their unclaimed orders migrate into the session
- Members share the tab and can pay individually or jointly
- Sessions are `ACTIVE` until the table is closed or all session orders are paid

## 7.5 Payment

### Bank Transfer (default)
Pay Bill screen shows bank name, account name, account number, amount payable, and the
order reference. Customer transfers, taps **"I've Sent the Money"** (optional proof
upload). Orders → `PAYMENT_PENDING` / Payment → `CLAIMED`. Staff verify on the dashboard.

### Request a POS
`POST /table/{id}/request-pos` moves unpaid orders to `PAYMENT_PENDING` with `CLAIMED`
payments and fires an FCM `pos_requested` push. Staff bring the POS; the same **Verify
Payment** handler confirms it. No separate "mark POS paid" endpoint.

## 7.6 Call a Waiter
Service-bell icon in every customer header → `POST /table/{id}/call-waiter` → FCM
`waiter_called` push + audio chime + in-app admin alert. Backend dedupes within 30 s per
restaurant + table.

## 7.7 Order Tracking
"My Orders" shows every order on this device/session with live status:

```
CREATED → PREPARING → READY → PAYMENT_PENDING → CONFIRMED
```

## 7.8 Notification Center
Persistent notification feed behind a bell icon in the customer header (all routes).
`localStorage`-backed per table (`oshap-notifications-{tableId}`), with unread badge,
mark-as-read, and clear-all. Every toast also pushes an entry into the feed.

---

# 8. Admin Application

## 8.1 Authentication & RBAC
- Staff log in with **email + password** (`POST /auth/login`)
- Login returns a JWT access token (15 min) and a refresh token (7 days); the access token is sent as `Authorization: Bearer` on every admin request, and the shared client refreshes it on a 401 and retries
- `GET /auth/me` resolves the staff member (with `role`) and their restaurant; the
  frontend stores the restaurant in `sessionStorage` and uses `restaurant.id` for FCM
  device registration
- `user.role` gates which tabs/routes render (`RoleGate`). Roles: `OWNER`, `MANAGER`,
  `CASHIER`, `WAITER`, `KITCHEN`, `BARTENDER`
- 401 from any admin endpoint clears the session and returns to login

## 8.2 Modules

### Waiter Dashboard (`/`)
Live table list, per-table unpaid/pending totals, **Verify Payment** (`POST /admin/verify`)
and **Clear Table** (`POST /admin/close`, reason `paid`/`abandoned`). Also surfaces a
low-stock chip.

### Kitchen / Bar (`/kitchen`)
Active orders in `CREATED`/`PREPARING`/`READY`; tap to advance. Kitchen vs Bar framing by role.

### History (`/history`)
Paginated `CONFIRMED`/`CANCELLED` orders, per-page summary, table + date filters.

### Menu + Inventory (`/menu`)
CRUD on menu items (name, price, category, description, image, availability, sort order;
image upload via `POST /admin/menu/upload`). **Inventory**: per-item `stock_count` +
`low_stock_threshold`, inline stock editor, "Untracked" state, low-stock alerts
(`GET /admin/inventory/alerts`), and auto-disable at zero stock (re-enabled on restock).

### Analytics (`/analytics`, Owner only)
Revenue over time, popular items, peak hours, table performance, staff activity; date-range
picker; CSV export. **Group view** (`/analytics/group`) aggregates revenue across branches.

### Settings (`/settings`, Owner/Manager)
- **General** — restaurant info, operating hours, bank details, logo upload
- **Tables** — add/remove tables
- **Staff** (Owner only) — add/edit/remove staff and assign roles

### Multi-branch switcher
Owners of a multi-branch group get a branch selector in the nav; selecting a branch scopes
admin reads via a `branch_id` query param (`GET /admin/group`, `GET /admin/group/analytics`).

## 8.3 Push Notifications (FCM)
After login the admin device registers via `POST /devices/register`. Seven trigger types
(full spec in [`docs/fcm-notifications.md`](docs/fcm-notifications.md)): `new_order`,
`order_ready`, `payment_claimed`, `payment_verified`, `table_closed`, `waiter_called`,
`pos_requested`. Foreground: `AlertCenter` plays a Web-Audio chime and renders top-right
toasts; background: `firebase-messaging-sw.js` shows OS notifications.

## 8.4 PWA
Installable to home screen (`display: standalone`), manifest + brand/maskable icons +
iOS apple-touch-icon. No offline data cache (depends on live state).

---

# 9. Platform Application

Internal operator portal (`apps/platform`), gated by a platform access code validated
client-side and sent to the backend as the `x-platform-token` header (env `PLATFORM_TOKEN`)
on all `/platform/*` calls. **The token must be enforced server-side; the client gate is UX only.**

Modules:
- **Dashboard** — tenant overview + quick onboard
- **Restaurants** — searchable/filterable tenant list (`GET /platform/restaurants`)
- **Onboard** — two-step wizard creating a tenant (`POST /platform/restaurants`)
- **Restaurant detail** — view a tenant; change subscription tier; activate/deactivate
  (`PATCH /platform/restaurants/{id}`)
- **Subscriptions** — tier/billing overview (FREE / STARTER / PRO / ENTERPRISE)
- **Health** — system metrics (uptime, latency, error rate, active sessions) via
  `GET /platform/health`

---

# 10. Data Model & Lifecycles

The schema lives in the backend's SQLModel models — see
[`docs/data-model.md`](docs/data-model.md) for where and why. The contract between the repos
is [`docs/openapi.yaml`](docs/openapi.yaml); known divergences are tracked in
[`docs/integration-reconciliation.md`](docs/integration-reconciliation.md).

Entities: `Restaurant` (+ group/branch + platform fields: `subscription_tier`, `is_active`,
`owner_email`, `table_count`, `monthly_orders`), `StaffMember` (+ `role`), `MenuItem`
(+ `stock_count`, `low_stock_threshold`), `Order`, `OrderItem`, `Payment`, `TableSession`,
`DeviceToken`, `RestaurantGroup`.

## 10.1 Order Lifecycle
```
CREATED ──► PREPARING ──► READY
   │                         │
   │  (customer claims pay)  │
   └────► PAYMENT_PENDING ◄──┘
              │
        ┌─────┴─────┐
        ▼           ▼
    CONFIRMED   CANCELLED
```

## 10.2 Payment Lifecycle
```
NOT_PAID ──► CLAIMED ──► CONFIRMED   (auto, on order confirm)
                    └──► VERIFIED    (admin manual verify)
```
One payment per order (`unique order_id`); re-submissions upsert. A wrongful claim is
resolved by **Clear Table → abandoned** (orders → `CANCELLED`).

## 10.3 Session Lifecycle
```
ACTIVE ──► CLOSED   (admin closes table, or all session orders are paid)
```

## 10.4 Reference Format
`OSHAP-{tableId}-{4-digit random}` — doubles as the bank-transfer reference.

## 10.5 Scoping
Every operational resource is scoped by `restaurant_id`; one staff login maps to one
restaurant. Multi-branch owners scope reads to a branch via `branch_id`.

---

# 11. Real-Time Updates

- **SSE** — a global event stream (`GET /events`) consumed by `useGlobalSSE`; push events
  (`ORDER_CREATED`, `STATUS_CHANGED`, `PAYMENT_PENDING`, `PAYMENT_VERIFIED`, `TABLE_CLOSED`)
  invalidate the affected TanStack Query caches for near-instant updates.
- **FCM push** — instant admin alerts in foreground (chime + toast) and background (OS).
- **Polling fallback** — some queries (e.g. inventory alerts, platform health) refetch on
  an interval; polling also covers environments where SSE is blocked.

---

# 12. Notifications

## 12.1 Admin
FCM web push (foreground + background), in-app alert toasts + audio chime (foreground),
OS notifications via service worker (background).

## 12.2 Customer
Persistent notification center (bell + feed, see [§7.8](#78-notification-center)) plus
transient action/error toasts that also feed the center.

---

# 13. Tech Stack

| Layer | Tool |
|---|---|
| Apps (×3) | Vite 6 + React 19 + TypeScript |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 (CSS-first `@theme` block) |
| Data | TanStack Query v5 over typed `fetch` wrappers in `packages/shared` |
| Live updates | SSE (`GET /events`) + Firebase Cloud Messaging (admin push) |
| Tests | Vitest + jsdom (data-layer + mock-API suite) |
| Package manager | npm workspaces (Node 20+) |
| Backend | FastAPI + PostgreSQL 15 (separate repo; contract in [`docs/openapi.yaml`](docs/openapi.yaml)) |
| Hosting | Vercel (one SPA project per app, SPA fallback via `vercel.json`) |

### Design system
- Tailwind v4 `@theme` block in [`packages/shared/src/tokens/tokens.css`](packages/shared/src/tokens/tokens.css) — single source of truth for tokens.
- Semantic color utilities (`bg-primary`, `text-on-surface-variant`, …) auto-swap on `[data-theme="dark"]`.
- **Color usage rule** (mandatory for every new UI) — [`docs/color-usage.md`](docs/color-usage.md): page & top nav `surface`; card/sheet/drawer/input `surface-container-low`; modal `surface-container-high`; nested-in-card `surface-container`; icon-bg/pill on surface `surface-container-high`.
- **Dark mode** — manual `<ThemeToggle />` (from `@oshap/shared/ui`); choice persists in `localStorage` under `oshap-theme`; an inline script applies it before React mounts (no light flash); first-time visitors fall back to the OS `prefers-color-scheme`.

---

# 14. Non-Functional Requirements

## Performance
Customer first load under 2 s on 3G; the mock API is tree-shaken when `VITE_API_BASE_URL` is set.

## Mobile-First
Customer is mobile-first; admin and platform are responsive (admin supports tablets).

## Reliability
Idempotent reference generation (no duplicate orders); server-side persistence.

## Scalability
`restaurant_id` scoping + `RestaurantGroup` support single venues, multi-branch groups, bars, and lounges.

## Auth surface
- Customer app: zero auth
- Admin app: email/password login → JWT bearer token with silent refresh; RBAC by role; `branch_id` scoping for multi-branch owners
- Platform app: `x-platform-token` header (enforce server-side)
- 401 from a protected endpoint returns the user to login

---

# 15. Shipped Scope

- QR table access · menu browsing + search · cart · order placement
- Kitchen workflow (`CREATED → PREPARING → READY`)
- Group / shared table ordering (PIN-based session join)
- Bank-transfer payment + proof upload · **Request a POS** · **Call a Waiter**
- Admin: Dashboard, Kitchen/Bar, History, Menu CRUD + image upload
- **RBAC** (email/password login, 6 roles, per-route gating) + **Staff Management**
- **Inventory** (stock counts, low-stock alerts, auto-disable)
- **Analytics** (+ CSV export) and **Group/multi-branch analytics** + branch switcher
- **Settings UI** (general, tables, staff)
- **Platform portal** (tenant onboarding, subscriptions, system health)
- **Customer Notification Center** (persistent feed)
- FCM web push (admin) + **SSE** live updates
- Admin PWA install · dark mode (manual toggle + OS fallback) · color usage rule
- Vitest data-layer test suite

---

# 16. Remaining Work / Roadmap

## Immediate — Backend integration (current priority)
- Reconcile the built backend against [`docs/openapi.yaml`](docs/openapi.yaml) per [`docs/integration-reconciliation.md`](docs/integration-reconciliation.md); generate the Alembic baseline from the SQLModel models
- Wire Firebase Admin SDK for push; choose image storage (S3 + CloudFront recommended)
- Enforce JWT bearer auth and `x-platform-token` server-side
- Real cross-device sessions + real SSE stream
- Run [`docs/smoke-test.md`](docs/smoke-test.md) against staging

## Pilot
- Deploy to 1–2 venues; track scan-to-order conversion, verification latency, kitchen throughput

## Future enhancements (not built)
- Hard stop on an unknown table ID (decided &mdash; see [&sect;6](#unknown-table--decided-not-built))
- Payment-gateway card payments (Paystack, Flutterwave) + tip flow
- Loyalty system, CRM, promotions, customer profiles
- Reservations + pre-ordering
- Customer order history beyond the current session
- Native mobile wrappers

> Phase-by-phase status is tracked in [`docs/phases.md`](docs/phases.md).

---

# 17. Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Slow internet at venue | Lightweight bundle; menu cached via TanStack Query |
| Payment fraud (false "I've paid") | Reference codes + admin manual verify before `CONFIRMED`; optional proof |
| Staff don't notice new orders | FCM push + audio chime; multi-device registration |
| Customer loses session on refresh | `device_token` in `sessionStorage`; session PIN re-joinable |
| Credentials leaked | Per-user accounts + roles (RBAC); rotate; enforce auth server-side |
| Platform token exposure | Client gate is UX only — backend must enforce `x-platform-token` |
| FCM env misconfigured | Service worker initializes empty and silently fails — flagged in setup docs |
| Backend down | Customer app shows clear error states (`QueryError`); mock API available for dev |
| SSE blocked by network | Polling fallback keeps live screens fresh |

---

# 18. Success Metric

> Oshap succeeds when ordering through Oshap is **faster than calling a waiter**.

## Operational metrics
- **Customer** — scan→first-order conversion, time-to-order, step drop-off
- **Business** — orders/table/day, average order value, payment completion rate (`CLAIMED → CONFIRMED`), bank-transfer vs Request-a-POS mix
- **Merchant** — verification latency (`PAYMENT_PENDING → CONFIRMED`), kitchen throughput (`CREATED → READY`), reconciliation accuracy
