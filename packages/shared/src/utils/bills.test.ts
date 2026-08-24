import { describe, it, expect } from "vitest";
import { groupBills, paymentState } from "./bills";
import type { AdminTableLiveOrder } from "../types";

const order = (o: Partial<AdminTableLiveOrder> & { order_id: string }): AdminTableLiveOrder => ({
  total: 100_000,
  status: "READY",
  payment_state: "NOT_PAID",
  ...o,
});

describe("two guests on one table owe separately", () => {
  // The bug that started this: the board showed one total and one set of
  // buttons, so verifying Ada's transfer settled a bill and left the table lit
  // for Bola's — which read as a broken button rather than the right answer.
  const rows = [
    order({ order_id: "a", device_token: "phone-1", customer_name: "Ada", total: 350_000 }),
    order({ order_id: "b", device_token: "phone-2", customer_name: "Bola", total: 500_000 }),
  ];

  it("splits them into two bills", () => {
    expect(groupBills(rows)).toHaveLength(2);
  });

  it("keeps each guest's money to themselves", () => {
    const bills = groupBills(rows);
    expect(bills.map((b) => b.total).sort()).toEqual([350_000, 500_000]);
    expect(bills.map((b) => b.guestName).sort()).toEqual(["Ada", "Bola"]);
  });
});

describe("a party ordering together is one bill", () => {
  it("groups a shared session, whatever phone it came from", () => {
    const bills = groupBills([
      order({ order_id: "a", session_id: "s1", device_token: "phone-1", customer_name: "Ada" }),
      order({ order_id: "b", session_id: "s1", device_token: "phone-2", customer_name: "Bola" }),
    ]);
    expect(bills).toHaveLength(1);
    expect(bills[0]!.total).toBe(200_000);
  });

  it("groups a second round from the same phone", () => {
    const bills = groupBills([
      order({ order_id: "a", device_token: "phone-1" }),
      order({ order_id: "b", device_token: "phone-1" }),
    ]);
    expect(bills).toHaveLength(1);
    expect(bills[0]!.orders).toHaveLength(2);
  });

  it("honours a deliberate bundle across two sessions", () => {
    // `combined_order_ids` is stronger than a session — someone said "put
    // theirs on mine", and that decision outranks who ordered with whom.
    const bills = groupBills([
      order({ order_id: "a", session_id: "s1", combined_order_ids: ["b"] }),
      order({ order_id: "b", session_id: "s2" }),
    ]);
    expect(bills).toHaveLength(1);
  });

  it("links a phone that later joined the party", () => {
    // Ordered alone first, then joined a session. The two must not become two
    // bills for the same person.
    const bills = groupBills([
      order({ order_id: "a", device_token: "phone-1", session_id: "s1" }),
      order({ order_id: "b", device_token: "phone-1", session_id: "s1" }),
      order({ order_id: "c", device_token: "phone-2", session_id: "s1" }),
    ]);
    expect(bills).toHaveLength(1);
    expect(bills[0]!.orders).toHaveLength(3);
  });

  it("never puts one order in two bills", () => {
    const rows = [
      order({ order_id: "a", session_id: "s1", device_token: "p1", combined_order_ids: ["b"] }),
      order({ order_id: "b", session_id: "s2", device_token: "p2" }),
      order({ order_id: "c", session_id: "s2", device_token: "p1" }),
    ];
    const seen = groupBills(rows).flatMap((b) => b.orders.map((o) => o.order_id));
    expect(seen.sort()).toEqual(["a", "b", "c"]);
  });
});

describe("which action a bill offers", () => {
  it("puts a claim ahead of an unpaid round — somebody may be leaving", () => {
    const bills = groupBills([
      order({ order_id: "a", device_token: "p1", payment_state: "CLAIMED" }),
      order({ order_id: "b", device_token: "p1", payment_state: "NOT_PAID" }),
    ]);
    expect(bills[0]!.state).toBe("claimed");
    expect(bills[0]!.claimedOrderIds).toEqual(["a"]);
    expect(bills[0]!.unpaidOrderIds).toEqual(["b"]);
  });

  it.each([
    ["CONFIRMED", "settled"],
    ["VERIFIED", "settled"],
    ["REFUNDED", "settled"],
    ["CLAIMED", "claimed"],
    ["NOT_PAID", "unpaid"],
    ["FAILED", "unpaid"],
  ])("%s reads as %s", (raw, expected) => {
    expect(paymentState(raw)).toBe(expected);
  });

  it("treats a state it does not recognise as unknown, not as unpaid", () => {
    // `payment_state` is an untyped string on the API. Guessing "unpaid" would
    // offer Take Cash on a settled bill, and a waiter would charge a guest
    // twice. Offering nothing is the recoverable error.
    expect(paymentState("SOMETHING_NEW")).toBe("unknown");
    expect(paymentState(undefined)).toBe("unknown");
  });

  it("never presents an unreadable state as settled", () => {
    const bills = groupBills([
      order({ order_id: "a", device_token: "p1", payment_state: "VERIFIED" }),
      order({ order_id: "b", device_token: "p1", payment_state: "WHO_KNOWS" }),
    ]);
    expect(bills[0]!.state).toBe("unknown");
  });
});

