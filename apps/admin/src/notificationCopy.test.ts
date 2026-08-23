import { describe, it, expect } from "vitest";
import {
  NOTIFICATION_META,
  timeAgo,
  timeBucket,
  TIME_BUCKETS,
} from "./notificationCopy";
import type { NotificationType } from "@oshap/shared";

const ALL_TYPES: NotificationType[] = [
  "waiter_called",
  "pos_requested",
  "new_order",
  "order_ready",
  "payment_claimed",
  "low_stock",
];

describe("every type has copy", () => {
  // A missing entry renders nothing at all, so a waiter call would arrive as a
  // blank row. Cheaper to catch here than at a table.
  it.each(ALL_TYPES)("%s has a title and a body", (type) => {
    const meta = NOTIFICATION_META[type];
    expect(meta.title).toBeTruthy();
    expect(meta.body({})).toBeTruthy();
  });

  it("never prints a uuid when the table name is missing", () => {
    for (const type of ALL_TYPES) {
      const body = NOTIFICATION_META[type].body({ table_name: null });
      expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
      expect(body).not.toContain("null");
      expect(body).not.toContain("undefined");
    }
  });

  it("uses the table name when there is one", () => {
    expect(NOTIFICATION_META.waiter_called.body({ table_name: "T4" })).toContain("T4");
  });
});

describe("only the two calls with nothing to watch can be claimed", () => {
  // The other four resolve themselves when the order or payment moves. Letting
  // a person close one by hand would put this list out of step with the board.
  it.each(["waiter_called", "pos_requested"] as const)("%s is claimable", (t) => {
    expect(NOTIFICATION_META[t].claimable).toBe(true);
  });

  it.each(["new_order", "order_ready", "payment_claimed", "low_stock"] as const)(
    "%s is not",
    (t) => {
      expect(NOTIFICATION_META[t].claimable).toBe(false);
    },
  );
});

describe("payment_claimed shows the amount", () => {
  // It is the whole point of that one — the cashier checks it against the bank
  // app before the guest leaves.
  it("includes the money when it is known", () => {
    const body = NOTIFICATION_META.payment_claimed.body({
      table_name: "T3",
      amount: 1_240_000,
    });
    expect(body).toContain("12,400");
  });

  it("reads cleanly when it is not", () => {
    const body = NOTIFICATION_META.payment_claimed.body({ table_name: "T3" });
    expect(body).toBe("T3 says they have paid");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-08-23T12:00:00Z").getTime();
  const ago = (ms: number) => timeAgo(new Date(now - ms).toISOString(), now);

  it.each([
    [0, "now"],
    [30_000, "now"],
    [120_000, "2m"],
    [45 * 60_000, "45m"],
    [3 * 3_600_000, "3h"],
    [3 * 86_400_000, "3d"],
  ])("%i ms ago reads as %s", (ms, expected) => {
    expect(ago(ms)).toBe(expected);
  });
});

describe("timeBucket groups by the day, not by elapsed hours", () => {
  // 00:30 is "yesterday" to someone who worked the evening shift, even though
  // it is forty minutes ago. Counting backwards in hours would file last
  // night's service in with this morning's.
  const now = new Date("2026-08-23T00:40:00").getTime();

  it("puts 23:50 last night in Yesterday, not Now", () => {
    const then = new Date("2026-08-22T23:50:00").toISOString();
    expect(timeBucket(then, now)).toBe("Yesterday");
  });

  it("still calls the last five minutes Now", () => {
    const then = new Date(now - 60_000).toISOString();
    expect(timeBucket(then, now)).toBe("Now");
  });

  it("files this morning under Earlier today", () => {
    const midMorning = new Date("2026-08-23T11:00:00").getTime();
    const then = new Date("2026-08-23T08:15:00").toISOString();
    expect(timeBucket(then, midMorning)).toBe("Earlier today");
  });

  it("calls anything before yesterday Older", () => {
    const then = new Date("2026-08-20T14:00:00").toISOString();
    expect(timeBucket(then, now)).toBe("Older");
  });

  it("only ever returns a known bucket", () => {
    for (const days of [0, 1, 2, 30]) {
      const then = new Date(now - days * 86_400_000).toISOString();
      expect(TIME_BUCKETS).toContain(timeBucket(then, now));
    }
  });
});
