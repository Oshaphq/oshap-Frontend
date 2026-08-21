import { formatCurrency } from "@oshap/shared";
import type { SubscriptionTier } from "@oshap/shared";
import {
  MONTHS_BILLED_ANNUALLY,
  PHASE_1_TIERS,
  TIER_ANNUAL_KOBO,
  TIER_LOCATION_CAP,
  TIER_MONTHLY_KOBO,
  TIER_MONTHLY_ORDER_CAP,
  TIER_ORDER,
  USAGE_WARN_AT,
} from "./tiers.data";

// Re-exported so every existing import site keeps working; the data itself
// lives in tiers.data.ts, which has no runtime dependencies.
export {
  MONTHS_BILLED_ANNUALLY,
  PHASE_1_TIERS,
  TIER_ANNUAL_KOBO,
  TIER_LOCATION_CAP,
  TIER_MONTHLY_KOBO,
  TIER_MONTHLY_ORDER_CAP,
  TIER_ORDER,
  USAGE_WARN_AT,
};

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

/** e.g. `₦80,000/yr` — shown beside the monthly price so a merchant can compare. */
export function tierAnnualLabel(tier: SubscriptionTier): string {
  return `${formatCurrency(TIER_ANNUAL_KOBO[tier])}/yr`;
}

/**
 * How close a restaurant is to its monthly order allowance.
 *
 * `null` when the plan is uncapped, which is most of them — the caller should
 * render nothing rather than a full bar or a reassuring zero.
 */
export function orderUsage(
  tier: SubscriptionTier,
  monthlyOrders: number,
): { used: number; cap: number; fraction: number; nearLimit: boolean } | null {
  const cap = TIER_MONTHLY_ORDER_CAP[tier];
  if (cap == null) return null;
  const fraction = cap === 0 ? 1 : monthlyOrders / cap;
  return {
    used: monthlyOrders,
    cap,
    fraction: Math.min(fraction, 1),
    nearLimit: fraction >= USAGE_WARN_AT,
  };
}

/** e.g. `1 location` / `Unlimited locations`. */
export function locationAllowanceLabel(tier: SubscriptionTier): string {
  const cap = TIER_LOCATION_CAP[tier];
  if (cap == null) return "Unlimited locations";
  return `${cap} location${cap === 1 ? "" : "s"}`;
}

/** e.g. `10,000 orders / month` / `Unlimited orders / month`. */
export function orderAllowanceLabel(tier: SubscriptionTier): string {
  const cap = TIER_MONTHLY_ORDER_CAP[tier];
  if (cap == null) return "Unlimited orders / month";
  return `${cap.toLocaleString()} orders / month`;
}
