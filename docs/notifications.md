# Notifications

Spec for the admin notifications tab. Not built yet — this is the contract to build against.

## The job

A waiter looks away for ten seconds and the alert is gone. Today alerts live for five
seconds in the corner of the screen and then cease to exist: there is no way to ask "what
did I miss?", no way to tell whether anyone dealt with it, and no record the next morning
that table 4 waited eleven minutes for someone to come.

The tab exists to answer three questions:

1. **What needs me right now?** — unread, newest first.
2. **What did I miss while I was in the kitchen?** — history, not just live.
3. **Has someone already gone?** — so three waiters don't walk to the same table.

## What this is not

**Not the audit log.** `/admin/audit-logs` records *what staff did* — actor, action,
target — for accountability after the fact. Notifications record *what happened that a
person may need to act on*. A payment being verified is one row in each: the audit log
says "Tunde verified ₦12,400 on T3", the notification said "T3 says they have paid" and is
now resolved. Different questions, different tables, no shared storage.

**Not an activity feed.** Every SSE event is not a notification. Six of the thirteen
demand a human; the rest are state changes the screens already reflect.

## Which events become notifications

| Event | Notification | Who needs it | Why |
|---|---|---|---|
| `waiter_called` | ✅ | Waiting staff | Someone must walk over |
| `pos_requested` | ✅ | Waiting staff | Bring the card machine |
| `new_order` | ✅ | Kitchen, bar | Start cooking |
| `order_ready` | ✅ | Waiting staff | Run the food before it dies |
| `payment_claimed` | ✅ | Cashier, management | Verify before they leave |
| `low_stock` | ✅ | Management | Reorder |
| `order_preparing` | ❌ | — | The board already shows it |
| `payment_confirmed` · `payment_verified` · `payment_rejected` | ❌ | — | Outcomes of an action someone just took |
| `table_closed` | ❌ | — | Same |
| `session_started` · `session_joined` | ❌ | — | Guests joining a table is not an event staff act on |

The rule: **a notification is a request for someone to do something.** If nobody would get
up, it is not a notification.

### Routing by role

Roles are `OWNER · MANAGER · CASHIER · WAITER · KITCHEN · BARTENDER`.

| Type | OWNER | MANAGER | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `waiter_called` | ✅ | ✅ | — | ✅ | — | — |
| `pos_requested` | ✅ | ✅ | ✅ | ✅ | — | — |
| `new_order` | ✅ | ✅ | — | — | ✅ | ✅ |
| `order_ready` | ✅ | ✅ | — | ✅ | — | — |
| `payment_claimed` | ✅ | ✅ | ✅ | — | — | — |
| `low_stock` | ✅ | ✅ | — | — | — | — |

Routing happens **server-side**. A kitchen account must not receive payment notifications
and then have the client hide them — that leaks the day's takings to whoever is on the
pass. The list endpoint returns only what the caller's role is entitled to.

`new_order` for `KITCHEN` and `BARTENDER` follows the same category split the kitchen board
uses today, so a bartender is not woken for a plate of rice.

## Data model

```
Notification
  id                uuid
  restaurant_id     uuid
  type              NotificationType
  table_id          uuid | null
  table_name        string | null     -- resolved at write time
  order_id          uuid | null
  order_reference   string | null
  amount            int | null        -- kobo
  menu_item_id      uuid | null       -- low_stock only
  menu_item_name    string | null
  created_at        datetime
  resolved_at       datetime | null
  resolved_by       uuid | null       -- staff id

NotificationRead                      -- per person, not per restaurant
  notification_id   uuid
  staff_id          uuid
  read_at           datetime
  PRIMARY KEY (notification_id, staff_id)
```

**`table_name` is resolved at write time, not looked up by the client.** The SSE payload
carries only the table's uuid, so the in-app alert currently resolves the name from a
cached table list and degrades to "A table needs attention" when that cache is cold. A
stored notification has no such excuse — a row that says "Table 4" three hours later must
not depend on what the browser happened to have cached.

**Read is per staff member. Resolved is per restaurant.** These are genuinely different:
reading is about one person's attention, resolving is about the work being done. Two
waiters can both read a call; only one needs to walk over.

## Resolution

Two ways a notification stops needing attention:

- **Derived** — the underlying thing changed. `payment_claimed` resolves when that payment
  is verified or rejected. `new_order` resolves when the order leaves `CREATED`.
  `order_ready` resolves when the order is closed. `low_stock` resolves when stock rises
  above the threshold. The backend sets `resolved_at` as part of the transaction that
  changes the entity — never by a sweeper job, or the list will disagree with the board.
- **Claimed** — `waiter_called` and `pos_requested` have no entity to watch. A person says
  "I've got this", which sets `resolved_at` and `resolved_by`.

