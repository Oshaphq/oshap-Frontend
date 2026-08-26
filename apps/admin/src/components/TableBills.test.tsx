import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Bill } from "@oshap/shared";
import TableBills from "./TableBills";

/**
 * The bill row is the settlement screen's whole readout and had no test.
 *
 * What it says decides what a waiter carries to the table — the card machine or
 * nothing — so the two lines under a guest's name are the point of the row, not
 * decoration on it.
 */

const bill = (over: Partial<Bill> = {}): Bill => ({
  key: "b1",
  orders: [],
  guestName: "Ada",
  total: 40_000,
  amountPaid: 0,
  balanceDue: 40_000,
  state: "unpaid",
  paymentMethod: null,
  claimedOrderIds: [],
  unpaidOrderIds: ["o1"],
  ...over,
});

const render = (bills: Bill[]) => renderToStaticMarkup(<TableBills bills={bills} />);

describe("TableBills", () => {
  it("names a transfer and a card request, and stays quiet about cash", () => {
    expect(render([bill({ paymentMethod: "MANUAL_TRANSFER" })])).toContain("Transfer");
    expect(render([bill({ paymentMethod: "POS" })])).toContain("Card machine");
    const cash = render([bill({ paymentMethod: "CASH" })]);
    expect(cash).not.toContain("Transfer");
    expect(cash).not.toContain("Card machine");
  });

  it("puts the method on its own line rather than trailing the order count", () => {
    const html = render([
      bill({
        paymentMethod: "MANUAL_TRANSFER",
        orders: [{}, {}] as Bill["orders"],
      }),
    ]);
    // Appended, the two ran together as one long grey string a waiter had to
    // read to the end. Separate elements are the fix, so a joined string is the
    // regression to catch.
    expect(html).toContain("2 orders");
    expect(html).toContain("Transfer");
    // Case-insensitive: the old code appended a lowercase " · transfer",
    // and that is exactly the shape this must keep out.
    expect(html).not.toMatch(/2 orders[^<]*transfer/i);
  });

  it("counts bills, never guests", () => {
    // One person ordering for four is one bill and four people. Tables carry no
    // seat count, so "2 guests" would be a guess where "2 bills" is a fact.
    const html = render([bill(), bill({ key: "b2", guestName: "Tunde" })]);
    expect(html).toContain("2 bills open");
    expect(html).not.toContain("guests");
  });

  it("says nothing about bill count for a single bill", () => {
    expect(render([bill()])).not.toContain("bills open");
  });

  it("shows the balance on a part-paid bill, not the total", () => {
    const html = render([
      bill({ state: "part", amountPaid: 15_000, balanceDue: 25_000 }),
    ]);
    // The number a waiter is about to ask for.
    expect(html).toContain("250");
    expect(html).toContain("Part paid");
  });
});
