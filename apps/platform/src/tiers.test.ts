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
    expect(tierPriceLabel("LITE")).toBe("₦8,000/mo");
    expect(tierPriceLabel("STANDARD")).toBe("₦18,000/mo");
    expect(tierPriceLabel("PRO")).toBe("₦35,000/mo");
    expect(tierPriceLabel("ENTERPRISE")).toBe("₦100,000/mo");
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
      { subscription_tier: "LITE", is_active: true },
      { subscription_tier: "PRO", is_active: false },
    ]);
    expect(mrr).toBe(800_000);
    expect(tierPriceLabel("LITE")).toContain("8,000");
  });

  it("sums a mixed book correctly", () => {
    // 2 lite + 1 standard + 1 pro + 1 enterprise = 8,000 + 8,000 + 18,000 + 35,000 + 100,000 = 169,000 naira
    const mrr = monthlyRecurringKobo([
      { subscription_tier: "LITE", is_active: true },
      { subscription_tier: "LITE", is_active: true },
      { subscription_tier: "STANDARD", is_active: true },
      { subscription_tier: "PRO", is_active: true },
      { subscription_tier: "ENTERPRISE", is_active: true },
    ]);
    expect(mrr).toBe(16_900_000);
  });

  it("is zero for an empty or wholly inactive book", () => {
    expect(monthlyRecurringKobo([])).toBe(0);
    expect(
      monthlyRecurringKobo([{ subscription_tier: "PRO", is_active: false }]),
    ).toBe(0);
  });

  it("reports the single-restaurant case correctly", () => {
    const mrr = monthlyRecurringKobo([
      { subscription_tier: "LITE", is_active: true },
    ]);
    expect(mrr).toBe(800_000);
    expect(mrr / 100).toBe(8_000);
  });
});
