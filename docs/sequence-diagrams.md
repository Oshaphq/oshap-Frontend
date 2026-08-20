# Oshap — sequence diagrams

End-to-end flows across `apps/customer`, `apps/admin`, `apps/platform`,
`@oshap/shared` and the FastAPI backend.

Every endpoint below is mounted under `/api/v1` — the shared client prepends
`API_PREFIX` to the origin in `VITE_API_BASE_URL`
([`client.ts:272`](../packages/shared/src/api/client.ts#L272)). Paths in the
diagrams are written without the prefix, as they appear in
[`openapi.yaml`](openapi.yaml).

Two conventions worth stating once, because they surprise people:

- **There is no `/customer/*` namespace.** The guest-facing endpoints sit at the
  root: `/menu`, `/table/{id}`, `/orders`, `/payment/confirm`, `/session`.
- **A table `id` is a uuid, not a name.** Table names repeat across restaurants,
  so `T4` would resolve to whichever tenant the server matched first. The
  customer app carries the uuid in `?table=`; `TableInfo.table_id` is the
  human-readable name, used for display and for `CreateOrderRequest.table`.

---

## 1. Customer order and payment lifecycle

A guest scans a table QR, orders, claims payment, and staff verify it.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Guest
    participant App as Customer SPA
    participant Client as client.ts
    participant API as FastAPI
    participant DB as PostgreSQL
    participant FCM as FCM
    participant Admin as Admin SPA

    Guest->>App: Scan QR — /menu?table=table-uuid
    App->>Client: useTable with tableId, deviceToken, sessionId
    Client->>API: GET /table/{uuid}?device_token=…&session_id=…
    API->>DB: Load table, restaurant, orders for this device/session
    API-->>Client: TableInfo — restaurant, table_id, unpaid_order, pending_payments
    App->>Client: useMenu(restaurant.id)
    Client->>API: GET /menu?restaurant_id=…
    API-->>Client: MenuItem[]
    Client-->>App: Render menu

    Note over App: Cart lives in CartProvider — client-side only until checkout.

    Guest->>App: Add items, tap Place Order
    Note over Client,API: POST /orders — table (name), restaurant_id, items[],<br/>session_id?, customer_name?, device_token.<br/>Items send BASE price — the server adds modifier deltas.
    Client->>API: POST /orders
    API->>DB: Validate, price, insert Order — status CREATED
    API-->>Client: order_id + reference
    App->>App: Store order_id in sessionStorage, navigate to /orders

    par Staff alerting
        API->>DB: Insert Notification — new_order
        API-)Admin: SSE new_order
        API->>FCM: Push "New Order — Table X"
        Admin->>Admin: Invalidate ORDER_FLOW caches, chime
    end

    Note over Admin: Kitchen advances the ticket via PATCH /admin/kitchen<br/>with order_id + status PREPARING or READY,<br/>emitting SSE order_preparing / order_ready.

    Guest->>App: Tap "I have paid" on /pay — bank transfer
    Note over Client,API: POST /payment/confirm — order_id,<br/>combined_order_ids?, bank_account_id?.<br/>bank_account_id is how account ranking learns.
    Client->>API: POST /payment/confirm
    API->>DB: Payments CLAIMED, orders PAYMENT_PENDING
    API-)Admin: SSE payment_claimed
    API->>FCM: Push "Payment claimed"
    API-->>Client: ClaimPaymentResponse
    App->>App: Remember settled order id, show awaiting-verification

    Admin->>Client: POST /admin/verify with table_id
    Client->>API: POST /admin/verify — Authorization Bearer
    API->>DB: All PAYMENT_PENDING to CONFIRMED, payments VERIFIED
    Note over API,DB: If nothing unpaid remains, sessions are deleted<br/>and the table auto-closes with auto_closed=true.
    API-)Admin: SSE payment_verified, then table_closed
    API-->>Client: AdminVerifyResponse

    Note over Guest,App: The guest is NOT pushed to. There is no SSE or poll in<br/>apps/customer — the receipt appears on the next<br/>GET /table/{id}, after a reload or a remount past staleTime.
