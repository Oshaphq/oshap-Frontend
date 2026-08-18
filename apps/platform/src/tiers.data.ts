import type { SubscriptionTier } from "@oshap/shared";

/**
 * Subscription pricing data — deliberately free of runtime imports.
 *
 * Split from tiers.ts so it can be read outside a Vite build: the production
 * smoke check imports this to assert the backend accepts every tier the
 * platform app offers, and pulling in @oshap/shared there fails because the
 * client reads `import.meta.env`. The type import above is erased at compile
 * time, so nothing is loaded at runtime.
 *
 * Everything here is in **kobo**, like every other money value in the codebase.
 */
export const TIER_MONTHLY_KOBO: Record<SubscriptionTier, number> = {
  LITE: 800_000,
  STANDARD: 1_800_000,
  PRO: 3_500_000,
  ENTERPRISE: 10_000_000,
};

/**
 * Annual is ten months' worth on every plan — a ~17% discount, and a rule
 * rather than three separate numbers, so it is derived. Writing the figures
 * out would let one drift from its monthly price unnoticed.
 */
export const MONTHS_BILLED_ANNUALLY = 10;

export const TIER_ANNUAL_KOBO: Record<SubscriptionTier, number> =
  Object.fromEntries(
    Object.entries(TIER_MONTHLY_KOBO).map(([tier, monthly]) => [
      tier,
      monthly * MONTHS_BILLED_ANNUALLY,
    ]),
  ) as Record<SubscriptionTier, number>;

/**
 * Every tier the system knows about, cheapest first. Used for filtering and
 * for reading an existing restaurant — not for selling.
 */
export const TIER_ORDER: SubscriptionTier[] = [
  "LITE",
  "STANDARD",
  "PRO",
  "ENTERPRISE",
];

/**
 * The plans actually on sale today.
 *
 * Enterprise sits under Phase 2 in the pricing strategy, alongside payment
 * infrastructure that does not exist yet. Offering it on the onboarding form
 * would be selling something we cannot deliver, so the picker shows these
 * three while TIER_ORDER still recognises all four.
 */
export const PHASE_1_TIERS: SubscriptionTier[] = ["LITE", "STANDARD", "PRO"];
