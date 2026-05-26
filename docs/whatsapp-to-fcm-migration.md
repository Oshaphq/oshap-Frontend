# WhatsApp → FCM Migration — Notification Trigger Points

This document describes every server-side event that should send a push
notification to the merchant device(s) via Firebase Cloud Messaging (FCM).

The old flow used WhatsApp messages (via `whatsapp_number` on the
`restaurants` table). The new flow uses FCM tokens registered through
`POST /devices/register`.

---

## Trigger Points

### 1. Order Placed
**When:** `POST /order` succeeds (new order with status `CREATED`).

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

### 6. Issue / Dispute Flag (future)
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
- `packages/shared/src/utils/fcm.ts` handles token retrieval and registration.
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