```

**Status chain:** `CREATED → PREPARING → READY → PAYMENT_PENDING → CONFIRMED`.
There is no `PAID` status.

Verification is **per table**, not per order: `POST /admin/verify` takes a
`table_id` and settles every `PAYMENT_PENDING` order on it.

`POST /orders/confirm` exists in the spec and is wrapped by `useConfirmOrders`,
but no app calls it — settlement is driven entirely from the admin side.

---

## 2. Admin auth, branch scoping, and single-flight refresh

Staff sign in with email and password. Access tokens last 15 minutes, so expiry
mid-shift is routine rather than exceptional.

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Staff
    participant Gate as AuthGate
    participant Client as client.ts
    participant Store as sessionStorage
    participant API as FastAPI

    Staff->>Gate: Email + password
    Gate->>Client: adminLoginEmail with identifier + password
    Client->>API: POST /auth/login
    API-->>Client: access_token, refresh_token, user, restaurant
    Client->>Store: setAuthTokens + setAdminRestaurant
    Note over Gate: user.role gates RBAC tabs.<br/>restaurant.id keys FCM device registration.

    Gate->>Client: useKitchenOrders()
    Client->>Store: Read access_token, active branch
    Note over Client: Admin GETs pick up ?branch_id=… from localStorage<br/>when an owner has selected one branch.<br/>Null means all branches — the owner default.
    Client->>API: GET /admin/kitchen?branch_id=… — Bearer

    alt Token valid
        API-->>Client: 200 OrderWithItems[]
    else 401 — access token expired
        API-->>Client: 401
        Note over Client: refreshAccessToken — if refreshInFlight is already set,<br/>await that promise rather than minting a second token.<br/>Several dashboard queries expire together by design.
        Client->>API: POST /auth/refresh with refresh_token

        alt Refresh valid
            API-->>Client: 200 access_token
            Client->>Store: setAccessToken
            Client->>API: Retry GET /admin/kitchen with new Bearer
            API-->>Client: 200 OrderWithItems[]
            Note over Client: Retried once only. A second 401 is not a stale token.
        else Refresh expired — 7 days
            API-->>Client: 401
            Client->>Store: clearAuthTokens
            Client-)Gate: dispatch oshap:admin-unauthorized
            Gate->>Staff: Return to login
        end
    end
```

Tokens live in `sessionStorage`, not `localStorage`, so closing the tab ends the
session. The refresh token is what spares staff from retyping a password every
15 minutes.

> **Spec drift:** [`openapi.yaml`](openapi.yaml) still tags admin paths
> `security: [{ adminPin: [] }]`, and [`CLAUDE.md`](../CLAUDE.md) still states
> there is no JWT. The client has sent `Authorization: Bearer` since the auth
> rework — both documents are stale, not this diagram.

---

## 3. Staff notifications and the claim mechanism

Alerts exist to stop three waiters walking to the same table.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Guest at Table 4
    participant App as Customer SPA
    participant API as FastAPI
    participant DB as PostgreSQL
    actor WaiterA as Waiter A
    actor WaiterB as Waiter B

    Guest->>App: Tap Call Waiter
    App->>API: POST /table/{uuid}/call-waiter with optional session_id
    Note over API: Deduped per restaurant+table in a short window (~30s).<br/>The button has no client cooldown, so the server absorbs<br/>repeat taps and still returns 200 — the dedupe is silent.
    API->>DB: Insert Notification — waiter_called, unresolved

    par Fan-out to staff on duty
        API-)WaiterA: SSE waiter_called
        API-)WaiterB: SSE waiter_called
    and Background devices
        API->>API: FCM push to devices for this restaurant
    end

    Note over WaiterA,WaiterB: Both chime and badge +1. waiter_called invalidates<br/>no cache — no server state changed.

    WaiterA->>API: POST /admin/notifications/{id}/resolve
    API->>DB: Set resolved_at and resolved_by
    API-->>WaiterA: 200 Notification
    API-)WaiterB: SSE notification_resolved — notification_id, resolved_by_name
    Note over WaiterB: Card goes quiet: claimed by Tunde. Badge decrements.

    opt Waiter B tapped at the same instant
        WaiterB->>API: POST /admin/notifications/{id}/resolve
        API-->>WaiterB: 200 with the existing record
        Note over WaiterB: Not an error. Two people tapping at once is the<br/>normal case, and the second needs to see who won.
    end

    opt Someone tries to claim a derived notification
        WaiterA->>API: POST /admin/notifications/{new_order_id}/resolve
        API-->>WaiterA: 409
        Note over API: Only waiter_called and pos_requested are claimable.<br/>Everything else resolves from the entity it describes.<br/>409, not 403 — the caller is permitted, the action is meaningless.
    end
