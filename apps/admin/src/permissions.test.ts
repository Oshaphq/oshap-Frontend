import { describe, it, expect } from "vitest";
import {
  canAdvanceKitchenTickets,
  canMarkServed,
  tabsForRole,
} from "./permissions";
import type { Role } from "@oshap/shared";

const ctx = { branchCount: 1, waitingTickets: 3 };
const pathsFor = (role: Role, over: Partial<typeof ctx> = {}) =>
  tabsForRole(role, { ...ctx, ...over }).map((t) => t.to);

/**
 * The permission matrix, asserted rather than read.
 *
 * Buried in six `if` statements inside a component, this is the kind of thing
 * where adding a role to one list and forgetting the other leaves a tab that
 * 403s, or a route reachable only by typing the URL.
 */
describe("who sees Tables", () => {
  it.each<Role>(["OWNER", "MANAGER", "WAITER", "CASHIER"])("%s does", (role) => {
    expect(pathsFor(role)).toContain("/");
  });

  it.each<Role>(["KITCHEN", "BARTENDER"])("%s does not", (role) => {
    // They work the pass, not the floor. `IndexRoute` sends them to the board
    // rather than a screen full of bills they cannot act on.
    expect(pathsFor(role)).not.toContain("/");
  });
});

describe("who sees Orders", () => {
  it.each<Role>(["OWNER", "MANAGER", "WAITER", "KITCHEN", "BARTENDER"])(
    "%s does",
    (role) => {
      expect(pathsFor(role)).toContain("/kitchen");
    },
  );

  it("a waiter does — they carry the plates", () => {
    // The change this test was written for: "is table 6's food up yet" is a
    // question a waiter answers all night, and Served is tapped from here.
    expect(pathsFor("WAITER")).toContain("/kitchen");
  });

  it("a cashier does not", () => {
    expect(pathsFor("CASHIER")).not.toContain("/kitchen");
  });

  it("carries the waiting count, whoever is looking", () => {
    const tab = tabsForRole("WAITER", ctx).find((t) => t.to === "/kitchen");
    expect(tab?.count).toBe(3);
  });
});

describe("who closes the till", () => {
  it.each<Role>(["OWNER", "MANAGER", "CASHIER"])("%s sees Daily close", (role) => {
    expect(pathsFor(role)).toContain("/z-report");
  });

  it.each<Role>(["WAITER", "KITCHEN", "BARTENDER"])("%s does not", (role) => {
    expect(pathsFor(role)).not.toContain("/z-report");
  });
});

describe("who manages the menu and stock", () => {
  it.each<Role>(["OWNER", "MANAGER"])("%s does", (role) => {
    expect(pathsFor(role)).toEqual(expect.arrayContaining(["/menu", "/inventory"]));
  });

  it.each<Role>(["WAITER", "CASHIER", "KITCHEN", "BARTENDER"])("%s does not", (role) => {
    const paths = pathsFor(role);
    expect(paths).not.toContain("/menu");
    expect(paths).not.toContain("/inventory");
  });
});

describe("owner-only ground", () => {
  it("only the owner sees Analytics", () => {
    expect(pathsFor("OWNER")).toContain("/analytics");
    for (const role of ["MANAGER", "WAITER", "CASHIER", "KITCHEN", "BARTENDER"] as Role[]) {
      expect(pathsFor(role)).not.toContain("/analytics");
    }
  });

  it("group analytics appears only above one venue", () => {
    // Comparing venues means nothing when there is one.
    expect(pathsFor("OWNER", { branchCount: 1 })).not.toContain("/analytics/group");
    expect(pathsFor("OWNER", { branchCount: 3 })).toContain("/analytics/group");
  });
});

describe("nobody is stranded", () => {
  it.each<Role>(["OWNER", "MANAGER", "WAITER", "CASHIER", "KITCHEN", "BARTENDER"])(
    "%s has somewhere to go",
    (role) => {
      // A role with no tabs would sign in to an empty nav bar.
      expect(pathsFor(role).length).toBeGreaterThan(0);
    },
  );
});

describe("who moves a ticket through the kitchen", () => {
  it.each<Role>(["OWNER", "MANAGER", "KITCHEN", "BARTENDER"])("%s can", (role) => {
    expect(canAdvanceKitchenTickets(role)).toBe(true);
  });

  it("a waiter cannot", () => {
    // They read the board and run the food. Tapping Ready on a dish still on
    // the pass tells the floor it is up when it is not, and the person who
    // finds out is the guest.
    expect(canAdvanceKitchenTickets("WAITER")).toBe(false);
  });

  it("a cashier cannot — they never see the board", () => {
    expect(canAdvanceKitchenTickets("CASHIER")).toBe(false);
  });
});

describe("who marks food served", () => {
  it("a waiter can — they are standing at the table", () => {
    // The distinction that matters: seeing the board, and driving it, are
    // different rights. A waiter has the first and half of the second.
    expect(canMarkServed("WAITER")).toBe(true);
    expect(canAdvanceKitchenTickets("WAITER")).toBe(false);
  });

  it.each<Role>(["OWNER", "MANAGER", "KITCHEN", "BARTENDER"])("%s can too", (role) => {
    expect(canMarkServed(role)).toBe(true);
  });

  it("everyone who sees the board can mark served", () => {
    // Otherwise a role gets a column it cannot act on, which is worse than not
    // seeing it at all.
    const onTheBoard: Role[] = ["OWNER", "MANAGER", "WAITER", "KITCHEN", "BARTENDER"];
    for (const role of onTheBoard) {
      expect(tabsForRole(role, ctx).map((t) => t.to)).toContain("/kitchen");
      expect(canMarkServed(role)).toBe(true);
    }
  });
});
