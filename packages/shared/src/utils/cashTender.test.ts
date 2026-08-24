import { describe, it, expect } from "vitest";
import { cashTender, settlesBill } from "./cashTender";

/**
 * From the pilot: ₦40,000 was entered against a ₦41,086.50 bill and the table
 * settled in full, because the endpoint had no notion of a part payment. We
 * blocked short tenders as a stopgap; the endpoint takes them properly now, so
 * the job here is to say what is still owed rather than to refuse the money.
 */
describe("a tender that doesn't cover the bill", () => {
  it("is short by the difference", () => {
    expect(cashTender(4_000_000, 4_108_650)).toEqual({
      kind: "short",
      shortfall: 108_650,
    });
  });

  it("is recorded, but does not close the bill", () => {
    // Recordable now — but the button must not say "paid" over an amount that
    // leaves a balance.
    expect(settlesBill(cashTender(4_000_000, 4_108_650))).toBe(false);
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
    expect(settlesBill(cashTender(t, 4_108_650))).toBe(true);
  });
});

describe("a blank box", () => {
  // "Settling it, didn't count it." The amount is optional at the endpoint, so
  // a cashier who doesn't want to type a figure is not trapped by the block.
  it("records nothing and still settles", () => {
    const tender = cashTender(null, 4_108_650);
    expect(tender).toEqual({ kind: "unrecorded" });
    expect(settlesBill(tender)).toBe(true);
  });
});