```

**Claimed vs derived.** `waiter_called` and `pos_requested` have no entity to
watch, so a person resolves them. `payment_claimed` resolves when the payment is
verified or rejected; `new_order` when the order leaves `CREATED`; `order_ready`
when the order closes; `low_stock` when stock rises. See
[`notifications.md`](notifications.md).

---

## 4. Realtime delivery — one stream, one bus, one poll floor

How an event reaches an admin tab, and what happens when the stream dies without
saying so.

```mermaid
sequenceDiagram
    autonumber
    participant API as FastAPI
    participant ES as EventSource /events
    participant Bus as Realtime bus
    participant Cache as TanStack Query
    participant UI as Alert listeners
    participant FCM as FCM
    participant SW as Service worker
    participant OS as OS notifications

    Note over API,ES: EventSource cannot set headers, so the stream<br/>authenticates with ?access_token=… on the query string.

    ES->>API: GET /events?access_token=…
    API-->>ES: connected, then heartbeat every 30s

    API-)ES: pos_requested

    par In-app, over the one connection
        ES->>Cache: Invalidate PAYMENT_FLOW keys
        ES->>Bus: publishRealtimeEvent
        Bus->>UI: Chime + toast
        Note over Bus: A bus, not a second EventSource — browsers cap<br/>connections per origin and every extra stream is<br/>another Redis subscriber. Two readers, one connection.
    and Backgrounded or closed tabs
        API->>FCM: HTTP v1 push, targeted by restaurant_id
        FCM->>SW: Deliver to the registered service worker
        SW->>OS: showNotification
        OS->>SW: Click — focus the tab or open the admin app
    end

    Note over ES,Cache: Unknown event types fall through to a blanket invalidation,<br/>so a new backend event is never silently ignored.<br/>connected and heartbeat are listed explicitly as no-ops —<br/>otherwise the heartbeat would refetch every admin query, forever.

    break Stream dies silently — buffering proxy, slept phone, expired token
        ES->>ES: Reconnect after 5s
        Cache->>API: Realtime queries also poll every 20s
        Note over Cache: SSE is the fast path, not the only one. The poll degrades<br/>"instant" to "within half a minute" rather than "never" —<br/>a board that stops updating while staff believe it is live<br/>is the failure being bought off.
    end
```

Device tokens are registered with `POST /devices/register` (admin-scoped) and
looked up by `restaurant_id` when an event fires
([`fcm-notifications.md`](fcm-notifications.md)).

**FCM is admin-only.** No Firebase import exists in `apps/customer`, and none
should be added. [`ws-relay.js`](../ws-relay.js) at the repo root is a local dev
helper for testing multi-tab sync — it is not part of the production transport,
which is SSE.

---

## 5. Platform onboarding, and the plan caps that are not built yet

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Platform operator
    participant Portal as Platform SPA
    participant Client as client.ts
    participant API as FastAPI
    participant DB as PostgreSQL
    actor Owner as Merchant owner
    participant Admin as Admin SPA

    Operator->>Portal: Onboarding form — name, owner, tier, table_count
    Note over Client,API: POST /platform/restaurants — name, owner_name,<br/>owner_phone, owner_email?, subscription_tier,<br/>billing_period?, table_count, bank details?.<br/>Header: x-platform-token
    Client->>API: POST /platform/restaurants
    API->>DB: Insert Restaurant, seed tables, seed first BankAccount
    API-->>Client: 201 PlatformRestaurant
    Portal-->>Operator: Tenant created, setup link issued

    Owner->>Admin: Complete setup, then Settings then Branches
    Admin->>Client: POST /admin/branches — a second location
    Client->>API: POST /admin/branches — Bearer

    rect rgb(245, 232, 232)
        Note over API,DB: NOT BUILT. Today the backend caps neither axis — it still<br/>gates features by tier, the model the capacity plan replaces.
        API-->>Client: 201 Branch
    end

    rect rgb(232, 242, 234)
        Note over API,DB: PLANNED — docs/plans.md, step 3
        API->>DB: Count locations for this restaurant
        DB-->>API: 1 of 1 on Lite
        API-->>Client: 403 naming the limit and the plan
        Client-->>Admin: ApiError(403)
        Admin->>Owner: Lite includes 1 location — upgrade to Pro for more
        Note over Admin,Owner: Safe to refuse outright: a second location is set-up<br/>work, never mid-service. The order-volume cap is the<br/>opposite case and cannot be enforced this way.
    end
```

