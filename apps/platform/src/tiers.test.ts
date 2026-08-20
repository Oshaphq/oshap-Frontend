import { describe, it, expect } from "vitest";
import {
  MONTHS_BILLED_ANNUALLY,
  PHASE_1_TIERS,
  TIER_ANNUAL_KOBO,
  TIER_LOCATION_CAP,
  TIER_MONTHLY_KOBO,
  TIER_MONTHLY_ORDER_CAP,
  TIER_ORDER,
  locationAllowanceLabel,
  monthlyRecurringKobo,
  orderUsage,
  tierAnnualLabel,
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

// The pricing document lists a monthly and an annual figure for every plan,
// and annual is exactly ten months' worth. Deriving it means the two can't
// drift; these check the derivation against the published numbers.
describe("annual pricing", () => {
  it("matches the figures in the pricing document", () => {
    expect(tierAnnualLabel("LITE")).toBe("₦80,000/yr");
    expect(tierAnnualLabel("STANDARD")).toBe("₦180,000/yr");
    expect(tierAnnualLabel("PRO")).toBe("₦350,000/yr");
  });

  it("is ten months' worth on every plan, not a per-plan number", () => {
    for (const tier of TIER_ORDER) {
      expect(TIER_ANNUAL_KOBO[tier]).toBe(
        TIER_MONTHLY_KOBO[tier] * MONTHS_BILLED_ANNUALLY,
      );
    }
  });

  it("works out to a 17% discount", () => {
    for (const tier of TIER_ORDER) {
      const full = TIER_MONTHLY_KOBO[tier] * 12;
      const discount = 1 - TIER_ANNUAL_KOBO[tier] / full;
      expect(discount).toBeCloseTo(0.1667, 3);
    }
  });
});

describe("what is actually on sale", () => {
  it("offers the three Phase 1 plans", () => {
    expect(PHASE_1_TIERS).toEqual(["LITE", "STANDARD", "PRO"]);
  });

  it("does not offer Enterprise, which is a Phase 2 product", () => {
    // It stays in TIER_ORDER so an existing Enterprise restaurant is still
    // readable and filterable — it just isn't sellable yet.
    expect(PHASE_1_TIERS).not.toContain("ENTERPRISE");
    expect(TIER_ORDER).toContain("ENTERPRISE");
  });

  it("prices every plan it offers", () => {
    for (const tier of PHASE_1_TIERS) {
      expect(TIER_MONTHLY_KOBO[tier]).toBeGreaterThan(0);
      expect(TIER_ANNUAL_KOBO[tier]).toBeGreaterThan(0);
    }
  });
});

/**
 * Two axes, one per gap: order volume separates Lite from Standard, locations
 * separate Standard from Pro. Nothing enforces either yet, which is exactly
 * why the numbers need pinning — a cap that drifts from `docs/plans.md` is a
 * plan we are not selling.
 */
describe("plan limits", () => {
  it("caps only Lite on order volume", () => {
    expect(TIER_MONTHLY_ORDER_CAP.LITE).toBe(10_000);
    expect(TIER_MONTHLY_ORDER_CAP.STANDARD).toBeNull();
    expect(TIER_MONTHLY_ORDER_CAP.PRO).toBeNull();
  });

  it("gives multiple locations to Pro alone", () => {
    expect(TIER_LOCATION_CAP.LITE).toBe(1);
    expect(TIER_LOCATION_CAP.STANDARD).toBe(1);
    expect(TIER_LOCATION_CAP.PRO).toBeNull();
  });

  it("reports nothing for an uncapped plan", () => {
    // A progress bar that can never fill implies a limit that does not exist.
    expect(orderUsage("STANDARD", 40_000)).toBeNull();
    expect(orderUsage("PRO", 1)).toBeNull();
  });

  it("measures a capped plan against its ceiling", () => {
    const usage = orderUsage("LITE", 2_500)!;
    expect(usage.cap).toBe(10_000);
    expect(usage.fraction).toBeCloseTo(0.25);
    expect(usage.nearLimit).toBe(false);
  });

  it("warns before the limit bites, not at it", () => {
    expect(orderUsage("LITE", 7_999)!.nearLimit).toBe(false);
    expect(orderUsage("LITE", 8_000)!.nearLimit).toBe(true);
  });

  it("never reports more than a full bar", () => {
    // Nothing enforces the cap, so a restaurant can and will exceed it.
    const usage = orderUsage("LITE", 25_000)!;
    expect(usage.fraction).toBe(1);
    expect(usage.used).toBe(25_000);
  });

  it("names the allowance in words a person would use", () => {
    expect(locationAllowanceLabel("LITE")).toBe("1 location");
    expect(locationAllowanceLabel("PRO")).toBe("Unlimited locations");
  });
});
