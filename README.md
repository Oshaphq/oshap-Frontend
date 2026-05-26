# Oshap

QR-based table ordering and payment system. Customers scan a QR at a table, browse a menu, order, and pay via bank transfer. The merchant gets push notifications and can verify payments from a dashboard.

This repo holds the **frontend only**. The Python/FastAPI backend lives in a separate repo and is built against the contract in [`docs/openapi.yaml`](docs/openapi.yaml).

## Stack

| Layer | Tool |
|---|---|
| Apps | Vite 6 + React 19 + TypeScript |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) |
| Data | TanStack Query v5 over typed `fetch` wrappers |
| Push (admin only) | Firebase Cloud Messaging |
| Package manager | npm workspaces (Node 20+) |

## Repository layout

```
oshap/
├── apps/
│   ├── customer/         Public Vite SPA — /menu /checkout /pay /orders
│   └── admin/            Merchant Vite SPA — /kitchen /history /menu
├── packages/
│   └── shared/           Typed API client, TanStack hooks, design tokens, utils
├── docs/
│   ├── openapi.yaml      Source of truth for the backend contract
│   ├── data-model.md     SQLModel-style entity definitions
│   ├── ddl.sql           PostgreSQL 15 baseline schema
│   └── whatsapp-to-fcm-migration.md
├── tokens/               Source design-token JSON (Figma export)
└── implementation-plan.md
```

## Quick start

```bash
# Node 20+
npm install

# No backend needed — mock API auto-activates
npm run dev:customer   # http://localhost:5173
npm run dev:admin      # http://localhost:5174 (PIN: 0000)
```

To point at a real backend, set `VITE_API_BASE_URL` in a `.env.local` file (see `.env.example`). The mock API is tree-shaken when a real backend URL is configured.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev:customer` / `dev:admin` | Vite dev server for the named app |
| `npm run build:customer` / `build:admin` | Production build into `apps/*/dist` |
| `npm run build` | Builds every workspace |
| `npm run typecheck` | `tsc --noEmit` across every workspace |
| `npm run lint` | ESLint across every workspace |

## Backend dev — start here

The contract is [`docs/openapi.yaml`](docs/openapi.yaml). Recommended starting points:

1. Read [`docs/data-model.md`](docs/data-model.md) for the entity shapes (SQLModel-friendly).
2. Apply [`docs/ddl.sql`](docs/ddl.sql) as your initial Alembic migration.
3. Stand up the FastAPI app against the OpenAPI spec — every endpoint in `apps/customer` and `apps/admin` is already typed against these schemas.
4. Read [`docs/whatsapp-to-fcm-migration.md`](docs/whatsapp-to-fcm-migration.md) for the notification trigger points (order placed, payment claimed, payment verified, issue flagged).
5. See [`docs/handoff-plan.md`](docs/handoff-plan.md) for the final round of frontend changes that landed before handoff.

Auth surface (MVP): admin routes expect an `x-admin-pin` header. The customer app is unauthenticated. **One PIN per restaurant** — the admin app calls `GET /admin/me` right after PIN verify to resolve the active restaurant, and uses `restaurant.id` for FCM device registration. There is no `VITE_RESTAURANT_ID` env var.

### Admin push notifications (FCM)

1. Create a Firebase project in the console.
2. Add a Web app under **Project Settings → General → Your apps**.
3. Copy the SDK config values into `.env.local` — the `VITE_FCM_*` keys.
4. **Project Settings → Cloud Messaging → Web configuration** → generate a VAPID key pair → set `VITE_FCM_VAPID_KEY`.
5. Backend sends messages from the FastAPI side using a Firebase Admin SDK service account (separate JSON, **not** committed). See [`docs/whatsapp-to-fcm-migration.md`](docs/whatsapp-to-fcm-migration.md) for trigger points.
6. `firebase-messaging-sw.js` is generated at Vite build from these env vars ([`apps/admin/generateFirebaseSw.ts`](apps/admin/generateFirebaseSw.ts)). **If values are empty the service worker initializes empty and silently fails — the build itself does not error.**

### Menu image storage

The admin app posts FormData to `POST /admin/menu/upload` and expects `{ url: string }` back ([`adminUploadImage`](packages/shared/src/api/admin.ts)). Backend picks one of:

- **S3 + CloudFront** — recommended for production. Backend signs uploads, returns the CDN URL.
- **Local disk + nginx** — fine for single-VPS deploys. Backend writes to a static dir, returns the public path.
- **GCS / R2 / equivalent** — same pattern as S3.

Whichever — the response shape stays `{ url: string }`. No frontend change.

## Environment variables

See [`.env.example`](.env.example). Both apps consume Vite env vars (`VITE_*`). The admin app additionally needs FCM web push credentials.

## Design system

Tokens live in [`packages/shared/src/tokens/tokens.css`](packages/shared/src/tokens/tokens.css) as a Tailwind v4 `@theme` block. Both apps `@import` it.

Semantic color utilities (`bg-primary`, `text-on-surface-variant`, etc.) auto-swap based on `[data-theme="dark"]` on `<html>` — no `dark:` prefix needed in markup. The full ramp (`bg-primary-50`, `text-secondary-30`) is also available.

Typography utilities `text-h1` through `text-h6`, `text-p`, `text-caption-*`, plus Figma aliases (`text-p1`, `text-label-l3`, `text-display-h1`, `text-emphasized-lg`). Heading sizes shrink at `<768px`.

## Adding a new endpoint

1. Add the request/response types to [`packages/shared/src/types/index.ts`](packages/shared/src/types/index.ts).
2. Add a typed fetch fn to the matching `packages/shared/src/api/*.ts` (`menu`, `tables`, `orders`, `payments`, `sessions`, `admin`, `devices`).
3. Add a TanStack Query hook in `packages/shared/src/hooks/`.
4. Update [`docs/openapi.yaml`](docs/openapi.yaml) so the backend dev sees it.
