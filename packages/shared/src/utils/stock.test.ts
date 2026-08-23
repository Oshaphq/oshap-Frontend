import { describe, it, expect } from "vitest";
import { stockLabel, stockState } from "./stock";

/**
 * A guest ordered three of a dish with two left, and nothing anywhere stopped
 * them — the customer app never read `stock_count`, and the API accepted it.
 * The kitchen then has to go out and apologise.
 */

describe("an untracked dish", () => {
  it("has no limit, because most dishes do not", () => {
    const s = stockState({ stock_count: null, low_stock_threshold: 5 }, 99);
    expect(s.tracked).toBe(false);
    expect(s.canAddMore).toBe(true);
    expect(stockLabel(s)).toBeNull();
  });
});

describe("a tracked dish", () => {
  it("counts what is left after this guest's cart", () => {
    const s = stockState({ stock_count: 2, low_stock_threshold: 5 }, 1);
    expect(s.remaining).toBe(1);
    expect(s.canAddMore).toBe(true);
  });

  it("stops at the count — the case that shipped", () => {
    // Two in stock, two already in the cart. A third is what went wrong.
    const s = stockState({ stock_count: 2, low_stock_threshold: 5 }, 2);
    expect(s.remaining).toBe(0);
    expect(s.canAddMore).toBe(false);
  });

  it("never goes negative when a cart already exceeds stock", () => {
    // Reachable: staff can lower the count while a guest holds items, and a
    // negative "left" would read as nonsense on the card.
    const s = stockState({ stock_count: 2, low_stock_threshold: 5 }, 5);
    expect(s.remaining).toBe(0);
    expect(s.canAddMore).toBe(false);
  });

  it("is sold out at zero", () => {
    const s = stockState({ stock_count: 0, low_stock_threshold: 5 });
    expect(s.soldOut).toBe(true);
    expect(s.canAddMore).toBe(false);
    expect(stockLabel(s)).toBe("Sold out");
  });
});

describe("what the guest is told", () => {
  it("says nothing when there is plenty", () => {
    // A dish with forty in stock does not need a number on it.
    expect(stockLabel(stockState({ stock_count: 40, low_stock_threshold: 5 }))).toBeNull();
  });

  it("counts down once the restaurant's own warning level is crossed", () => {
    expect(stockLabel(stockState({ stock_count: 2, low_stock_threshold: 5 }))).toBe(
      "Only 2 left",
    );
  });

  it("reflects the cart in the number it shows", () => {
    expect(stockLabel(stockState({ stock_count: 2, low_stock_threshold: 5 }, 1))).toBe(
      "Only 1 left",
    );
  });

  it("stays low even when the cart holds the rest", () => {
    // "Low" is a fact about the kitchen, not about this cart — so a guest
    // holding the last two is still told the restaurant is nearly out.
    const s = stockState({ stock_count: 2, low_stock_threshold: 5 }, 2);
    expect(s.low).toBe(true);
  });

  it("treats a missing threshold as no warning level", () => {
    const s = stockState({ stock_count: 3, low_stock_threshold: null });
    expect(s.low).toBe(false);
    expect(stockLabel(s)).toBeNull();
    // Still capped — the count is real even with no threshold set.
    expect(stockState({ stock_count: 3, low_stock_threshold: null }, 3).canAddMore).toBe(false);
  });
});
