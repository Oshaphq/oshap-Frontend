import { describe, it, expect, beforeEach } from "vitest";
import { newestOrderId, rememberLastOrder, readLastOrder } from "./lastOrder";

beforeEach(() => window.sessionStorage.clear());

/**
 * A guest who has handed over money is owed proof of what it bought, and no
 * endpoint answers "what did I just pay for" — `/session/orders` and
 * `/table/{id}` both drop an order the moment it settles. So it is remembered
 * while it is still live.
 */
describe("which order the receipt is for", () => {
  it("picks the newest, not the last in the list", () => {
    // A second round should show the second round's receipt, and nothing
    // promises the API returns them oldest-first.
    expect(
      newestOrderId([
        { id: "later", created_at: "2026-08-24T20:10:00Z" },
        { id: "earlier", created_at: "2026-08-24T19:00:00Z" },
      ]),
    ).toBe("later");
  });

  it.each([[undefined], [[]]])("has no answer for %o", (orders) => {
    expect(newestOrderId(orders as undefined)).toBeNull();
  });

  it("copes with an order carrying no timestamp", () => {
    const id = newestOrderId([{ id: "a" }, { id: "b", created_at: "2026-08-24T19:00:00Z" }]);
    expect(id).toBe("b");
  });
});

describe("remembering it", () => {
  it("survives being read back", () => {
    rememberLastOrder("T4", "ord-1");
    expect(readLastOrder("T4")).toBe("ord-1");
  });

  it("is kept per table, so two tables never share a receipt", () => {
    rememberLastOrder("T4", "ord-1");
    rememberLastOrder("T5", "ord-2");
    expect(readLastOrder("T4")).toBe("ord-1");
    expect(readLastOrder("T5")).toBe("ord-2");
  });

  it("a newer order replaces the last", () => {
    // The bug this exists for: the previous order's receipt stayed on screen
    // through a reload after a new one had been served and paid.
    rememberLastOrder("T4", "ord-1");
    rememberLastOrder("T4", "ord-2");
    expect(readLastOrder("T4")).toBe("ord-2");
  });

  it("ignores a blank table or order", () => {
    rememberLastOrder("", "ord-1");
    rememberLastOrder("T4", "");
    expect(readLastOrder("T4")).toBeNull();
  });

  it("returns nothing for a table it has never seen", () => {
    expect(readLastOrder("T9")).toBeNull();
  });
});
