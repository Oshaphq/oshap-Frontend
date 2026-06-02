# Oshap — Product Requirements Document (PRD)

**Version:** 1.1
**Status:** MVP build complete, backend handoff
**Last updated:** 2026-06-02

---

# 1. Product Overview

## Product Name
Oshap

## Tagline
Order shap shap.

## Summary
Oshap is a QR-first ordering and payment platform for restaurants and bars.

Customers scan a QR code at their table, browse the menu, place orders, pay via bank transfer or by requesting a POS terminal, and receive real-time order updates. Restaurant staff manage orders, kitchen, payments, tables, and the menu through a single Admin web app gated by a shared 4-digit PIN.

The goal is to eliminate ordering friction, reduce payment leakages, give merchants live visibility into table state, and make ordering through Oshap measurably faster than calling a waiter.

---

# 2. Problem Statement

Restaurants and bars commonly experience:
- Long wait times before customers can order
- Dependence on waiters for order capture
- Manual payment verification
- Payment leakages
- Poor visibility into active tables
- Fragmented communication between front-of-house and kitchen

Customers commonly experience:
- Delayed service
- Difficulty getting staff attention
- Unclear order status
- Slow bill settlement

---

# 3. Product Vision

Create the fastest and simplest way for customers to order and pay at restaurants and bars while giving merchants live visibility and control over operations.

---

# 4. Target Users

## Customers
Restaurant guests, bar patrons, walk-in customers.

