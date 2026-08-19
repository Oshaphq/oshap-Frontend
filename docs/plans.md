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

**Not enforced yet.** The limits above are the commercial decision; the backend does not
currently cap either count, and the frontend does not surface them.

Outstanding, in order:

1. Backend rejects a staff creation past the tier's cap with `403` and a message naming the
   limit and the plan — not a bare "forbidden".
2. Backend rejects table creation past the cap the same way.
3. Admin surfaces "3 of 3 staff accounts used" on the staff screen, and the same on tables,
   before the merchant hits the wall.
4. Tier changes recalculate: downgrading a restaurant that is over a cap must be a decision
   someone makes deliberately, not a silent lockout.

Until (1) and (2) land, every plan behaves as unlimited. That is the safe direction to be
wrong in — we under-charge rather than block a paying pilot mid-service.

## Testing

[`smoke/production.smoke.ts`](../smoke/production.smoke.ts) asserts the grant model against
the live API: a Lite tenant must reach every admin surface, because Lite is now sold as the
full product. The quota assertions are marked pending until enforcement exists.