That second one is the answer to "has someone already gone?", and it is the reason this is
worth building as a real feature rather than a list. Without it, three waiters walk to
table 4 and the fourth table waits.

## API

All paths under `/api/v1`, all responses in the standard envelope, all requiring the staff
bearer token. Pagination follows `/admin/audit-logs`.

### `GET /admin/notifications`

| Query | Type | Default | Notes |
|---|---|---|---|
| `page` | int | 1 | |
| `per_page` | int | 25 | Max 100 |
| `unread_only` | bool | false | |
| `unresolved_only` | bool | false | What the badge counts |
| `type` | NotificationType | — | Optional filter |

```json
{
  "notifications": [
    {
      "id": "9f2c…",
      "type": "waiter_called",
      "table_id": "bddce0c6…",
      "table_name": "T4",
      "order_id": null,
      "order_reference": null,
      "amount": null,
      "menu_item_id": null,
      "menu_item_name": null,
      "created_at": "2026-08-19T18:22:04Z",
      "read": false,
      "resolved_at": null,
      "resolved_by_name": null
    }
  ],
  "total": 143,
  "unread_total": 6,
  "unresolved_total": 2,
  "page": 1,
  "per_page": 25
}
```

`unread_total` and `unresolved_total` are **totals across the whole restaurant**, not the
page — the badge must not change when someone turns a page.

### `POST /admin/notifications/read`

```json
{ "ids": ["9f2c…", "a71b…"] }        // or
{ "all": true }
```

Returns `{ "unread_total": 0 }`. Idempotent — marking a read notification read again is
a success, not a 409. The client fires this on scroll and must not have to think about it.

### `POST /admin/notifications/{id}/resolve`

No body. Sets `resolved_at` and `resolved_by` to the caller. Returns the updated
notification.

Only valid for `waiter_called` and `pos_requested` — the derived types resolve themselves,
and letting a person resolve one by hand would put the list out of step with the board.
Return `409` with a message saying so, not `403`.

Already resolved → `200` with the existing record, not an error. Two waiters tapping at
once is the normal case, and the second one needs to see who got there first.

### Realtime

**No new stream.** These arrive on `/events` already. The backend writes the notification
row in the same transaction that publishes the SSE event, so the list and the toast can
never disagree.

The client invalidates its notifications query on any of the six event types, plus on the
events that resolve them (`payment_verified`, `payment_rejected`, `order_preparing`,
`table_closed`). One new event is needed:

```
notification_resolved   { notification_id, resolved_by_name }
```

so a waiter who is already walking sees the row go quiet when a colleague claims it.

### Retention

Keep 30 days, then hard delete. Notifications are working memory, not records — the audit
log and the order history are where the permanent account lives. A restaurant doing 200
orders a day generates roughly 12,000 rows a month, which is small; the limit exists so it
stays small rather than because storage is scarce.

## Frontend

**Bell in the top nav**, with a badge showing `unresolved_total`, not `unread_total` —
the badge should mean "work outstanding", not "things you haven't looked at". Reading a
notification you cannot act on should not clear the badge for the person who can.

**Panel on tap**: the last 20, grouped `Now · Earlier today · Yesterday · Older`. Each row
is the icon and copy AlertCenter already uses, plus a relative timestamp and, where
relevant, the action:

```
🛎  Table 4 needs attention              2m    [ I'll go ]
💳  Take the card machine to Table 2     5m    [ I'll go ]
🧾  T3 says they have paid  ₦12,400     11m    → opens the table
✓   Table 7 needed attention            18m    Claimed by Tunde
```

**Full page at `/notifications`** for history and filtering, since a panel is the wrong
shape for "what happened during Saturday service".

**Copy is rendered client-side** from the structured fields, not sent as `title` and
`body`. The same record drives a row here and a toast in AlertCenter, and those must not
drift; copy belongs where the UI is. The server sends facts, the client writes sentences.
FCM push payloads are the exception — those are composed server-side because no client is
running to compose them.

**Marking read**: when a row has been on screen for a second. Not on panel open — a badge
that clears because you glanced at it is a badge that has stopped meaning anything.

## Build order

1. Table, write path, `GET /admin/notifications`, role routing. The tab can be read-only
   and still answers "what did I miss?", which is most of the value.
2. `POST /read` and the badge.
3. `POST /{id}/resolve`, the `notification_resolved` event, and the "I'll go" button.
4. Derived resolution wired into the payment, order and stock transactions.

Steps 1 and 2 are worth shipping alone. Step 3 is what stops three waiters walking to the
same table, and is the reason to build this rather than keep a list in the browser.

## Open question for the backend

Does a notification belong to a **branch** or a restaurant? Once locations exist
(`docs/plans.md`), a manager at one venue must not be paged for another's tables. Cheap to
add `branch_id` now, awkward to backfill onto a live table later — recommend adding it from
the start even though nothing reads it yet.
