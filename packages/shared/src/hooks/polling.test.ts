import { describe, it, expect } from "vitest";
import { tablePollMs } from "./useTable";
import { orderDetailPollMs, sessionOrdersPollMs } from "./useOrders";

/**
 * A guest has no realtime channel — `GET /events` needs a staff token — so
 * polling is the only way anything on their screen ever changes.
 *
 * These conditions are tested rather than trusted because their failure is
 * silent: returning `false` when it should return a number looks exactly like
 * the feature never having been built. That is what happened — the receipt
 * query was missed while two others were given a poll, and the symptom was a
 * guest reloading the page to see their own receipt.
 */

describe("the table", () => {
  it("polls while a bill is unpaid", () => {
    expect(tablePollMs({ unpaid_order: { id: "o1" }, pending_payments: null })).toBe(10_000);
  });

  it("polls while a payment is waiting to be verified", () => {
    expect(tablePollMs({ unpaid_order: null, pending_payments: { id: "o1" } })).toBe(10_000);
  });

  it("stops once the table is clear", () => {
    expect(tablePollMs({ unpaid_order: null, pending_payments: null })).toBe(false);
  });

  it("polls before the first response, not after it", () => {
    // `undefined` means we have not looked yet. Reading it as "nothing to
    // watch" would stop the poll before it ever started.
    expect(tablePollMs(undefined)).toBe(10_000);
  });
});

describe("one order — what the receipt reads", () => {
  it.each(["CREATED", "PREPARING", "READY", "PAYMENT_PENDING"])(
    "polls while the order is %s",
    (status) => {
      expect(orderDetailPollMs({ status })).toBe(10_000);
    },
  );

  it("stops once it is confirmed, which is when the receipt appears", () => {
    expect(orderDetailPollMs({ status: "CONFIRMED" })).toBe(false);
  });

  it.each(["CANCELLED", "REFUNDED"])("stops on %s", (status) => {
    expect(orderDetailPollMs({ status })).toBe(false);
  });
});

describe("every order on the table", () => {
  it("polls while any one of them is still moving", () => {
    expect(
      sessionOrdersPollMs({
        orders: [{ status: "CONFIRMED" }, { status: "PREPARING" }],
      }),
    ).toBe(10_000);
  });

  it("stops when all of them are settled", () => {
    expect(
      sessionOrdersPollMs({ orders: [{ status: "CONFIRMED" }, { status: "CONFIRMED" }] }),
    ).toBe(false);
  });

  it("stops on an empty table rather than polling an empty list forever", () => {
    expect(sessionOrdersPollMs({ orders: [] })).toBe(false);
  });

  it("polls before the first response", () => {
    expect(sessionOrdersPollMs(undefined)).toBe(10_000);
  });
});
