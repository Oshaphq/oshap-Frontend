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
