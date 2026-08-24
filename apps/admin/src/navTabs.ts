import type { Role } from "@oshap/shared";

/**
 * Which tabs a role sees in the top nav.
 *
 * Lifted out of `AuthGate` so the whole permission matrix can be asserted
 * rather than read. It is a matrix, and a matrix buried in six `if` statements
 * inside a component is one nobody checks — the kind of thing where adding a
 * role to one list and forgetting the other leaves a tab that 403s, or a route
 * reachable only by typing the URL.
 *
 * The nav and the route gates in `App.tsx` have to agree. They are separate
 * lists by necessity — one guards, one displays — so the tests here name the
 * pairing explicitly.
 */
export interface NavTab {
  to: string;
  label: string;
  end?: boolean;
  count?: number;
}

export interface NavContext {
  /** How many venues this account can see. */
  branchCount: number;
  /** Tickets not yet started or still cooking. */
  waitingTickets: number;
}

export function tabsForRole(role: Role, ctx: NavContext): NavTab[] {
  const tabs: NavTab[] = [];

  /**
   * Kitchen and bar have no Tables tab: they work the pass, not the floor.
   * `IndexRoute` sends them to the board rather than letting them land on a
   * screen full of bills they cannot act on.
   */
  if (["OWNER", "MANAGER", "WAITER", "CASHIER"].includes(role)) {
    tabs.push({ to: "/", label: "Tables", end: true });
  }

  if (["OWNER", "MANAGER"].includes(role)) {
    tabs.push({ to: "/menu", label: "Menu" });
    tabs.push({ to: "/inventory", label: "Inventory" });
  }

  /**
   * The count is the point: a manager on Settings has no way of knowing three
   * tickets are waiting, and this is the one screen where being a tab away
   * costs a guest their food going cold.
   *
   * Waiters carry the plates, so the count means most to them — "is table 6's
   * food up yet" is a question they answer all night — and Served is tapped
   * from this board.
   */
  if (["OWNER", "MANAGER", "WAITER", "KITCHEN", "BARTENDER"].includes(role)) {
    tabs.push({ to: "/kitchen", label: "Orders", count: ctx.waitingTickets });
  }

  if (["OWNER", "MANAGER", "CASHIER"].includes(role)) {
    tabs.push({ to: "/z-report", label: "Close" });
  }

  if (["OWNER", "MANAGER"].includes(role)) {
    tabs.push({ to: "/history", label: "History" });
    tabs.push({ to: "/settings", label: "Settings" });
  }

  if (role === "OWNER") {
    tabs.push({ to: "/analytics", label: "Analytics" });
    // Comparing venues only means anything above one.
    if (ctx.branchCount > 1) {
      tabs.push({ to: "/analytics/group", label: "Group Analytics" });
    }
  }

  return tabs;
}
