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

## Phase 1 plans

| | **Lite** | **Standard** | **Pro** |
|---|---|---|---|
| Monthly | ₦8,000 | ₦18,000 | ₦35,000 |
| Annual (10 months) | ₦80,000 | ₦180,000 | ₦350,000 |
| Active staff accounts | **3** | Unlimited | Unlimited |
| Tables | **10** | Unlimited | Unlimited |
| Everything else | ✅ | ✅ | ✅ |

"Everything else" is literal — customer ordering, kitchen and bar display, payment
verification and table clearing, menu and modifiers, ingredient inventory, QR generation,
receipts, analytics, staff roles and RBAC, realtime alerts.

Enterprise exists in `TIER_ORDER` but is not on sale. It sits in Phase 2 alongside payment
infrastructure that does not exist yet, so the onboarding picker offers only the three
above (`PHASE_1_TIERS`).

### Why these two limits

They are the two dimensions that track the size of the business rather than its ambition.
A ten-table restaurant with three staff on the system is genuinely small; when it outgrows
either number it has grown enough to pay more, and the upgrade prompt arrives at a moment
the owner already understands. Neither limit requires us to withhold something the
restaurant needs to operate.

Both are counts a merchant can see and reason about, which matters — a limit nobody can
predict hitting reads as a bug, not a plan.

## What "active staff accounts" counts

Staff rows that can log in. Deactivating an account frees a slot; the row and its history
stay, because an audit trail that disappears when someone leaves is not an audit trail.
The owner's own account counts toward the three.

## Enforcement status

**None of this is built.** The table above is the commercial decision, not a description of
how the system behaves today. Today the backend still gates *features* by tier — the model
this decision replaces — and caps nothing.

Outstanding, in order:

1. **Remove the feature gates.** Every tier reaches every endpoint. This is the blocking
   one: while it stands, a Lite restaurant is refused table management and so cannot
   generate a QR code.
2. Backend rejects staff creation past the cap with `403` and a message naming the limit and
   the plan — not a bare "forbidden".
3. Backend rejects table creation past the cap the same way.
4. Admin surfaces "3 of 3 staff accounts used" before the merchant hits the wall, and the
   same for tables.
5. Tier changes recalculate: downgrading a restaurant that is already over a cap must be a
   deliberate decision, not a silent lockout.

Order matters. (1) without (2) and (3) means every plan behaves as unlimited for a while,
which is the safe direction to be wrong in — we under-charge rather than block a paying
restaurant mid-service. (2) and (3) without (1) would be the worst of both.

## Testing

[`smoke/production.smoke.ts`](../smoke/production.smoke.ts) carries the grant model as three
pending tests — Lite reaching every admin surface, and the two caps. All three are
`test.fixme` because none of it is built yet.

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
