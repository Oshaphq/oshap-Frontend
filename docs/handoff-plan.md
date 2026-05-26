# Admin app — handoff readiness plan

Scope: close the remaining gaps before the admin app is handed to the FastAPI backend dev. Four phases, ordered so each compiles cleanly before the next.

- Phase 1 — Multi-tenant via `GET /admin/me`
- Phase 2 — `READY` column on the Kitchen page
- Phase 3 — Frontend gaps (query error UI, 401 re-prompt)
- Phase 4 — Pre-handoff docs (FCM setup, image storage)

Design decisions baked in (already confirmed):

- **Tenant model:** one PIN per restaurant. PIN identifies the tenant. `VITE_RESTAURANT_ID` goes away.
- **READY UX:** third column on the Kitchen page (`New` / `Cooking` / `Ready`), informational, no CTA.
- **Spec scope:** we can add endpoints to [`docs/openapi.yaml`](openapi.yaml) as part of this work.

---

## Phase 1 — Multi-tenant via `GET /admin/me`

Replaces the `VITE_RESTAURANT_ID` env var with a backend lookup keyed by PIN.

### 1.1 Spec — [`docs/openapi.yaml`](openapi.yaml)

New endpoint under the `Admin` tag, inserted near `/admin/tables`:

```yaml
/admin/me:
  get:
    tags: [Admin]
    summary: Return the restaurant scoped to the current PIN
    security: [{ adminPin: [] }]
    responses:
      "200":
        content:
          application/json:
            schema:
              type: object
              properties:
                restaurant: { $ref: "#/components/schemas/Restaurant" }
              required: [restaurant]
      "401": { $ref: "#/components/responses/Unauthorized" }
```

### 1.2 Shared types — [`packages/shared/src/types/index.ts`](../packages/shared/src/types/index.ts)

```ts
export interface AdminMeResponse {
  restaurant: Restaurant;
}
```

### 1.3 API fn — [`packages/shared/src/api/admin.ts`](../packages/shared/src/api/admin.ts)

```ts
export function adminGetMe(): Promise<AdminMeResponse> {
  return request<AdminMeResponse>("/admin/me", { admin: true });
}
```

### 1.4 Restaurant context — [`packages/shared/src/api/client.ts`](../packages/shared/src/api/client.ts)

Add a sibling to the PIN module-state for `restaurant_id` + `restaurant_name`, sessionStorage-backed under `oshap-admin-restaurant`.

Exports:

- `setAdminRestaurant(r: Restaurant | null): void`
- `getAdminRestaurantId(): string | null`
- `getAdminRestaurantName(): string | null`

`setAdminPin(null)` also clears the restaurant context so logout wipes both.

### 1.5 Mock — [`packages/shared/src/api/mock.ts`](../packages/shared/src/api/mock.ts)

Add `GET /admin/me` handler returning `{ restaurant: RESTAURANT }` from the seed data.

### 1.6 PinGate — [`apps/admin/src/components/PinGate.tsx`](../apps/admin/src/components/PinGate.tsx)

- Replace the `adminGetTables()` validation probe with `adminGetMe()`. On success: `setAdminRestaurant(res.restaurant)` then `setAuthenticated(true)`.
- FCM init reads `getAdminRestaurantId()` instead of `import.meta.env.VITE_RESTAURANT_ID`. Drop the env-var warning branch.
- Render the restaurant name in the nav (right of the tabs, before the logout button) so the operator sees which tenant they're logged into. Reads `getAdminRestaurantName()`.

### 1.7 Env cleanup

- Remove `VITE_RESTAURANT_ID` from [`.env.example`](../.env.example) (replace with a comment: "restaurant is now PIN-derived").
- Grep the repo for `VITE_RESTAURANT_ID` and delete every reader.

---

## Phase 2 — `READY` column on the Kitchen page

**Backend contract change required:** `GET /admin/kitchen` must return `CREATED`, `PREPARING`, **and** `READY` orders. Update the response description in [`openapi.yaml`](openapi.yaml) under `/admin/kitchen` to make this explicit.

### 2.1 [`apps/admin/src/routes/kitchen.tsx`](../apps/admin/src/routes/kitchen.tsx)

- New bucket: `const ready = orders.filter(o => o.status === "READY")`.
- Header chip row gains a third pill — `{ready.length} ready` — using the existing success token (`bg-success-container` / `text-on-success-container`).
- Grid: `lg:grid-cols-3` instead of `lg:grid-cols-2`.
- Third `<KitchenColumn>`:
  - `title="Ready"`, `accent="success"`.
  - Extend the `accent` union to `"error" | "amber" | "success"` and add a branch for the border color and quantity color.
  - **No CTA.** The column is informational. Make `ctaLabel` nullable on `ColumnProps` and gate the button render on `ctaLabel != null`.

### 2.2 Mock

In [`mock.ts`](../packages/shared/src/api/mock.ts), broaden the kitchen handler's status filter to include `READY` so the mock matches the new contract.

---

## Phase 3 — Frontend gaps

### 3.1 Reusable query error UI

New file: `apps/admin/src/components/QueryError.tsx`.

```tsx
interface Props {
  message?: string;
  onRetry: () => void;
}
```

Renders an icon + message + `<SecondaryButton onClick={onRetry}>Try again</SecondaryButton>` using the same empty-state spacing the routes already use. Default message: `"Couldn't load. Check your connection."`

