import { formatCurrency } from "@oshap/shared";
import type { SubscriptionTier } from "@oshap/shared";
import { TIER_MONTHLY_KOBO, TIER_ORDER } from "./tiers.data";

// Re-exported so every existing import site keeps working; the data itself
// lives in tiers.data.ts, which has no runtime dependencies.
export { TIER_MONTHLY_KOBO, TIER_ORDER };

/**
 * Subscription pricing — the single source of truth for the platform app.
 *
 * Previously this table existed in four places: twice as numbers and twice as
 * hardcoded display strings. The numeric copies held **naira** and were passed
 * to `formatCurrency`, which expects kobo, so the dashboard reported a ₦9,900
 * subscription as ₦99 while the tier picker beside it — reading one of the
 * hardcoded strings — showed the right figure.
 *
 * Everything here is in **kobo**, like every other money value in the codebase,
 * and the labels are derived rather than written out, so the two can no longer
 * disagree.
 */


/** e.g. `₦9,900/mo`. Derived, never typed out. */
export function tierPriceLabel(tier: SubscriptionTier): string {
  return `${formatCurrency(TIER_MONTHLY_KOBO[tier])}/mo`;
}

/** Monthly recurring revenue, in kobo, from the active restaurants given. */
export function monthlyRecurringKobo(
  restaurants: Array<{ subscription_tier: SubscriptionTier; is_active: boolean }>,
): number {
  return restaurants
    .filter((r) => r.is_active)
    .reduce((sum, r) => sum + (TIER_MONTHLY_KOBO[r.subscription_tier] ?? 0), 0);
}