**Plans differ by capacity, not capability.** Every tier gets the whole product,
and only two axes separate them
([`tiers.data.ts`](../apps/platform/src/tiers.data.ts)):

| | Lite | Standard | Pro | Enterprise |
|---|---|---|---|---|
| Monthly | ₦8,000 | ₦18,000 | ₦35,000 | ₦100,000 |
| Monthly orders | 10,000 | ∞ | ∞ | ∞ |
| Locations | 1 | 1 | ∞ | ∞ |
| Staff, tables, features | ∞ / all | ∞ / all | ∞ / all | ∞ / all |

Order volume separates Lite from Standard; locations separate Standard from Pro.
Staff accounts and tables are **unlimited everywhere** — both were proposed as
caps and both were dropped, because they bite during service, which is the one
time a limit must never bite. Annual is ten months' worth on every plan, derived
from the monthly figure rather than written out, so the two cannot drift.

Phase 1 sells **Lite, Standard, Pro**. Enterprise is in `TIER_ORDER` so existing
records still read, but not in `PHASE_1_TIERS`, so the onboarding picker will not
offer it.

### What is actually true today

[`plans.md`](plans.md) is blunt about it: *None of this is built.* Observed on a
fresh Lite tenant, 19 August 2026:

```
/admin/menu               200
/admin/settings           200
/admin/staff              200
/admin/tables             403   ← a QR code is per table
/admin/kitchen            403
/admin/ingredients        403
```

That is the inverse of the commercial decision — a Lite restaurant currently
cannot manage tables, and so cannot produce the QR codes that are the entire
product. Removing the feature gates is step 1 and blocks the rest.

Note the two axes need different enforcement. A location cap can refuse outright.
An order cap is reached in the middle of a Saturday, so it cannot be a `403` —
what it should do instead is still open ([`plans.md`](plans.md)). The frontend is
ready either way: `orderUsage()` and `USAGE_WARN_AT = 0.8` warn a merchant at 80%
of the allowance, so the limit does not read as a bug when it arrives.

---

## Summary

| Flow | Trigger | Endpoints | Transport | Auth |
|---|---|---|---|---|
| **1. Order and payment** | Guest scans a table QR | `GET /table/{id}`, `GET /menu`, `POST /orders`, `POST /payment/confirm`, `POST /admin/verify` | HTTP JSON; SSE + FCM to staff only | Guest: none (`device_token`). Verify: Bearer |
| **2. Auth** | Login, and any 401 | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` | HTTP JSON | Bearer — 15m access, 7d refresh, single-flight |
| **3. Notifications** | Call waiter, POS request, order events | `POST /table/{id}/call-waiter`, `POST /table/{id}/request-pos`, `POST /admin/notifications/{id}/resolve` | SSE + FCM | Bearer, RBAC by role and branch |
| **4. Realtime transport** | Any domain event | `GET /events?access_token=…`, `POST /devices/register` | SSE, plus a 20s poll floor, plus FCM web push | Access token in query (SSE); Bearer (register) |
| **5. Onboarding** | Operator creates a tenant | `POST /platform/restaurants`, `POST /admin/staff` | HTTP JSON | `x-platform-token`; Bearer |

### The customer app has no live channel

Worth stating plainly, because it is easy to assume otherwise: `apps/customer`
opens no `EventSource`, sets no `refetchInterval`, and runs with
`refetchOnWindowFocus: false` and a 30-second `staleTime`. A guest sees a
verified payment on the next fetch of `GET /table/{id}` — a reload, or a
navigation that remounts the query past `staleTime`. Nothing pushes it to them.
