/**
 * The last order this device had at this table.
 *
 * `/session/orders` and `/table/{id}` both return only *active* orders, so the
 * moment a bill settles the guest has no way back to it — and a receipt is the
 * one thing someone who has handed over money is owed.
 *
 * Remembered rather than fetched, because there is no endpoint that answers
 * "what did I just pay for". Kept in `sessionStorage`: it should survive a
 * reload, and it should not outlive the tab, since the next guest at that table
 * is a different person.
 *
 * **Written by `OrderWatch`, which is mounted app-wide.** The Pay screen used
 * to record this itself, which only worked if the guest happened to be looking
 * at it while the order was live. An order served and settled at the table
 * while the guest was reading the menu was never seen, so the screen kept
 * showing the previous order's receipt.
 */

const key = (tableId: string) => `oshap-last-order-${tableId}`;

export function rememberLastOrder(tableId: string, orderId: string): void {
  if (typeof window === "undefined" || !tableId || !orderId) return;
  try {
    window.sessionStorage.setItem(key(tableId), orderId);
  } catch {
    // Private browsing, or storage full. A missing receipt is a poor outcome
    // but not one worth throwing over.
  }
}

export function readLastOrder(tableId: string): string | null {
  if (typeof window === "undefined" || !tableId) return null;
  try {
    return window.sessionStorage.getItem(key(tableId));
  } catch {
    return null;
  }
}

/**
 * The newest of the orders on screen.
 *
 * Sorted by creation rather than trusting the order of the array — a guest who
 * orders a second round should get the second round's receipt, and nothing
 * promises the list arrives newest-last.
 */
export function newestOrderId(
  orders: Array<{ id: string; created_at?: string }> | undefined,
): string | null {
  if (!orders?.length) return null;
  const sorted = [...orders].sort(
    (a, b) =>
      new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime(),
  );
  return sorted[sorted.length - 1]?.id ?? null;
}
