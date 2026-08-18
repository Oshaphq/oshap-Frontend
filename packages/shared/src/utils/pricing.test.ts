import { describe, it, expect } from "vitest";
import {
  applyRate,
  basisPointsToPercent,
  computeOrderTotals,
  percentToBasisPoints,
} from "./pricing";

// These pin the client to the backend's `compute_order_totals`. If the server
// changes its arithmetic, a guest agrees to one figure at checkout and is
// charged another — with nothing erroring — so the formula is asserted rather
// than assumed.
describe("applyRate — integer basis points, half-up", () => {
  it("treats the rate as basis points, not a percentage", () => {
    // 7.5% of ₦1,000 is ₦75.
    expect(applyRate(100_000, 750)).toBe(7_500);
  });

  it("rounds half up rather than truncating", () => {
    // 100 * 750 = 75,000; +5,000 = 80,000; / 10,000 = 8 exactly.
    expect(applyRate(100, 750)).toBe(8);
    // 1 * 750 = 750; +5,000 = 5,750; floor(0.575) = 0.
    expect(applyRate(1, 750)).toBe(0);
  });

  it("returns whole kobo, never a fraction", () => {
    for (const amount of [1, 7, 33, 12_345, 999_999]) {
      expect(Number.isInteger(applyRate(amount, 750))).toBe(true);
    }
  });

  it("treats a missing or zero rate as no charge", () => {
    expect(applyRate(100_000, 0)).toBe(0);
    expect(applyRate(100_000, undefined)).toBe(0);
    expect(applyRate(100_000, null)).toBe(0);
  });
});

describe("computeOrderTotals", () => {
  const RATES = { vat_rate: 750, service_charge_rate: 1000 };

  it("taxes the service charge as part of the base, not alongside it", () => {
    const totals = computeOrderTotals(100_000, RATES);

    expect(totals.service_charge).toBe(10_000);
    // VAT is 7.5% of 110,000, not of 100,000 — 8,250, not 7,500.
    expect(totals.vat).toBe(8_250);
    expect(totals.total).toBe(118_250);
  });

  it("holds the invariant total = subtotal - discount + service + vat + tip", () => {
    const totals = computeOrderTotals(87_650, RATES, {
      discount: 5_000,
      tip: 2_000,
    });

    expect(totals.total).toBe(
      totals.subtotal -
        totals.discount +
        totals.service_charge +
        totals.vat +
        totals.tip,
    );
  });

  it("applies the discount before VAT, so a discount reduces the tax", () => {
    const full = computeOrderTotals(100_000, RATES);
    const discounted = computeOrderTotals(100_000, RATES, { discount: 50_000 });

    expect(discounted.vat).toBeLessThan(full.vat);
    // Base is 100,000 - 50,000 + 10,000 service = 60,000; 7.5% = 4,500.
    expect(discounted.vat).toBe(4_500);
  });

  it("does not tax the tip", () => {
    const withTip = computeOrderTotals(100_000, RATES, { tip: 20_000 });
    const without = computeOrderTotals(100_000, RATES);

    expect(withTip.vat).toBe(without.vat);
    expect(withTip.total).toBe(without.total + 20_000);
  });

  it("charges only the subtotal when a restaurant sets no rates", () => {
    const totals = computeOrderTotals(100_000, {});

    expect(totals.service_charge).toBe(0);
    expect(totals.vat).toBe(0);
    expect(totals.total).toBe(100_000);
  });

  it("keeps every figure a whole number of kobo", () => {
    const totals = computeOrderTotals(33_333, RATES, { discount: 777, tip: 11 });

    for (const value of Object.values(totals)) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe("percent <-> basis points", () => {
  it("converts the rates a Nigerian merchant actually types", () => {
    expect(percentToBasisPoints(7.5)).toBe(750);
    expect(percentToBasisPoints(5)).toBe(500);
    expect(percentToBasisPoints(10)).toBe(1000);
    expect(percentToBasisPoints(0)).toBe(0);
  });

  it("round-trips without drift", () => {
    for (const percent of [0, 2.5, 5, 7.5, 10, 12.5, 15]) {
      expect(basisPointsToPercent(percentToBasisPoints(percent))).toBe(percent);
    }
  });

  it("rounds to whole basis points rather than storing a float", () => {
    // 7.499% is not representable; storing it as a float would drift VAT by a
    // kobo on large bills and never be traced back.
    expect(percentToBasisPoints(7.499)).toBe(750);
    expect(Number.isInteger(percentToBasisPoints(3.333))).toBe(true);
  });

  it("feeds applyRate correctly end to end", () => {
    // ₦1,000 at a merchant-typed 7.5% is ₦75.
    expect(applyRate(100_000, percentToBasisPoints(7.5))).toBe(7_500);
  });
});