Wire into all four list pages — render `<QueryError onRetry={query.refetch} />` when `query.isError`. Each route already has a loading branch; the error branch goes right after it.

Targets:

- [`dashboard.tsx`](../apps/admin/src/routes/dashboard.tsx) — `tablesQuery`
- [`kitchen.tsx`](../apps/admin/src/routes/kitchen.tsx) — `kitchenQuery`
- [`history.tsx`](../apps/admin/src/routes/history.tsx) — `historyQuery`
- [`menu.tsx`](../apps/admin/src/routes/menu.tsx) — `menuQuery`

### 3.2 401 re-prompt mid-session

Intercept in `client.ts` so no per-route plumbing is needed.

- In [`client.ts`](../packages/shared/src/api/client.ts) (the `!response.ok` branch), when `response.status === 401` **and** `options.admin === true`, before throwing:

  ```ts
  setAdminPin(null);
  setAdminRestaurant(null);
  window.dispatchEvent(new CustomEvent("oshap:admin-unauthorized"));
  ```

- PinGate adds a `useEffect` that listens for `"oshap:admin-unauthorized"` and calls `setAuthenticated(false)` + clears local form state. The PIN screen reappears automatically — no route guard logic per page.
- Also covers mock mode: in `mockRequest`'s 401 branch, dispatch the same event.

---

## Phase 4 — Pre-handoff docs in [`README.md`](../README.md)

Two new sections under **Backend dev — start here**, plus a one-line addition to **Auth surface**.

### 4.1 Admin push notifications (FCM)

1. Create a Firebase project in the console.
2. Add a Web app under **Project Settings → General → Your apps**.
3. Copy the SDK config values into `.env.local` — the `VITE_FCM_*` keys.
4. **Project Settings → Cloud Messaging → Web configuration** → generate a VAPID key pair → set `VITE_FCM_VAPID_KEY`.
5. Backend uses the Admin SDK service account (separate JSON, **not** committed) to send messages from the FastAPI side. See [`docs/whatsapp-to-fcm-migration.md`](whatsapp-to-fcm-migration.md) for trigger points.
6. Note: `firebase-messaging-sw.js` is generated at Vite build from these env vars ([`generateFirebaseSw.ts`](../apps/admin/generateFirebaseSw.ts)). **If values are empty the SW initializes empty and silently fails — the build does not error.**

### 4.2 Menu image storage

The frontend posts FormData to `POST /admin/menu/upload` (see [`adminUploadImage`](../packages/shared/src/api/admin.ts)) and expects `{ url: string }` back. Backend picks one of:

- **S3 + CloudFront** — recommended for production. Backend signs uploads, returns the CDN URL.
- **Local disk + nginx** — fine for single-VPS deploys. Backend writes to a static dir, returns the public path.
- **GCS / R2 / equivalent** — same pattern as S3.

Whichever — the response shape stays `{ url: string }`. No frontend change.

### 4.3 Multi-tenant note (one paragraph under "Auth surface")

> One PIN per restaurant. `GET /admin/me` is the canonical "who am I" call after PIN verify; the frontend uses the response for the FCM device registration tenant and the nav-header restaurant name. There is no `VITE_RESTAURANT_ID` env var.

---

## File touch list

| File | Phase |
|---|---|
| [`docs/openapi.yaml`](openapi.yaml) | 1, 2, 4 |
| [`packages/shared/src/types/index.ts`](../packages/shared/src/types/index.ts) | 1 |
| [`packages/shared/src/api/admin.ts`](../packages/shared/src/api/admin.ts) | 1 |
| [`packages/shared/src/api/client.ts`](../packages/shared/src/api/client.ts) | 1, 3 |
| [`packages/shared/src/api/mock.ts`](../packages/shared/src/api/mock.ts) | 1, 2 |
| [`apps/admin/src/components/PinGate.tsx`](../apps/admin/src/components/PinGate.tsx) | 1, 3 |
| `apps/admin/src/components/QueryError.tsx` (new) | 3 |
| [`apps/admin/src/routes/kitchen.tsx`](../apps/admin/src/routes/kitchen.tsx) | 2, 3 |
| [`apps/admin/src/routes/dashboard.tsx`](../apps/admin/src/routes/dashboard.tsx) | 3 |
| [`apps/admin/src/routes/history.tsx`](../apps/admin/src/routes/history.tsx) | 3 |
| [`apps/admin/src/routes/menu.tsx`](../apps/admin/src/routes/menu.tsx) | 3 |
| [`.env.example`](../.env.example) | 1 |
| [`README.md`](../README.md) | 4 |

---

## Sanity checks before declaring done

1. `npm run typecheck` clean across all workspaces.
2. **Mock mode walkthrough:**
   - Drop `VITE_API_BASE_URL` from `.env.local`, run `npm run dev:admin`.
   - Log in with `0000`. Nav header shows "Aji's Kitchen".
   - Kitchen has three columns (`New` / `Cooking` / `Ready`).
   - Kill the network. Refetch on any list page renders the `QueryError` component with a working retry button.
3. **401 re-prompt:** corrupt the PIN in sessionStorage (`oshap-admin-pin`) and trigger a refetch. PinGate should reappear with the login form.
