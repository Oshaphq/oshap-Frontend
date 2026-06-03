You are a senior frontend engineer. This is the Oshap frontend handoff repo — the backend (FastAPI + PostgreSQL) lives elsewhere and is built against `docs/openapi.yaml`.

Style:
- Opinionated but clean
- Sensible defaults
- Production-ready

Stack:

- Vite 6 + React 19 + TypeScript (three apps: `apps/customer`, `apps/admin`, `apps/platform`)
- React Router v7
- Tailwind CSS v4 (CSS-first `@theme` block — no `tailwind.config.ts`)
- TanStack Query v5 over typed `fetch` wrappers in `packages/shared`
- FCM web push (admin only)
- npm workspaces (Node 20+)

File layout:

- `apps/customer/src/{routes,components,context}/` — public SPA (menu, checkout, pay, orders)
- `apps/admin/src/{routes,components}/` — merchant SPA (dashboard, kitchen, history, menu, settings, analytics; email/password login + RBAC)
- `apps/platform/src/{routes}/` — internal operator portal (tenant onboarding, subscriptions, system health)
- `packages/shared/src/`
  - `api/` — `client.ts` (fetch + `x-admin-pin` + `x-platform-token` + active-branch), `keys.ts` (query-key factory), and per-resource modules
  - `hooks/` — TanStack Query hooks
  - `types/` — domain types mirroring `docs/openapi.yaml`
  - `tokens/tokens.css` — Tailwind v4 `@theme` block
  - `utils/` — `getDeviceToken`, `formatCurrency`
- `docs/` — OpenAPI spec, data model, DDL, FCM migration notes
- `tokens/` — source JSON design tokens (Figma export)

Design system:

- All styling is Tailwind utilities. Do not write CSS Modules or `style={...}` unless there's no utility for it.
- Semantic color utilities (`bg-primary`, `text-on-surface-variant`, etc.) auto-swap on dark mode via `[data-theme="dark"]`. No `dark:` prefix needed.
- Color ramp also exposed (`bg-primary-50`, `text-secondary-30`).
- **Color usage rule (mandatory — every new UI must conform): see [`docs/color-usage.md`](docs/color-usage.md).** In short — page & top nav: `bg-surface`; card/sheet/drawer/input: `bg-surface-container-low`; modal/dialog: `bg-surface-container-high`; nested block inside a card: `bg-surface-container`; icon-bg / inactive pill / chip on a `surface` bg: `bg-surface-container-high`; hover: `bg-surface-container-high` → `-highest`. Never hardcode hex or use a raw ramp step for a surface.
- Spacing scale: `xs`, `s`, `md`, `l`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`, `7xl`, `8xl`, `9xl`, `10xl`, `11xl`.
- Radius scale: `xs`, `s`, `md`, `l`, `xl`, `2xl`, `3xl`, `4xl`.
- Typography: `text-h1` through `text-h6`, `text-p`, `text-caption-md/sm/xs`, plus Figma aliases `text-p1/p2/p3`, `text-label-l1` through `l5`, `text-display-h1` through `h4`, `text-emphasized-lg/md/sm`.
- Font families: `font-sans` (Inter), `font-display` (Poppins), `font-emphasized` (Space Grotesk).

Data layer rules:

- Never call `fetch` directly from a route or component. Always go through `@oshap/shared`'s hooks or the per-resource api modules.
- Adding an endpoint = update `packages/shared/src/types/`, add to the matching `api/*.ts`, add a TanStack hook, then update `docs/openapi.yaml`.
- Use `formatCurrency()` and `getDeviceToken()` from `@oshap/shared` — don't reimplement.

@AGENTS.md
