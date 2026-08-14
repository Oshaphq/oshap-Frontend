# Frontend ↔ Backend Reconciliation

**Status:** proposed — not yet applied
**Repos:** this workspace · [`Bizsavvy/Oshap-backend`](https://github.com/Bizsavvy/Oshap-backend) @ `main`
**Owner:** to be assigned · **Blocks:** everything

The two repos have never been run together. This document is the executable change set to
make them talk. Apply the backend half and the frontend half in the same PR pair — either
one alone leaves the system broken.

Three classes of drift, in severity order. **A is worse than B** even though B is the one
that looks alarming: path drift fails loudly with a 404, envelope drift fails silently with
the wrong shape.

---

## A. Response envelope — affects 100% of endpoints

Every backend handler returns through `app/responses.py`:

```python
def ok(data=None, message="OK", code=200):
    return JSONResponse(status_code=code, content={
        "success": True, "message": message, "code": code,
        "data": data if data is not None else {},
    })
```

The frontend's `request<T>()` ends with `return payload as T` — it hands the **whole
envelope** back to callers that are typed as the inner payload. So `useMenu()` is typed
`MenuItem[]` and receives `{ success, message, code, data }`. Every list renders as empty,
every `.map()` throws, and TypeScript cannot catch any of it because the lie happens at the
network boundary.

Errors are broken in the other direction: the client looks for a `payload.error` string, the
backend sends `message`. Every server error message is silently discarded and replaced with
`response.statusText`.

**Decision: unwrap in the frontend client.** The envelope is reasonable API design; it just
isn't documented in the spec. `ok()`/`err()` are used in every controller — removing them is
dozens of call sites. Unwrapping is *one function*. Same principle as the path decision
below: put the change where it is cheapest.

The unwrap must be **tolerant**, because [`mock.ts`](../packages/shared/src/api/mock.ts)
returns bare payloads and must keep working unchanged.

### Diff — `packages/shared/src/api/client.ts`

```diff
+/**
+ * The FastAPI backend wraps every response as { success, message, code, data }.
+ * The mock returns bare payloads. Unwrap tolerantly so both paths work.
+ */
+function unwrapEnvelope(payload: unknown): unknown {
+  if (
+    typeof payload === "object" &&
+    payload !== null &&
+    "success" in payload &&
+    "code" in payload &&
+    "data" in payload
+  ) {
+    return (payload as { data: unknown }).data;
+  }
+  return payload;
+}
+
+function extractErrorMessage(payload: unknown): string | null {
+  if (typeof payload !== "object" || payload === null) return null;
+  for (const key of ["message", "error", "detail"] as const) {
+    const value = (payload as Record<string, unknown>)[key];
+    if (typeof value === "string" && value.length > 0) return value;
+  }
+  return null;
+}

   if (!response.ok) {
     if (response.status === 401 && options.admin) {
       handleAdminUnauthorized();
     }
-    const message =
-      (isJson &&
-        typeof payload === "object" &&
-        payload !== null &&
-        "error" in payload &&
-        typeof (payload as { error: unknown }).error === "string" &&
-        (payload as { error: string }).error) ||
-      response.statusText ||
-      `Request failed with status ${response.status}`;
+    const message =
+      (isJson ? extractErrorMessage(payload) : null) ||
+      response.statusText ||
+      `Request failed with status ${response.status}`;
     throw new ApiError(response.status, message, payload);
   }

-  return payload as T;
+  return unwrapEnvelope(payload) as T;
 }
```

**Also document the envelope in [`openapi.yaml`](openapi.yaml)** — add an `Envelope` schema
and wrap declared responses, or the spec keeps lying about what the API returns.

> **Backend action item.** `err(str(e), 500)` leaks raw exception strings to the client.
> Log the exception, return a generic message. Do this before the pilot.

---

## B. Path drift — affects roughly a third of endpoints

**Both sides move.** The backend corrects what is genuinely broken; the frontend adopts what
the backend got right. Router prefixes are code organization and the emitted URL surface is
the contract — so every router module stays where it is, and only the prefix arithmetic
changes.

| | Change | Why |
|---|---|---|
| **B1** | Backend fixes the doubled prefixes | They're arithmetic bugs, not a convention |
| **B2** | Frontend adopts explicit API versioning | The version belongs in code, not an env var |
| **B3** | Frontend adopts `/auth/login`, `/auth/me` | Auth isn't admin-scoped |
| **B4** | Both normalize `POST /order` → `/orders` | Our own spec is internally inconsistent |

Flat paths remain the contract for everything else, for two reasons: the doubled URLs are
bugs rather than a chosen convention, and [`AGENTS.md`](../AGENTS.md) already declares
`docs/openapi.yaml` the contract — making the contract chase the implementation inverts a
decision that's already been made.

---

### B1 · Backend fixes the doubled prefixes

`/orders/order`, `/orders/orders/{id}`, `/admin/analytics/analytics` — these happen because
a decorator already carrying the resource name gets mounted under a prefix carrying it again.
Plural `/admin/tables` matches the house style already set by `/platform/restaurants`.

#### Diff — backend `main.py`

```diff
 def include_routers(app):
     app.include_router(menu.router, prefix="/api/v1/menu")
     app.include_router(menu.admin_router, prefix="/api/v1/admin/menu")
     app.include_router(tables.router, prefix="/api/v1/table")
-    app.include_router(tables.admin_router, prefix="/api/v1/admin/table")
+    app.include_router(tables.admin_router, prefix="/api/v1/admin/tables")
-    app.include_router(orders.router, prefix="/api/v1/orders")
+    app.include_router(orders.router, prefix="/api/v1")
-    app.include_router(orders.admin_router, prefix="/api/v1/admin/orders")
+    app.include_router(orders.admin_router, prefix="/api/v1/admin")
     app.include_router(sessions.router, prefix="/api/v1/session")
     app.include_router(auth.router, prefix="/api/v1/auth")
     app.include_router(staff.router, prefix="/api/v1/admin/staff")
     app.include_router(settings.router, prefix="/api/v1/admin/settings")
-    app.include_router(analytics.router, prefix="/api/v1/admin/analytics")
+    app.include_router(analytics.router, prefix="/api/v1/admin")
     app.include_router(inventory.router, prefix="/api/v1/admin/inventory")
     app.include_router(platform.router, prefix="/api/v1/platform")
     app.include_router(devices.router, prefix="/api/v1/devices")
     app.include_router(events.router, prefix="/api/v1/events")
```

No decorator changes needed — the internal paths already produce the right URLs once the
prefixes stop doubling.

---

### B2 · Frontend adopts explicit API versioning

Today the version is smuggled into `VITE_API_BASE_URL`. That's fragile: a deploy that sets
the origin without the version 404s every endpoint, with nothing in the failure to indicate
why.

**This is already broken.** [`.env.example`](../.env.example) currently reads:

```
VITE_API_BASE_URL=http://localhost:8000/api
```

No `/v1`. That misconfiguration would have survived every path fix in B1 and failed silently
on every endpoint. Exactly the class of bug that hiding a version in an env var invites.

Put the version in code, where it's reviewable and can't be forgotten by a deploy:

```diff
+/**
+ * API mount point and version. Explicit here rather than folded into
+ * VITE_API_BASE_URL so a misconfigured deploy can't silently 404 everything.
+ * Bumping to v2 is a one-line change, not an env-var migration.
+ */
+export const API_PREFIX = "/api/v1";
+
 function buildUrl(path: string, query: RequestOptions["query"]): string {
-  const url = new URL(getBaseUrl() + path);
+  const url = new URL(getBaseUrl() + API_PREFIX + path);
   const sp = buildSearchParams(query);
   sp.forEach((v, k) => url.searchParams.set(k, v));
   return url.toString();
 }
```

`VITE_API_BASE_URL` becomes **origin only** — `http://localhost:8000`. Call sites stay bare
(`request("/menu")`), so there's no churn across the ~48 of them.

**Migration guard.** Every `.env.local` and Vercel env var written before this change still
carries the suffix, and `origin/api` + `/api/v1` would produce `/api/api/v1/...` — failing
exactly as invisibly as the bug this fixes. `getBaseUrl()` therefore strips a trailing `/api`
or `/api/v{n}` and warns once, so stale configuration degrades to a console message instead
of a dead deploy.

> **Status: implemented.** Shipped ahead of the rest of section B, since it is frontend-only
> and safe against the current backend. See PR #2.

**The mock is unaffected.** `buildUrl` is only reached on the real-fetch path
([`client.ts:271`](../packages/shared/src/api/client.ts#L271)); the mock branch returns at
line 235. The mock keeps matching bare paths.

Update every place the env var is documented, or the change is worse than useless:
[`.env.example`](../.env.example), [`README.md`](../README.md) (two spots),
[`phases.md`](phases.md), [`smoke-test.md`](smoke-test.md), [`PRD.md`](../PRD.md).

---

### B3 · Frontend adopts the backend's auth paths

`/auth/*` is better design than `/admin/*` for identity: auth isn't conceptually
admin-scoped, and the platform app will want it too. Two call sites — cheapest to fix now.

```diff
 export function adminLoginEmail(payload: AdminLoginRequest): Promise<AdminLoginResponse> {
-  return request<AdminLoginResponse>("/admin/login", {
+  return request<AdminLoginResponse>("/auth/login", {
     method: "POST",
     body: payload,
   });
 }

 export function adminGetMe(): Promise<AdminMeResponse> {
-  return request<AdminMeResponse>("/admin/me", { admin: true });
+  return request<AdminMeResponse>("/auth/me", { admin: true });
 }
```

Mirror both in [`mock.ts`](../packages/shared/src/api/mock.ts) and
[`openapi.yaml`](openapi.yaml).

---

### B4 · Both sides normalize `POST /order` → `POST /orders`

`POST /order` (singular) alongside `GET /orders/{id}` (plural) is inconsistent in our own
spec. REST convention is POST to the collection. One decorator on the backend, one call site
in [`orders.ts`](../packages/shared/src/api/orders.ts), plus mock, spec, and both test files
(each asserts `/order`). It gets much more expensive once the pilot is live and online order
types land on the same endpoint in Stage 8.

```diff
-@router.post("/order")
+@router.post("/orders")
```
```diff
-  return request<CreateOrderResponse>("/order", {
+  return request<CreateOrderResponse>("/orders", {
```

---

### Resulting surface

Paths below are as the frontend sends them; `client.ts` prepends `/api/v1` to each.

| Path | Status after change |
|---|---|
| `/menu`, `/admin/menu`, `/admin/menu/{id}`, `/admin/menu/upload` | already aligned |
| `/table/{id}`, `/table/{id}/call-waiter`, `/table/{id}/request-pos` | already aligned |
| `/session`, `/session/orders` | already aligned |
| `/admin/staff*`, `/admin/settings*`, `/admin/inventory*` | already aligned |
| `/platform/*`, `/devices/register`, `/events` | already aligned |
| `/admin/tables` | B1 — backend prefix |
| `/orders/{id}`, `/orders/confirm`, `/payment/confirm` | B1 — backend prefix |
| `/admin/kitchen`, `/admin/history`, `/admin/verify`, `/admin/close` | B1 — backend prefix |
| `/admin/analytics`, `/admin/group`, `/admin/group/analytics` | B1 — backend prefix |
| `/admin/login` → `/auth/login`, `/admin/me` → `/auth/me` | B3 — frontend |
| `/order` → `/orders` | B4 — both |

Menu CRUD verbs already agree — backend `PUT /{item_id}` for update, `PATCH /{item_id}` for
the availability toggle, matching `adminUpdateMenuItem` and `adminToggleMenuItem`.

---

## C. Schema drift

### C1 — Bank accounts (breaks a live screen)

> **Status: frontend implemented** (PR #4). Still needs the backend to serve
> `bank_account` on `GET /table/{id}` and to enforce the single-active invariant.

The backend moved bank details into a `bank_accounts` table with full CRUD
(`GET/POST/PATCH/DELETE /admin/settings/bank-accounts`). `Restaurant` no longer carries
`bank_name`, `account_number` or `account_name`.

[`pay.tsx`](../apps/customer/src/routes/pay.tsx) reads exactly those three fields. Today the
customer sees an **empty bank transfer panel** — no account number to pay into. This is the
single most damaging item in this document.

**The backend design is better. The frontend follows it.**

```diff
 // packages/shared/src/types/index.ts
+export interface BankAccount {
+  id: string;
+  bank_name: string;
+  account_number: string;
+  account_name: string;
+  is_active: boolean;
+}

 export interface Restaurant {
   id: string;
   name: string;
   description?: string | null;
   logo_url?: string | null;
   operating_hours?: string | null;
-  bank_name?: string | null;
-  account_number?: string | null;
-  account_name?: string | null;
+  /** The account customers should transfer to. Present on GET /table/{id}. */
+  bank_account?: BankAccount | null;
   whatsapp_number?: string | null;
 }
```

**Backend action item:** `GET /table/{id}` must include the restaurant's active bank account
in its `restaurant` block. Without it the pay screen has nothing to render. If more than one
account is active, the contract needs a rule for which one wins — recommend a single
`is_active = true` invariant enforced server-side.

Then update `pay.tsx` to read `restaurant.bank_account`, and extend
[`settings/general.tsx`](../apps/admin/src/routes/settings/general.tsx) from three flat
inputs to a managed list against the four bank-account endpoints.

### C2 — Menu media

Backend has a `MenuItemMedia` table (many images plus video per item, `sort_order`) with
`POST /admin/menu/{id}/media` and `DELETE /admin/menu/{id}/media/{media_id}`. Frontend has a
single `image_url`.

Not breaking — `MenuItem.image_url` still exists on both sides. **Decide before building the
bulk importer**, since it determines what the CSV image column means. Recommendation for
now: keep `image_url` as the primary/hero image, treat `media[]` as additive, and leave the
importer single-image in v1.

### C3 — Customer push

Backend has a `CustomerDevice` table and `POST /table/{id}/register-device`.
[`AGENTS.md`](../AGENTS.md) says "FCM is admin-only. Do not import Firebase into
`apps/customer`."

We are building against contradictory intent. Either lift the rule or drop the endpoint —
but decide, and write it down. Note that customer push is genuinely useful ("your order is
ready"), so the rule may be the thing that's wrong.

---

## D. Prerequisites the diffs assume

- **No Alembic migrations exist.** `migrations/versions/` is empty, so the schema has never
  been migrated and there is no repeatable deploy. Generate the baseline before any of this
  is tested against a shared environment.
- **[`ddl.sql`](ddl.sql) and [`data-model.md`](data-model.md) are stale** — no staff table,
  no `stock_count`, no groups. They contradict the live models. Regenerate from SQLModel or
  delete them; right now they actively mislead.
- **[`phases.md`](phases.md) claims Phase 1 has not started.** It has. Correct it.

---

## Verification

Run the frontend against a locally running backend with
`VITE_API_BASE_URL=http://localhost:8000` — **origin only**, since `client.ts` now supplies
the `/api/v1` prefix (B2) — and `VITE_MOCK_API` unset.

1. **Envelope** — load the customer menu. Items render. If you see an empty list, the unwrap
   didn't land.
2. **Error surfacing** — force a 400 and confirm the backend's `message` reaches the toast,
   not "Bad Request".
3. **Every path** — walk [`smoke-test.md`](smoke-test.md) end to end with the network tab
   open. Zero 404s is the pass condition.
4. **Bank details** — the pay screen shows a real account number.
5. **Auth** — login, then a 401 from any admin endpoint returns to the login screen.
6. **Mock unaffected** — set `VITE_MOCK_API=true` and re-run; `npm test` still passes. The
   tolerant unwrap must not disturb the mock path.

Extend `smoke-test.md` with a real-backend column once this passes, so the next person can
tell mock-green from integration-green.
