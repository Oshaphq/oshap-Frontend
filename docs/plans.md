# Plans

The canonical description of what each subscription plan includes. Prices live in
[`apps/platform/src/tiers.data.ts`](../apps/platform/src/tiers.data.ts) as integer kobo;
this file is the record of what a merchant is *buying*.

## The decision

**Every plan gets the whole product.** Customer self-ordering, the kitchen board,
payment verification, menu management, QR codes, analytics — all of it, on every tier.

Plans differ by **capacity, not capability**.

This reverses the earlier model, where Lite was sold as a "QR code menu" and ordering
started at Standard. That model was wrong for the market we are selling into: a small
restaurant that cannot take an order through the product has bought a digital menu, and
a digital menu is not worth a subscription. It also made the cheapest plan the one most
likely to churn, which is exactly backwards.

## Tier Model (20 Aug)

| Tier | Monthly | Annual (10 months) | Monthly Orders | Locations | Staff Accounts | Tables | Features |
|---|---|---|---|---|---|---|---|
| **Lite** | ₦8,000 | ₦80,000 | **10,000** | **1** | ∞ | ∞ | All |
| **Standard** | ₦18,000 | ₦180,000 | **Unlimited** | **1** | ∞ | ∞ | All |
| **Pro** | ₦35,000 | ₦350,000 | **Unlimited** | **Unlimited** | ∞ | ∞ | All |
| **Enterprise** | ₦100,000 | ₦1,000,000 | **Unlimited** | **Unlimited** | ∞ | ∞ | All |

"All features" is literal — customer ordering, kitchen and bar display, payment
verification and table clearing, menu and modifiers, ingredient inventory, QR generation,
receipts, analytics, staff roles and RBAC, realtime alerts.

Enterprise exists in `TIER_ORDER` but is not on sale in Phase 1. The onboarding picker offers `PHASE_1_TIERS` (`LITE`, `STANDARD`, `PRO`).

### Why these caps

Two axes, one per tier gap:
- **Order volume (10,000/mo)** separates Lite from Standard.
- **Locations (1 vs Multi-location)** separates Standard from Pro.

Tables and staff accounts are **unlimited on all tiers** — both were proposed as caps and both were dropped, because restricting them would bite during live service, which is the one time a limit must never interrupt operations.

## Enforcement status

**Nothing enforces these yet.** The backend caps neither order volume nor location count today, so every plan behaves as uncapped. Showing usage early (e.g. at 80% usage threshold `USAGE_WARN_AT`) is the goal so merchants receive fair warning before a limit is reached.

Outstanding, in order:

1. **Remove the feature gates.** Every tier reaches every endpoint. This is the blocking
   one: while it stands, a Lite restaurant is refused table management and so cannot
   generate a QR code.
2. Backend counts orders per calendar month per restaurant and returns the figure, so
   `orderUsage()` has something real to read. Counting comes before enforcing — a merchant
   must be able to see the number before it can cost them anything.
3. Backend rejects branch creation past the location cap with `403` and a message naming the
   limit and the plan — not a bare "forbidden". A second location is set-up work, never
   mid-service, so refusing one is safe.
4. Admin surfaces "8,100 of 10,000 orders this month" at `USAGE_WARN_AT`, before the
   merchant hits the wall.
5. Tier changes recalculate: downgrading a restaurant that is already over a cap must be a
   deliberate decision, not a silent lockout.

Order matters. (1) without the rest means every plan behaves as unlimited for a while,
which is the safe direction to be wrong in — we under-charge rather than block a paying
restaurant mid-service. Enforcing before (1) would be the worst of both.

**Open question: what the order cap does when it is reached.** The location cap can refuse
outright. The order cap cannot — it is reached in the middle of a Saturday, and a plan
limit must never be the reason a guest cannot order. So crossing 10,000 is a billing
conversation, not a `403`. Whether that means an overage charge, an automatic upgrade, or
a hard prompt to the owner with service continuing regardless, is undecided. Nothing
should enforce this axis until it is.

## Testing

[`smoke/production.smoke.ts`](../smoke/production.smoke.ts) carries the grant model as three
pending tests — Lite reaching every admin surface, and the two caps. All three are
`test.fixme` because none of it is built yet. The two cap stubs are `Lite caps locations
at 1` and `Lite caps monthly orders at 10,000` — the location one can be written as soon
as the backend refuses a second branch; the order one waits on the open question above.

Observed on a fresh Lite tenant, 19 August 2026:

```
/admin/menu               200
/admin/settings           200
/admin/staff              200
/admin/tables             403   ← a QR code is per table
/admin/kitchen            403
/admin/ingredients        403
```

The `/admin/tables` 403 is the sharp one: without table management a Lite restaurant
cannot produce the QR codes that are the entire product.

The ordering walk still runs on Standard rather than Lite for the same reason. It moves to
Lite in the same change that removes the gates — if ordering ever quietly becomes a paid
upgrade again, that is where it surfaces.
