# Agent rules

- Two apps in `apps/`, one shared package in `packages/shared/`. Do not introduce a third app or move code outside this structure without asking.
- Tailwind v4 — there is no `tailwind.config.ts`. The `@theme` block lives in [`packages/shared/src/tokens/tokens.css`](packages/shared/src/tokens/tokens.css). Tokens are added there, not in JS config.
- Backend is FastAPI in a separate repo. The contract is [`docs/openapi.yaml`](docs/openapi.yaml). When you change request/response shapes in `packages/shared/src/types/`, update the spec in the same change.
- Customer app must stay unauthenticated. Admin app uses an `x-admin-pin` header attached by the shared `client.ts` — there is no JWT or session cookie.
- FCM is admin-only. Do not import Firebase into `apps/customer`.
