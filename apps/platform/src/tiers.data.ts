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

/** Cheapest first — the order tiers are listed and filtered in. */
export const TIER_ORDER: SubscriptionTier[] = [
  "LITE",
  "STANDARD",
  "PRO",
  "ENTERPRISE",
];