describe("edges", () => {
  it.each([[undefined], [null], [[]]])("%o gives no bills", (rows) => {
    expect(groupBills(rows as AdminTableLiveOrder[] | null | undefined)).toEqual([]);
  });

  it("keeps an order with no session and no device on its own", () => {
    const bills = groupBills([order({ order_id: "a" }), order({ order_id: "b" })]);
    expect(bills).toHaveLength(2);
  });

  it("survives a bundle naming an order that is no longer live", () => {
    // Settled orders drop off the live list; the bundle still names them.
    const bills = groupBills([
      order({ order_id: "a", device_token: "p1", combined_order_ids: ["gone"] }),
    ]);
    expect(bills).toHaveLength(1);
    expect(bills[0]!.orders.map((o) => o.order_id)).toEqual(["a"]);
  });

  it("keeps its key when the party adds a round", () => {
    // A moving key would remount the row and shut any prompt open on it.
    const first = groupBills([order({ order_id: "a", device_token: "p1" })]);
    const later = groupBills([
      order({ order_id: "a", device_token: "p1" }),
      order({ order_id: "b", device_token: "p1" }),
    ]);
    expect(later[0]!.key).toBe(first[0]!.key);
  });
});

describe("a bill that has been part paid", () => {
  // ₦40,000 against ₦41,086.50 at Jobiz. This used to settle the whole bill and
  // lose the difference; then we refused the money outright. Now it records,
  // and the board has to show what is still owed.
  const partPaid = () =>
    groupBills([
      order({
        order_id: "a",
        device_token: "p1",
        total: 4_108_650,
        amount_paid: 4_000_000,
        balance_due: 108_650,
      }),
    ])[0]!;

  it("is neither unpaid nor settled", () => {
    expect(partPaid().state).toBe("part");
  });

  it("carries what is left, not what it started at", () => {
    expect(partPaid().balanceDue).toBe(108_650);
    expect(partPaid().total).toBe(4_108_650);
    expect(partPaid().amountPaid).toBe(4_000_000);
  });

  it("trusts the server's balance over its own arithmetic", () => {
    // A refund or an adjustment can make total-minus-paid disagree, and the
    // server's number is the one that counts.
    const bill = groupBills([
      order({ order_id: "a", device_token: "p1", total: 1000, amount_paid: 100, balance_due: 750 }),
    ])[0]!;
    expect(bill.balanceDue).toBe(750);
  });

  it("falls back to the whole total when no balance is sent", () => {
    // Safer direction: money shown as owed when it is not gets corrected at the
    // table; a bill shown as square when it is not is simply lost.
    const bill = groupBills([order({ order_id: "a", device_token: "p1", total: 5000 })])[0]!;
    expect(bill.balanceDue).toBe(5000);
    expect(bill.state).toBe("unpaid");
  });

  it("sums a balance across a party's orders", () => {
    const bill = groupBills([
      order({ order_id: "a", session_id: "s1", total: 1000, amount_paid: 1000, balance_due: 0 }),
      order({ order_id: "b", session_id: "s1", total: 2000, amount_paid: 500, balance_due: 1500 }),
    ])[0]!;
    expect(bill.balanceDue).toBe(1500);
    expect(bill.state).toBe("part");
  });
});

describe("how the bill is being paid", () => {
  it("carries the method, so a card request and a transfer stop looking alike", () => {
    const bill = groupBills([
      order({ order_id: "a", device_token: "p1", payment_state: "CLAIMED", payment_method: "POS" }),
    ])[0]!;
    expect(bill.paymentMethod).toBe("POS");
  });

  it("is null until somebody has said", () => {
    expect(groupBills([order({ order_id: "a", device_token: "p1" })])[0]!.paymentMethod).toBeNull();
  });
});

