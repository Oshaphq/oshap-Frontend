import type { AdminTableLiveOrder } from "../types";

/**
 * Turns a table's open orders into the bills a waiter actually settles.
 *
 * A table is not a bill. Two friends who order separately owe separately, and
 * one of them paying should close their bill and leave the other's alone. The
 * board could not express that before `live_orders` arrived, so it showed one
 * total and one set of buttons — and verifying a transfer closed the table
 * while somebody was still eating, or refused and reported "already settled".
 *
 * Three signals say who belongs with whom, and they are already on every order:
 *
 * - `combined_order_ids` — deliberately bundled to pay as one. The strongest.
 * - `session_id` — a party ordering together on a shared PIN.
 * - `device_token` — one phone. The fallback, because a session is optional
 *   and a guest can order without ever starting one.
 *
 * They are unioned rather than checked in order, because they overlap: a
 * combined pair can span two sessions, and a guest can order twice from one
 * phone before joining a session. Union-find gets all three right at once and
 * cannot produce two bills that share an order.
 */

/**
 * What can be done about a bill's money.
 *
 * `unknown` is deliberate. `payment_state` is typed as a bare string by the
 * API, so a value we do not recognise is a real possibility — and the safe
 * reading of "I do not know whether this is paid" is to offer no money button
 * at all. Guessing "unpaid" would invite a waiter to take cash for a bill
 * already settled, which is the one error here that costs a guest money.
 */
export type BillState = "claimed" | "unpaid" | "settled" | "unknown";

export interface Bill {
  /** Stable across refetches, so React keeps the row and its open prompts. */
  key: string;
  orders: AdminTableLiveOrder[];
  /** The name a guest gave, if any of their orders carried one. */
  guestName: string | null;
  total: number;
  state: BillState;
  /** Orders whose money is claimed but unverified — what Verify acts on. */
  claimedOrderIds: string[];
  /** Orders still owed — what Take Cash acts on. */
  unpaidOrderIds: string[];
}

/** Money is in. `REFUNDED` counts: it went back, so nothing is owed. */
const SETTLED = new Set(["CONFIRMED", "VERIFIED", "REFUNDED"]);
/** Guest says they have paid; nobody has checked. */
const CLAIMED = new Set(["CLAIMED"]);
/** Owed. `FAILED` belongs here — they tried, it did not work, it is still due. */
const UNPAID = new Set(["NOT_PAID", "FAILED", "PENDING"]);

export function paymentState(raw: string | null | undefined): BillState {
  const value = (raw ?? "").toUpperCase();
  if (SETTLED.has(value)) return "settled";
  if (CLAIMED.has(value)) return "claimed";
  if (UNPAID.has(value)) return "unpaid";
  return "unknown";
}

/** Disjoint-set over order ids. */
function makeUnion() {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const seen = parent.get(x);
    if (seen === undefined || seen === x) {
      parent.set(x, x);
      return x;
    }
    const root = find(seen);
    parent.set(x, root);
    return root;
  };
  return {
    find,
    union(a: string, b: string) {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    },
  };
}

export function groupBills(orders: AdminTableLiveOrder[] | null | undefined): Bill[] {
  const rows = orders ?? [];
  if (rows.length === 0) return [];

  const u = makeUnion();
  // Namespaced so a session id can never collide with a device token.
  const bySession = new Map<string, string>();
  const byDevice = new Map<string, string>();

  for (const o of rows) {
    u.find(o.order_id);

    if (o.session_id) {
      const first = bySession.get(o.session_id);
      if (first) u.union(o.order_id, first);
      else bySession.set(o.session_id, o.order_id);
    } else if (o.device_token) {
      // Only when there is no session. A device that later joins a party is
      // still linked, through the session branch above.
      const first = byDevice.get(o.device_token);
      if (first) u.union(o.order_id, first);
      else byDevice.set(o.device_token, o.order_id);
    }

    for (const other of o.combined_order_ids ?? []) {
      // The bundle may name an order that has already been settled and is no
      // longer live. Uniting with it is harmless — it forms its own root and
      // drops out below, because only live orders are collected.
      u.union(o.order_id, other);
    }
  }

  const groups = new Map<string, AdminTableLiveOrder[]>();
  for (const o of rows) {
    const root = u.find(o.order_id);
    const list = groups.get(root);
    if (list) list.push(o);
    else groups.set(root, [o]);
  }

  return [...groups.values()].map(toBill);
}

function toBill(orders: AdminTableLiveOrder[]): Bill {
  const states = orders.map((o) => paymentState(o.payment_state));

  return {
    // The earliest order id in the bill, so the key does not move when a guest
    // adds a round and the group grows.
    key: [...orders.map((o) => o.order_id)].sort()[0]!,
    orders,
    guestName: orders.find((o) => o.customer_name)?.customer_name ?? null,
    total: orders.reduce((sum, o) => sum + (o.total ?? 0), 0),
    state: billState(states),
    claimedOrderIds: orders
      .filter((o) => paymentState(o.payment_state) === "claimed")
      .map((o) => o.order_id),
    unpaidOrderIds: orders
      .filter((o) => paymentState(o.payment_state) === "unpaid")
      .map((o) => o.order_id),
  };
}

/**
 * The one state a waiter should act on, in order of what needs doing.
 *
 * A claim is checked before an unpaid round, because someone may be standing
 * there waiting to leave. `unknown` outranks `settled` so a state we cannot
 * read is never quietly presented as paid.
 */
function billState(states: BillState[]): BillState {
  if (states.includes("claimed")) return "claimed";
  if (states.includes("unpaid")) return "unpaid";
  if (states.includes("unknown")) return "unknown";
  return "settled";
}
