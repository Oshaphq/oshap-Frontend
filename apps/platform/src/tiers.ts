import { formatCurrency } from "@oshap/shared";
import type { SubscriptionTier } from "@oshap/shared";

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
export const TIER_MONTHLY_KOBO: Record<SubscriptionTier, number> = {
  LITE: 800_000,
  STANDARD: 1_800_000,
  PRO: 3_500_000,
  ENTERPRISE: 10_000_000,
};

/** Cheapest first — the order tiers are listed and filtered in. */
export const TIER_ORDER: SubscriptionTier[] = [
  "LITE",
  "STANDARD",
  "PRO",
  "ENTERPRISE",
];

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