describe("money owing outranks the payment state", () => {
  // Seen at Jobiz: a part payment left `payment_state` reading CONFIRMED while
  // a balance remained. The bill rendered as Paid with no action, so the only
  // button left was Clear Table — and that wrote two part-paid orders off as
  // abandoned with the money already taken.
  const partPaidButMarkedPaid = () =>
    groupBills([
      order({
        order_id: "a",
        device_token: "p1",
        payment_state: "CONFIRMED",
        total: 4_108_650,
        amount_paid: 4_000_000,
        balance_due: 108_650,
      }),
    ])[0]!;

  it("does not read as settled", () => {
    expect(partPaidButMarkedPaid().state).toBe("part");
  });

  it("still offers a way to take the rest", () => {
    expect(partPaidButMarkedPaid().balanceDue).toBe(108_650);
  });

  it("settles once the balance reaches zero", () => {
    const bill = groupBills([
      order({
        order_id: "a",
        device_token: "p1",
        payment_state: "CONFIRMED",
        total: 1000,
        amount_paid: 1000,
        balance_due: 0,
      }),
    ])[0]!;
    expect(bill.state).toBe("settled");
  });

  it("leaves a claim alone — that needs verifying, not collecting", () => {
    const bill = groupBills([
      order({
        order_id: "a",
        device_token: "p1",
        payment_state: "CLAIMED",
        total: 1000,
        balance_due: 1000,
      }),
    ])[0]!;
    expect(bill.state).toBe("claimed");
  });

  it("will not infer a balance the server never sent", () => {
    // Turning an unreadable payment state into a confident "unpaid" would offer
    // Take Payment on a settled bill, and charging a guest twice is the one
    // error here that cannot be undone at the table.
    const bill = groupBills([
      order({ order_id: "a", device_token: "p1", payment_state: "WHO_KNOWS", total: 1000 }),
    ])[0]!;
    expect(bill.state).toBe("unknown");
  });
});

describe("a cancelled order is not an open bill", () => {
  // At Jobiz the same two orders showed as open bills on the board and as
  // CANCELLED in history at once, so the table sat lit with rows nobody could
  // act on.
  it.each(["CANCELLED", "REFUNDED"])("drops a %s order", (status) => {
    expect(
      groupBills([order({ order_id: "a", device_token: "p1", status })]),
    ).toEqual([]);
  });

  it("keeps the rest of the table", () => {
    const bills = groupBills([
      order({ order_id: "a", device_token: "p1", status: "CANCELLED" }),
      order({ order_id: "b", device_token: "p2", status: "READY" }),
    ]);
    expect(bills).toHaveLength(1);
    expect(bills[0]!.orders[0]!.order_id).toBe("b");
  });
});

describe("a bill that owes money can always be acted on", () => {
  /**
   * The invariant, rather than another example.
   *
   * This broke twice in a row the same way: the bill's *state* learned to read
   * `balance_due`, but the list of orders the cash dialog settles still came
   * from `payment_state`. A part payment leaves that reading CONFIRMED, so
   * "Take the rest" opened on an empty selection and announced that the table
   * had no unpaid bill.
   *
   * Any bill showing money owed must name at least one order to take it
   * against, whichever field the server chose to be inconsistent about.
   */
  const cases: Array<[string, Partial<AdminTableLiveOrder>]> = [
    ["part paid, state says confirmed", {
      payment_state: "CONFIRMED", total: 4_108_650, amount_paid: 4_000_000, balance_due: 108_650,
    }],
    ["part paid, state says not paid", {
      payment_state: "NOT_PAID", total: 1000, amount_paid: 400, balance_due: 600,
    }],
    ["part paid, state unreadable", {
      payment_state: "SOMETHING_NEW", total: 1000, amount_paid: 400, balance_due: 600,
    }],
    ["nothing paid, balance reported", {
      payment_state: "NOT_PAID", total: 1000, amount_paid: 0, balance_due: 1000,
    }],
    ["nothing paid, no balance reported", { payment_state: "NOT_PAID", total: 1000 }],
  ];

  it.each(cases)("%s", (_name, over) => {
    const bill = groupBills([order({ order_id: "a", device_token: "p1", ...over })])[0]!;
    if (bill.state === "part" || bill.state === "unpaid") {
      expect(bill.balanceDue).toBeGreaterThan(0);
      expect(bill.unpaidOrderIds).not.toHaveLength(0);
    }
  });

  it("takes the rest against only the orders that still owe", () => {
    // A party where one order is settled and the other is half paid: the
    // dialog must not re-charge the settled one.
    const bill = groupBills([
      order({ order_id: "done", session_id: "s1", total: 1000, amount_paid: 1000, balance_due: 0 }),
      order({ order_id: "owing", session_id: "s1", total: 2000, amount_paid: 500, balance_due: 1500 }),
    ])[0]!;

    expect(bill.state).toBe("part");
    expect(bill.unpaidOrderIds).toEqual(["owing"]);
    expect(bill.balanceDue).toBe(1500);
  });

  it("a settled bill names nothing to settle", () => {
    const bill = groupBills([
      order({ order_id: "a", device_token: "p1", payment_state: "VERIFIED", total: 1000, amount_paid: 1000, balance_due: 0 }),
    ])[0]!;
    expect(bill.unpaidOrderIds).toEqual([]);
  });
});
