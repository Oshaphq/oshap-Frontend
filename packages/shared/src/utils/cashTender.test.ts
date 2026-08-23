import { describe, it, expect } from "vitest";
import { cashTender, canSettleCash } from "./cashTender";

/**
 * From the pilot: ₦40,000 was entered against a ₦41,086.50 bill. The dialog
 * showed "still owing ₦1,086.50" and settled the table anyway, because the
 * cash endpoint marks orders CONFIRMED for their full amount and has no notion
 * of a part payment. The shortfall left no trace.
 */
describe("a tender that doesn't cover the bill", () => {
  it("is short by the difference", () => {
    expect(cashTender(4_000_000, 4_108_650)).toEqual({
      kind: "short",
      shortfall: 108_650,
    });
  });

  it("cannot settle the bill", () => {
    expect(canSettleCash(cashTender(4_000_000, 4_108_650))).toBe(false);
  });

  it("is short by a single kobo too — money is money", () => {
    expect(cashTender(4_108_649, 4_108_650).kind).toBe("short");
  });
});

describe("a tender that covers it", () => {
  it("owes change when it is over", () => {
    expect(cashTender(5_000_000, 4_108_650)).toEqual({
      kind: "change",
      change: 891_350,
    });
  });

  it("owes none when it is exact", () => {
    expect(cashTender(4_108_650, 4_108_650)).toEqual({ kind: "exact" });
  });

  it.each([5_000_000, 4_108_650])("settles at %i", (t) => {
    expect(canSettleCash(cashTender(t, 4_108_650))).toBe(true);
  });
});

describe("a blank box", () => {
  // "Settling it, didn't count it." The amount is optional at the endpoint, so
  // a cashier who doesn't want to type a figure is not trapped by the block.
  it("records nothing and still settles", () => {
    const tender = cashTender(null, 4_108_650);
    expect(tender).toEqual({ kind: "unrecorded" });
    expect(canSettleCash(tender)).toBe(true);
  });
});
