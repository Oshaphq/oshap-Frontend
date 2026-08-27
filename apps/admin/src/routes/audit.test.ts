import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { humanise } from "./audit";

/**
 * A manager reading `order.partial_payment` in a column of money.
 *
 * The server emits actions the contract does not list, and the fallback was
 * the raw string. Two of them were on screen at Jobiz, mid-table, colliding
 * with the bill link beside them.
 */
describe("humanise", () => {
  it.each([
    ["order.partial_payment", "Partial payment"],
    ["order.cash_paid", "Cash paid"],
    ["item.void", "Void"],
    ["something_new", "Something new"],
  ])("%o reads as %o", (action, expected) => {
    expect(humanise(action)).toBe(expected);
  });

  it("does not swallow an action it cannot split", () => {
    expect(humanise("weird.")).toBe("weird.");
  });
});

/**
 * jsdom applies no CSS, so which arrangement a phone gets is only visible in
 * the class list.
 */
const src = readFileSync(
  resolve(process.cwd(), "apps/admin/src/routes/audit.tsx"),
  "utf8",
).replace(/\r/g, "");

describe("an audit entry is a card on a phone", () => {
  it("has a phone layout hidden from sm up", () => {
    expect(src).toContain("flex flex-col gap-0.5 sm:hidden");
  });

  it("keeps the wrapping row for widths that can hold it", () => {
    expect(src).toContain("hidden sm:flex flex-wrap items-baseline");
  });

  it("no longer wraps five things into whatever fits", () => {
    // The description was squeezed to two lines, the bill link and the actor
    // landed on top of each other, and the amount fell to a line of its own.
    expect(src).not.toContain(
      'className="flex flex-wrap items-baseline gap-x-md gap-y-xs px-md py-s',
    );
  });

  it("names the known action rather than printing its identifier", () => {
    expect(src).toContain('[AUDIT_ACTIONS.partialPayment]: "Part payment taken"');
  });

  it("every action it filters by is a named constant", () => {
    // A literal here and a literal in the spec is two places to get it wrong.
    expect(src).not.toMatch(/value: "(order|item|payment)\./);
  });

  it("falls back to humanise, never to the raw action", () => {
    expect(src).toContain("ACTION_LABELS[entry.action] ?? humanise(entry.action)");
    expect(src).not.toContain("ACTION_LABELS[entry.action] ?? entry.action");
  });
});
