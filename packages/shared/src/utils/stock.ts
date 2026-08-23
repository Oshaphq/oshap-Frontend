/**
 * What a guest may still order of a dish.
 *
 * Nothing enforced this anywhere: the customer app never read `stock_count`,
 * and the API accepts an order for three when two are left. A guest ordered
 * the third latte of two, which the kitchen then has to walk out and apologise
 * for.
 *
 * This closes the ordinary case — one guest, one screen, a count in front of
 * them. It cannot close the real one: two guests can each take the last two at
 * the same moment, and only the server can check and decrement in one step.
 * That is a backend ask, and this is not a substitute for it.
 */

export interface StockState {
  /** False when the dish is untracked — most of them, and no limit applies. */
  tracked: boolean;
  soldOut: boolean;
  /** What is left after what this guest already has in their cart. */
  remaining: number | null;
  canAddMore: boolean;
  /** At or under the restaurant's own warning level — worth telling a guest. */
  low: boolean;
}

export function stockState(
  item: { stock_count?: number | null; low_stock_threshold?: number | null },
  inCart = 0,
): StockState {
  const count = item.stock_count;
  if (count == null) {
    return { tracked: false, soldOut: false, remaining: null, canAddMore: true, low: false };
  }

  const remaining = Math.max(0, count - inCart);
  const threshold = item.low_stock_threshold ?? 0;

  return {
    tracked: true,
    soldOut: count <= 0,
    remaining,
    canAddMore: remaining > 0,
    // Judged on the dish's own count, not what is left after this cart — a
    // guest holding the last two should still be told the kitchen is nearly
    // out, because that is true of the restaurant rather than of their cart.
    low: count > 0 && count <= threshold,
  };
}

/**
 * What to put on the card. Null means say nothing: a dish with forty in stock
 * does not need a number, and printing one turns a menu into a warehouse
 * report.
 */
export function stockLabel(state: StockState): string | null {
  if (!state.tracked) return null;
  if (state.soldOut) return "Sold out";
  if (state.low && state.remaining != null) return `Only ${state.remaining} left`;
  return null;
}
