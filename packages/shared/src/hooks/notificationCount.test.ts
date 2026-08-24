import { describe, it, expect } from "vitest";
import { countMatching } from "./useNotifications";
import type { Notification } from "../types";

const row = (over: Partial<Notification> = {}): Notification => ({
  id: Math.random().toString(36).slice(2),
  type: "waiter_called",
  is_unread: true,
  is_unresolved: true,
  ...over,
});

/**
 * The badge sat at 9+ and never moved. Two causes were indistinguishable from
 * the client — `total` counted before the filter was applied, or notifications
 * that should resolve themselves never did. Counting the rows we can see, on a
 * field we can read, is right under both.
 */
describe("counting unresolved", () => {
  it("counts rows with no resolution time", () => {
    expect(countMatching([row(), row(), row()], "unresolved")).toBe(3);
  });

  it("stops counting one that has been claimed", () => {
    expect(
      countMatching([row(), row({ resolved_at: "2026-08-24T10:00:00Z" })], "unresolved"),
    ).toBe(1);
  });

  it("believes the timestamp over the flag", () => {
    // `is_unresolved` defaults to true, so a stale flag on a resolved row would
    // keep the badge lit forever. A resolution time is a fact.
    const stale = row({ resolved_at: "2026-08-24T10:00:00Z", is_unresolved: true });
    expect(countMatching([stale], "unresolved")).toBe(0);
  });

  it("ignores work routed to somebody else's role", () => {
    // Being badged for something you cannot do is how people learn to ignore a
    // bell.
    expect(countMatching([row({ for_my_role: false }), row()], "unresolved")).toBe(1);
  });
});

describe("counting unread", () => {
  it("counts rows nobody has read", () => {
    expect(countMatching([row(), row()], "unread")).toBe(2);
  });

  it("stops counting one that has been read", () => {
    expect(
      countMatching(
        [row(), row({ is_unread: false, read_at: "2026-08-24T10:00:00Z" })],
        "unread",
      ),
    ).toBe(1);
  });

  it("is separate from resolved — reading is not doing", () => {
    // Two waiters can both read a call; only one needs to walk over.
    const readButOpen = row({ is_unread: false, read_at: "2026-08-24T10:00:00Z" });
    expect(countMatching([readButOpen], "unread")).toBe(0);
    expect(countMatching([readButOpen], "unresolved")).toBe(1);
  });
});

describe("edges", () => {
  it("counts nothing in an empty list", () => {
    expect(countMatching([], "unresolved")).toBe(0);
  });
});
