# Screen Map

> Every screen across the three apps, its route, what it looks like live, and which endpoints it calls.
> Scan by the endpoint column to jump from an API you're working on straight to the screen that consumes it.

## Legend

- **Live** — opens the deployed build. Click to see the actual screen.
- **Endpoints hit** — what the screen calls. Paths are relative to the API base URL.
- **Figma** — `✅ core` = a designed frame exists to check against · `⚠️ code-only` = built in code, the live app *is* the reference · `❓` = you confirm.

---

## Customer — public, unauthenticated SPA

Base: <https://oshap-frontend-customer.vercel.app> · No auth header. Screens need a real
`?table=` to load (they call `GET /table/{id}`); `T1` exists, so the links below render populated.

| Screen | Route | Live | Endpoints hit | Figma |
|---|---|---|---|---|
| Menu | `/menu?table=:id` | [open ↗][c-menu] | `GET /table/{id}`, `GET /menu?restaurant_id=` | ❓ |
| Checkout | `/checkout?table=:id` | [open ↗][c-checkout] | `GET /table/{id}`, `POST /orders` | ❓ |
| Orders | `/orders?table=:id` | [open ↗][c-orders] | `GET /session/orders`, `POST /session` | ❓ |
| Pay | `/pay?table=:id` | [open ↗][c-pay] | `GET /table/{id}`, `POST /payment/confirm`, `POST /table/{id}/request-pos`, `POST /table/{id}/call-waiter` | ❓ |

[c-menu]:     https://oshap-frontend-customer.vercel.app/menu?table=T1
[c-checkout]: https://oshap-frontend-customer.vercel.app/checkout?table=T1
[c-orders]:   https://oshap-frontend-customer.vercel.app/orders?table=T1
[c-pay]:      https://oshap-frontend-customer.vercel.app/pay?table=T1

---

## Admin — merchant SPA

Base: <https://oshap-frontend-admin.vercel.app> · Email/password login + `Authorization: Bearer` + RBAC.
**Deep links redirect to login until you sign in** — `owner@oshap.com` / `password`. After login, `/` redirects `KITCHEN`/`BARTENDER` roles to `/kitchen`.

| Screen | Route | Live | Endpoints hit | Roles | Figma |
|---|---|---|---|---|---|
| Login / auth gate | (gate) | [open ↗][a-root] | `POST /auth/login`, `GET /auth/me` | — | ❓ |
| Dashboard | `/` | [open ↗][a-root] | `GET /admin/tables`, `POST /admin/verify`, `POST /admin/close`, `GET /admin/inventory/alerts` | all | ❓ |
| Kitchen | `/kitchen` | [open ↗][a-kitchen] | `GET /admin/kitchen`, `PATCH /admin/kitchen`, `GET /admin/menu` | OWNER, MANAGER, KITCHEN, BARTENDER | ❓ |
| History | `/history` | [open ↗][a-history] | `GET /admin/history` | OWNER, MANAGER | ❓ |
| Menu mgmt | `/menu` | [open ↗][a-menu] | `GET/POST /admin/menu`, `PUT/PATCH/DELETE /admin/menu/{id}`, `POST /admin/menu/upload`, `GET /admin/inventory/alerts`, `PATCH /admin/inventory/{id}` | OWNER, MANAGER | ❓ |
| Settings · General | `/settings/general` | [open ↗][a-set-gen] | `GET /admin/settings`, `PATCH /admin/settings`, `POST /admin/settings/upload` | OWNER, MANAGER | ❓ |
| Settings · Staff | `/settings/staff` | [open ↗][a-set-staff] | `GET/POST /admin/staff`, `PATCH/DELETE /admin/staff/{id}` | OWNER, MANAGER | ❓ |
| Settings · Tables | `/settings/tables` | [open ↗][a-set-tables] | `GET/POST /admin/tables`, `DELETE /admin/tables/{id}` | OWNER, MANAGER | ❓ |
| Analytics | `/analytics` | [open ↗][a-analytics] | `GET /admin/analytics`, `GET /admin/group` | OWNER | ❓ |
| Group analytics | `/analytics/group` | [open ↗][a-group] | `GET /admin/group`, `GET /admin/group/analytics` | OWNER | ❓ |

**FCM web push** (admin only) registers via `POST /devices/register`.

[a-root]:       https://oshap-frontend-admin.vercel.app/
[a-kitchen]:    https://oshap-frontend-admin.vercel.app/kitchen
[a-history]:    https://oshap-frontend-admin.vercel.app/history
[a-menu]:       https://oshap-frontend-admin.vercel.app/menu
[a-set-gen]:    https://oshap-frontend-admin.vercel.app/settings/general
[a-set-staff]:  https://oshap-frontend-admin.vercel.app/settings/staff
[a-set-tables]: https://oshap-frontend-admin.vercel.app/settings/tables
[a-analytics]:  https://oshap-frontend-admin.vercel.app/analytics
[a-group]:      https://oshap-frontend-admin.vercel.app/analytics/group

---

## Platform — internal operator portal

Base: <https://oshap-frontend-platform.vercel.app> · `x-platform-token` header.

| Screen | Route | Live | Endpoints hit | Figma |
|---|---|---|---|---|
| Dashboard | `/` | [open ↗][p-root] | `GET /platform/restaurants`, `GET /platform/health` | ❓ |
| Restaurants | `/restaurants` | [open ↗][p-rests] | `GET /platform/restaurants` | ❓ |
| New restaurant | `/restaurants/new` | [open ↗][p-new] | `POST /platform/restaurants` | ❓ |
| Restaurant detail | `/restaurants/:id` | [open ↗][p-detail] | `GET /platform/restaurants/{id}`, `PATCH /platform/restaurants/{id}` | ❓ |
| Subscriptions | `/subscriptions` | [open ↗][p-subs] | `GET /platform/restaurants` | ❓ |
| System health | `/health` | [open ↗][p-health] | `GET /platform/health` | ❓ |

[p-root]:   https://oshap-frontend-platform.vercel.app/
[p-rests]:  https://oshap-frontend-platform.vercel.app/restaurants
[p-new]:    https://oshap-frontend-platform.vercel.app/restaurants/new
[p-detail]: https://oshap-frontend-platform.vercel.app/restaurants/rest-001
[p-subs]:   https://oshap-frontend-platform.vercel.app/subscriptions
[p-health]: https://oshap-frontend-platform.vercel.app/health
