import { describe, it, expect } from "vitest";
import {
  monthlyRecurringKobo,
  TIER_MONTHLY_KOBO,
  TIER_ORDER,
  tierPriceLabel,
} from "./tiers";

// The platform dashboard reported a ₦9,900 subscription as ₦99, because the
// price table held naira while formatCurrency expects kobo. These pin the unit.
describe("subscription pricing", () => {
  it("stores prices in kobo, so the published naira figures render back", () => {
    expect(tierPriceLabel("STARTER")).toBe("₦9,900/mo");
    expect(tierPriceLabel("PRO")).toBe("₦24,900/mo");
    expect(tierPriceLabel("ENTERPRISE")).toBe("₦79,900/mo");
    expect(tierPriceLabel("FREE")).toBe("₦0/mo");
  });

  it("keeps every price a whole number of kobo", () => {
    for (const tier of TIER_ORDER) {
      expect(Number.isInteger(TIER_MONTHLY_KOBO[tier])).toBe(true);
    }
  });

  it("orders tiers cheapest first", () => {
    const prices = TIER_ORDER.map((t) => TIER_MONTHLY_KOBO[t]);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });
});

describe("monthlyRecurringKobo", () => {
  it("counts only active restaurants", () => {
    const mrr = monthlyRecurringKobo([
      { subscription_tier: "STARTER", is_active: true },
      { subscription_tier: "PRO", is_active: false },
    ]);
    expect(mrr).toBe(990_000);
    expect(tierPriceLabel("STARTER")).toContain("9,900");
  });

  it("sums a mixed book correctly", () => {
    // 2 starter + 1 pro + 1 enterprise = 9,900 + 9,900 + 24,900 + 79,900
    const mrr = monthlyRecurringKobo([
      { subscription_tier: "STARTER", is_active: true },
      { subscription_tier: "STARTER", is_active: true },
      { subscription_tier: "PRO", is_active: true },
      { subscription_tier: "ENTERPRISE", is_active: true },
      { subscription_tier: "FREE", is_active: true },
    ]);
    expect(mrr).toBe(12_460_000);
  });

  it("is zero for an empty or wholly inactive book", () => {
    expect(monthlyRecurringKobo([])).toBe(0);
    expect(
      monthlyRecurringKobo([{ subscription_tier: "PRO", is_active: false }]),
    ).toBe(0);
  });

  it("reports the single-restaurant case the dashboard got wrong", () => {
    // One active STARTER — the exact state that displayed as ₦99.
    const mrr = monthlyRecurringKobo([
      { subscription_tier: "STARTER", is_active: true },
    ]);
    expect(mrr).toBe(990_000);
    expect(mrr / 100).toBe(9_900);
  });
});
