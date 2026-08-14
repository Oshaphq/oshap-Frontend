# FCM Notification Trigger Points

This document describes every server-side event that should send a push
notification to the merchant device(s) via Firebase Cloud Messaging (FCM).
Devices are registered through `POST /devices/register` and looked up by
`restaurant_id` when an event fires.

---

## Trigger Points

### 1. Order Placed
**When:** `POST /orders` succeeds (new order with status `CREATED`).

**FCM target:** All devices registered for the order's `restaurant_id`.

**FCM payload:**
```json
{
  "notification": {
    "title": "New Order",
    "body": "Table {table_id} — {item_count} items — N{total}"
  },
  "data": {
    "type": "new_order",
    "table_id": "{table_id}",
    "order_id": "{order_id}",
    "reference": "{reference}",
    "total": "{total}"
  }
}
```

**Android channel:** `new_orders` (high priority, sound on).

---

### 2. Kitchen Status Changed
**When:** `PATCH /admin/kitchen` changes an order from `PREPARING` to `READY`.

**FCM target:** All devices registered for the order's `restaurant_id`.

**FCM payload:**
```json
{
  "notification": {
    "title": "Order Ready",
    "body": "Table {table_id} — {reference} is ready for serving"
  },
  "data": {
    "type": "order_ready",
    "table_id": "{table_id}",
    "order_id": "{order_id}",
    "reference": "{reference}"
  }
}
```

---

### 3. Payment Claimed
**When:** `POST /payment/confirm` succeeds (order moves to `PAYMENT_PENDING`).

**FCM target:** All devices registered for the order's `restaurant_id`.

**FCM payload:**
```json
{
  "notification": {
    "title": "Payment to Verify",
    "body": "Table {table_id} — N{amount} — needs verification"
  },
  "data": {
    "type": "payment_claimed",
    "table_id": "{table_id}",
    "order_id": "{order_id}",
    "amount": "{amount}"
  }
}
```

---

### 4. Payment Verified
**When:** `POST /admin/verify` succeeds.

**FCM target:** All devices registered for the table's `restaurant_id`.

**FCM payload:**
```json
{
  "notification": {
    "title": "Payment Verified",
    "body": "Table {table_id} — {verified_count} payment(s) confirmed"
  },
  "data": {
    "type": "payment_verified",
    "table_id": "{table_id}",
    "verified_count": "{verified_count}",
    "auto_closed": "{auto_closed}"
  }
}
```

---

### 5. Table Force-Closed
**When:** `POST /admin/close` succeeds.

**FCM target:** All devices registered for the table's `restaurant_id`.

**FCM payload:**
```json
{
  "notification": {
    "title": "Table Cleared",
    "body": "Table {table_id} — {reason} by staff"
  },
  "data": {
    "type": "table_closed",
    "table_id": "{table_id}",
    "reason": "{reason}"   // "paid" or "abandoned"
  }
}
```

---

### 6. Waiter Called
**When:** `POST /table/{id}/call-waiter` succeeds.

**FCM target:** All devices registered for the table's `restaurant_id`.

**FCM payload:**
```json
{
  "notification": {
    "title": "Waiter Requested",
    "body": "Table {table_id} — customer needs assistance"
  },
  "data": {
    "type": "waiter_called",
    "table_id": "{table_id}",
    "session_id": "{session_id}"
  }
}
```

**Android channel:** `service_requests` (high priority, distinct sound from `new_orders`).

**Backend dedupe (required):** Suppress duplicate notifications for the same `restaurant_id` + `table_id` within a 30-second window. The customer button is always tappable — there is no client-side cooldown — so the backend is the only line of defense against staff getting spam-pinged. Always return HTTP 200 to the customer regardless of whether the push was sent or suppressed.

---

### 7. POS Requested
**When:** `POST /table/{id}/request-pos` succeeds (orders moved to `PAYMENT_PENDING`).

**FCM target:** All devices registered for the table's `restaurant_id`.

**FCM payload:**
```json
{
  "notification": {
    "title": "POS Requested",
    "body": "Table {table_id} wants to pay by card — N{total}"
  },
  "data": {
    "type": "pos_requested",
    "table_id": "{table_id}",
    "session_id": "{session_id}",
    "total": "{total}"
  }
}
```

**Android channel:** `service_requests` (high priority, sound on). Foreground admin app plays a chime via Web Audio API ([`apps/admin/src/utils/chime.ts`](apps/admin/src/utils/chime.ts)) and renders an in-app alert ([`apps/admin/src/components/AlertCenter.tsx`](apps/admin/src/components/AlertCenter.tsx)).

**Follow-up flow:** The waiter brings the POS, the customer pays by card, then the waiter taps **Verify Payment** on the dashboard — the same handler used for bank-transfer verification — which moves the orders from `PAYMENT_PENDING` → `CONFIRMED`. No separate "mark POS paid" endpoint is needed.

---

### 8. Issue / Dispute Flag (future)
**When:** (not yet implemented — placeholder for Phase 2).

**FCM target:** All devices registered for the restaurant.

**FCM payload:**
```json
{
  "notification": {
    "title": "Customer Issue",
    "body": "Table {table_id} — {issue_type}"
  },
  "data": {
    "type": "issue_flagged",
    "table_id": "{table_id}",
    "issue_type": "{issue_type}",
    "order_id": "{order_id}"
  }
}
```

---

## Implementation Notes

### Server-side (FastAPI)
- After each trigger event, query `device_tokens` for the relevant
  `restaurant_id`.
- Send FCM messages using the Firebase Admin SDK (`firebase-admin` on PyPI).
- Use `notification` for the visible alert and `data` for in-app routing.
- The frontend's `onBackgroundMessage` handler (in `firebase-messaging-sw.js`)
  already renders `notification.title` + `notification.body`.
- The `data` payload is available in the service worker's `event.data` and
  can be used for navigation intent (e.g., clicking the notification opens
  the correct admin tab).

### Frontend (admin app)
- `apps/admin/src/utils/fcm.ts` handles token retrieval and registration.
- `apps/admin/src/components/PinGate.tsx` calls `initFCM()` after login.
- `firebase-messaging-sw.js` handles background notification display.
- For foreground `onMessage` handling (optional), use the `getMessagingInstance()`
  export from `fcm.ts` with `onMessage()` from `firebase/messaging`.

### Environment
- `VITE_FCM_*` vars in the admin app configure the Firebase Web SDK.
- The backend needs `GOOGLE_APPLICATION_CREDENTIALS` (service account JSON)
  for the Firebase Admin SDK, plus `FCM_PROJECT_ID` or equivalent.
- `VITE_FCM_VAPID_KEY` is the Web Push certificate key pair — the backend
  does NOT need this (it's only used client-side for `getToken()`).