## Restaurant Staff
For the MVP, all staff share one Admin PIN per restaurant and see the full operational surface (dashboard, kitchen, history, menu). Role-based access (Owner / Manager / Cashier / Waiter / Kitchen / Bartender) is **deferred to Phase 2** — see [§17 Future Roadmap](#17-future-roadmap).

---

# 5. Product Structure

The MVP ships **two web applications** in a single npm workspace.

## Customer Web Application
Public, unauthenticated SPA. QR-first ordering experience served from `apps/customer`.

## Admin Web Application
PIN-gated SPA for restaurant staff served from `apps/admin`. Single shared role for the MVP.

> **Platform administration** (internal Oshap management) is deferred — not in the MVP.

---

# 6. Customer Experience

## Entry Point
Customer scans a QR code printed on the table. The QR encodes:

```
https://oshap.app/menu?table=T12
```

The table ID resolves to its restaurant on the backend (`GET /table/:id`). No login required. No user account. Pre-session orders on a single device are scoped by an anonymous `device_token` (UUID stored in `sessionStorage` per browser tab).

---

# 7. Customer Features

## 7.1 Menu Browsing
- View categories (derived from the distinct values of `MenuItem.category` — no separate Category entity in MVP)
- View menu items: name, price, description, image
- Search within the menu

## 7.2 Cart Management
- Add, remove, change quantity
- Running total
- Cart persists per browser tab

## 7.3 Order Placement
- Review summary in cart drawer
- Confirm → `POST /order` creates the order
- Order is assigned a unique reference `OSHAP-{tableId}-{4-digit random}`
- Order immediately enters the kitchen workflow as `CREATED`

## 7.4 Group / Shared Table Ordering ("Order Together")
- Any customer at the table can **Start a session** → backend generates a 4-digit PIN
- Other customers tap **Join** and enter the PIN; their existing unclaimed orders migrate into the session
- All session members see the shared tab and can pay individually or jointly
- Sessions are `ACTIVE` until the table is closed or all session orders are paid

## 7.5 Payment

### Bank Transfer (default)
Pay Bill screen displays:
- Bank name, account name, account number
- Amount payable
- Unique payment reference (the order reference)

Customer transfers, then taps **"I've Sent the Money"**. Optional proof screenshot upload. Orders move to `PAYMENT_PENDING` (Order) / `CLAIMED` (Payment). Waiter verifies on the Admin dashboard.

### Request a POS
Alternative CTA on the pay page. Customer taps **"Request a POS"**:
- `POST /table/{id}/request-pos` moves unpaid orders to `PAYMENT_PENDING` with `CLAIMED` payment records
- FCM push fires to admin devices (`pos_requested`)
- Waiter brings the POS, customer taps card, waiter taps **Verify Payment** on the dashboard — same handler that bank-transfer verification uses

No separate "mark POS paid" endpoint or admin button.

## 7.6 Call a Waiter
Service-bell icon in every customer header. Tap → `POST /table/{id}/call-waiter` → FCM `waiter_called` push + audio chime + in-app alert on every admin device. Button is always tappable; the backend dedupes within 30 seconds per restaurant + table.

## 7.7 Order Tracking
Customer "My Orders" tab shows every order on this device or session with live status — updated by polling `GET /session/orders` every 5 seconds.

Status visible to customer:
```
CREATED → PREPARING → READY → PAYMENT_PENDING → CONFIRMED
```

## 7.8 In-App Toasts
- "A waiter is on the way" on call-waiter
- "POS On The Way" / "Payment Claimed — awaiting verification" on pay actions
- Error states for failed actions

> **Persistent customer notification center** is deferred to Phase 2. MVP has transient toasts only.

---

# 8. Admin Application

## 8.1 Authentication
- One **4-digit PIN per restaurant**, sent as `x-admin-pin` header on every admin request
- `GET /admin/me` resolves the PIN to a `Restaurant`; the frontend stores it in `sessionStorage` and uses `restaurant.id` for FCM device registration
- No JWT, no per-user sessions, no role separation in MVP
- 401 from any admin endpoint triggers a re-login

## 8.2 Modules

### Waiter Dashboard (`/`)
- Live table list (polled every 5s via `GET /admin/tables`)
- Per-table: unpaid total, pending-payment total, action buttons
- **Verify Payment** → `POST /admin/verify` flips `PAYMENT_PENDING` orders to `CONFIRMED`; auto-closes the table when nothing is outstanding
- **Clear Table** → `POST /admin/close` with reason `paid` or `abandoned`; `abandoned` cancels remaining orders

### Kitchen (`/kitchen`)
- Lists active orders in `CREATED`, `PREPARING`, `READY`
- Tap **Start** → `PREPARING`. Tap **Ready** → `READY`
- Customer sees the same status updates on their My Orders tab

### History (`/history`)
- Paginated list of `CONFIRMED` and `CANCELLED` orders
- Per-page summary: confirmed count, cancelled count, page revenue
- Filterable by table and date
- Refresh button shows spinner during in-flight refetch

### Menu (`/menu`)
- CRUD on menu items: name, price, category (free-text), description, image, availability, sort order
- Image upload: `POST /admin/menu/upload` returns `{ url }` — backend chooses storage (S3 / nginx / GCS / R2)

> **Staff Management**, **Analytics**, and **Settings UI** are deferred to Phase 2. For MVP, restaurant info (bank details, hours, branding) is managed directly in the database / by the platform team.

## 8.3 Push Notifications (FCM)

After login, the admin device registers an FCM token via `POST /devices/register`. The backend pushes on **seven trigger types** (full spec in [`docs/fcm-notifications.md`](docs/fcm-notifications.md)):

1. `new_order` — order placed
2. `order_ready` — kitchen marked an order `READY`
3. `payment_claimed` — bank-transfer claim
4. `payment_verified` — admin verified (cross-device sync)
5. `table_closed` — admin force-closed a table
6. `waiter_called` — customer tapped the service bell
7. `pos_requested` — customer tapped Request a POS

### Foreground behaviour
When the admin app is open, an `AlertCenter` component intercepts FCM messages, plays an audio chime (Web Audio API two-tone bell — no asset file), and renders a queued top-right toast for `pos_requested`, `waiter_called`, `new_order`, and `payment_claimed`.

### Background behaviour
`firebase-messaging-sw.js` shows OS-level notifications when the tab is hidden.

## 8.4 PWA
Admin app is installable to home screen with `display: "standalone"`. Manifest at `apps/admin/public/manifest.webmanifest`, brand favicon + maskable icon, iOS apple-touch-icon, and full status-bar config. No offline data cache in MVP (dashboard depends on live state).

---

# 9. Data Model & Lifecycles

Full schema lives in [`docs/data-model.md`](docs/data-model.md) and [`docs/ddl.sql`](docs/ddl.sql).

Entities: `Restaurant`, `Table`, `MenuItem`, `Order`, `OrderItem`, `Payment`, `TableSession`, `DeviceToken`.

## 9.1 Order Lifecycle

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

No separate "ACCEPTED" or "SERVED" states. Kitchen tap-to-start moves `CREATED → PREPARING` directly; terminal states are `CONFIRMED` (paid + verified) and `CANCELLED` (abandoned).

## 9.2 Payment Lifecycle

```
NOT_PAID ──► CLAIMED ──► CONFIRMED   (auto, on order confirm)
                    └──► VERIFIED    (admin manual verify)
```

No `REJECTED` state. A wrongful claim is resolved by **Clear Table → abandoned**, which `CANCELLED`s the orders.

One payment per order (`unique order_id`). Re-submissions upsert.

## 9.3 Session Lifecycle

```
ACTIVE ──► CLOSED   (admin closes table, or all session orders are paid)
```

## 9.4 Reference Format

`OSHAP-{tableId}-{4-digit random}` — globally unique, doubles as the bank-transfer reference for reconciliation.

## 9.5 Multi-Restaurant Scoping

Every operational resource (`Table`, `MenuItem`, `Order`, `Payment`, `DeviceToken`) is scoped by `restaurant_id`. One Admin PIN maps to exactly one restaurant. This is the foundation for the "multi-location restaurant groups" line in [§13 Non-Functional Requirements](#13-non-functional-requirements).

---

# 10. Real-Time Updates

The MVP uses **TanStack Query polling at 5-second intervals** for live screens (dashboard, pay page, My Orders), plus **FCM push** for instant admin alerts when the app is in foreground or background.

There is no WebSocket / SSE channel in the MVP. "Real-time" in this PRD means *near-real-time via polling + push*. Sub-second server-push is deferred.

---

# 11. Notifications

## 11.1 Admin
- FCM web push (background + foreground) — see [§8.3](#83-push-notifications-fcm)
- In-app alert toasts + audio chime when foreground
- OS notifications via service worker when background

## 11.2 Customer
- Transient in-app toasts for action confirmations and error states
- Persistent customer notification center is deferred to Phase 2

---

# 12. Tech Stack

| Layer | Tool |
|---|---|
| Apps | Vite 6 + React 19 + TypeScript |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 (CSS-first `@theme` block) |
| Data | TanStack Query v5 over typed `fetch` wrappers in `packages/shared` |
| Admin push | Firebase Cloud Messaging (web push) |
| Package manager | npm workspaces (Node 20+) |
| Backend | FastAPI + PostgreSQL 15 (separate repo, contract in [`docs/openapi.yaml`](docs/openapi.yaml)) |
| Hosting | Vercel (static SPA per app, SPA fallback via `vercel.json`) |

### Design system
- Tailwind v4 `@theme` block in [`packages/shared/src/tokens/tokens.css`](packages/shared/src/tokens/tokens.css) — single source of truth for tokens
- Semantic color utilities (`bg-primary`, `text-on-surface-variant`, …) auto-swap on `[data-theme="dark"]`
- **Time-based dark mode**: light by day, dark from 6 PM to 7 AM (local browser time)

### UX polish baked into MVP
- Drag-to-dismiss on every bottom sheet (cart drawer, others-ordering sheet)
- Inline SVG icon for Call Waiter (via Iconify)
- Spinners on refresh buttons during refetch
- Toast confirmations for service requests

---

# 13. Non-Functional Requirements

## Performance
Initial customer page load under 2 seconds on 3G. Lightweight bundle; the mock API is tree-shaken out when `VITE_API_BASE_URL` is set.

## Mobile-First
Customer experience is mobile-first; admin is responsive and supports staff tablets.

## Reliability
Order integrity is preserved — no duplicate orders (idempotent reference generation), no lost orders (server-side persistence).

## Scalability
The data model supports single-location restaurants, multi-location restaurant groups, bars, and lounges via `restaurant_id` scoping.

## Auth surface
- Customer app: zero auth
- Admin app: shared PIN per restaurant via `x-admin-pin` header
- 401 from any admin endpoint kicks the user back to PIN entry

---

# 14. MVP Scope

### Included
- QR table access
- Menu browsing + search
- Cart
- Order placement
- Kitchen workflow (`CREATED → PREPARING → READY`)
- Group / shared table ordering (PIN-based session join)
- Bank-transfer payment + payment proof upload
- **Request a POS** in-person card flow
- **Call a Waiter** service-bell
- Admin app: Waiter Dashboard, Kitchen, History, Menu CRUD with image upload
- Admin PIN auth (one PIN per restaurant)
- FCM web push (admin: background + foreground + audio chime)
- Admin PWA install
- Customer in-app toasts
- Time-based dark mode
- Real-time updates via 5s polling

### Excluded (Phase 2+)
- Role-based access control (Owner / Manager / Cashier / Waiter / Kitchen / Bartender)
- Per-user staff accounts
- Staff Management UI
- Analytics dashboard
- Restaurant Settings UI (bank account / hours / branding editing)
- Customer Notification Center (persistent feed)
- Payment-gateway card payments (Paystack, Flutterwave, etc.)
- Loyalty system, CRM, promotions, customer profiles
- Reservations, pre-ordering
- Inventory management, stock-out auto-disable
- Multi-branch consolidated analytics
- WebSocket / SSE server-push
- Platform Administration application
- Native mobile wrappers

---

# 15. Rollout Plan

## Phase 1 — MVP build ✅ (complete, this handoff)
Frontend shipped: customer app, admin app, shared package, OpenAPI contract, DDL.

## Phase 2 — Backend integration
- Backend team implements FastAPI against [`docs/openapi.yaml`](docs/openapi.yaml)
- Apply [`docs/ddl.sql`](docs/ddl.sql) as initial Alembic migration
- Wire Firebase Admin SDK on the backend for push
- Pick image storage backend (S3 + CloudFront recommended)

## Phase 3 — Pilot
- Deploy to 1–2 venues
- Monitor scan-to-order conversion, payment verification latency, kitchen state usage

## Phase 4 — V1.2 enhancements
See [§17 Future Roadmap](#17-future-roadmap).

---

# 16. Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Slow internet at venue | Lightweight bundle; menu cached via TanStack Query |
| Payment fraud (false "I've paid" claims) | Reference codes + admin manual verify before order is `CONFIRMED`; optional screenshot proof |
| Staff don't notice new orders | FCM web push with audio chime; multi-device registration so multiple tablets ring |
| Customer loses session on refresh | `device_token` in `sessionStorage`; session PIN re-joinable |
| Single PIN leaked across staff | Per-restaurant PIN rotation. Future: per-user accounts in Phase 2 |
| FCM env misconfigured | Service worker initializes empty and silently fails — flagged in setup docs |
| Backend down | Customer app shows clear error states via `QueryError`; mock API available for dev |
| Group order cross-device | Real backend enables true cross-device sessions; mock is browser-local for local testing only |

---

# 17. Future Roadmap

## Phase 2
- Role-based access control (Owner, Manager, Cashier, Waiter, Kitchen, Bartender)
- Per-user staff accounts (replace shared PIN)
- Staff Management UI
- Analytics dashboard (revenue, popular items, table performance, staff activity)
- Restaurant Settings UI (info, hours, bank accounts, branding)
- Payment-gateway card payments (Paystack, Flutterwave)
- Customer Notification Center (persistent feed)
- Tip flow
- WebSocket / SSE for sub-second updates
- Customer order history beyond the current session

## Phase 3
- Loyalty system & CRM
- Promotions
- Customer profiles
- Repeat-order recommendations
- Reservations + pre-ordering
- Inventory management
- Multi-branch consolidated analytics
- Platform Administration app

---

# 18. Out of Scope for v1.1

Documented explicitly so backend, frontend, and product stay aligned:

- WhatsApp Business integration (deprecated from v1.0 draft)
- Payment gateways (bank transfer + Request-a-POS only)
- Customer login / accounts
- Tipping
- Multi-location admin in a single PIN session (one PIN = one restaurant)
- Native mobile apps
- Offline order queueing
- Server-push (WebSocket / SSE)

---

# 19. Success Metric

> Oshap succeeds when ordering through Oshap is **faster than calling a waiter**.

Every UX decision and every backend optimization defers to this rule.

## Operational metrics

### Customer
- QR scan → first order conversion rate
- Time from scan to order placed
- Drop-off rate at each step

### Business
- Orders per table per day
- Average order value
- Payment completion rate (`CLAIMED → CONFIRMED`)
- Bank-transfer vs Request-a-POS mix

### Merchant
- Time from `PAYMENT_PENDING → CONFIRMED` (verification latency)
- Kitchen throughput (`CREATED → READY`)
- Daily reconciliation accuracy
