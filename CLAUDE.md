You are a senior frontend engineer. This is the Oshap frontend handoff repo — the backend (FastAPI + PostgreSQL) lives elsewhere and is built against `docs/openapi.yaml`.

Style:
- Opinionated but clean
- Sensible defaults
- Production-ready

Stack:

- Vite 6 + React 19 + TypeScript (four apps: `apps/customer`, `apps/admin`, `apps/platform`, `apps/site`)
- React Router v7
- Tailwind CSS v4 (CSS-first `@theme` block — no `tailwind.config.ts`)
- TanStack Query v5 over typed `fetch` wrappers in `packages/shared`
- FCM web push (admin only)
- npm workspaces (Node 20+)

File layout:

- `apps/customer/src/{routes,components,context}/` — public SPA (menu, checkout, pay, orders)
- `apps/admin/src/{routes,components}/` — merchant SPA (dashboard, kitchen, history, menu, settings, analytics; email/password login + RBAC)
- `apps/platform/src/{routes}/` — internal operator portal (tenant onboarding, subscriptions, system health)
- `apps/site/src/` — static marketing page for restaurant owners (pricing, FAQ); no API calls
- `packages/shared/src/`
  - `api/` — `client.ts` (fetch + admin JWT Bearer auth w/ single-flight refresh + `x-platform-token` + active-branch), `keys.ts` (query-key factory), and per-resource modules
  - `hooks/` — TanStack Query hooks
  - `types/` — domain types mirroring `docs/openapi.yaml`
  - `tokens/tokens.css` — Tailwind v4 `@theme` block
  - `utils/` — `getDeviceToken`, `formatCurrency`
- `docs/` — OpenAPI spec, data model, DDL, FCM migration notes
- `tokens/` — source JSON design tokens (Figma export)

Design system (DS v3 — see `Oshap Design System v3.dc.html`):

- All styling is Tailwind utilities. Do not write CSS Modules or `style={...}` unless there's no utility for it.
- Semantic color utilities (`bg-primary`, `text-on-surface-variant`, etc.) auto-swap on dark mode via `[data-theme="dark"]`. No `dark:` prefix needed.
- Color ramp also exposed (`bg-primary-50`, `text-secondary-30`).
- **Color usage rule (mandatory — every new UI must conform): see [`docs/color-usage.md`](docs/color-usage.md).** In short — **nesting steps away from the page**: in light mode the page is lightest and each nested container a step darker; in dark mode the page is darkest and each stacked container a step lighter (Material 3's surface-container scale). Page: `bg-surface` (white) — and the customer/platform top bars; admin top nav (only) plus card/drawer/rail: `bg-surface-container-low` (`#F2F2F2`); a well or field inside a card: `bg-surface-container` (`#E8E8E8`, sunken); a neutral control on a card (quiet button, round icon button, neutral badge): `bg-surface-container-high` (`#DEDEDE`), hover `-highest`; dialog/menu/sheet/floating bar: `bg-surface-overlay` (the card tone). Never a neutral fill one step from its parent. Chips are outlined at rest and take `bg-primary`/`text-on-primary` when selected — the system-wide selected state, shared with the nav and the selected list row. Filled buttons use the seed `bg-primary` #F56500 with a **16px semibold** white label — white is 3.11:1 on it, which is AA for large text only, so body-size brand text uses `text-primary-label` (P40, 6.16:1). Neutrals are a **true neutral** — black-to-white in OKLCH at zero chroma, so `R=G=B` and they are literally colourless. Fixed and shared by every tenant, so the seed only ever reaches accents and the ramp works under any brand palette. Steps are named by OKLCH lightness (`grey-64` is L=64%). Never hardcode hex or use a raw palette step for a surface.
- Spacing scale — golden ratio, 4 × 1.618ⁿ, eight steps only: `xs` 4, `s` 6, `md` 10, `l` 17, `xl` 27, `2xl` 44, `3xl` 72, `4xl` 116. Between things (gap, margin) leans small; inside a box (padding) leans large. Cards are `p-l` (tile, list item) or `p-xl` (section, empty state, auth). No numeric padding/margin/gap — `spacing.test.ts` fails the build on one.
- Radius scale (M3): `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 28, `2xl` 32, `3xl` 40, `full` 100. Buttons and fields stay `sm`; cards `lg`; dialogs and bottom-sheet tops `xl`; pills and chips `full`. The FAB is `full` too — it ships as `rounded-full`, see `Fab.tsx`. (An earlier revision pinned it to the 16px card radius; that never shipped.)
- Typography — the 15 M3 roles: `text-display-large/medium/small`, `text-headline-large/medium/small`, `text-title-large/medium/small`, `text-body-large/medium/small`, `text-label-large/medium/small`. Display and headline shrink one step ≤768px on their own, so no call site needs a responsive variant. The old `text-h1`–`h6`, `text-p*`, `text-caption-*`, `text-label-l*`, `text-display-h*` and `text-emphasized-*` names are retired.
- Font families: `font-sans` (Instrument Sans, body), `font-display` (Archivo, display/headline/title/label). Space Grotesk is retired — the emphasized voice is a weight, not a third webfont.

Data layer rules:

- Never call `fetch` directly from a route or component. Always go through `@oshap/shared`'s hooks or the per-resource api modules.
- Adding an endpoint = update `packages/shared/src/types/`, add to the matching `api/*.ts`, add a TanStack hook, then update `docs/openapi.yaml`.
- Use `formatCurrency()` and `getDeviceToken()` from `@oshap/shared` — don't reimplement.

@AGENTS.md
