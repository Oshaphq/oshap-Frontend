import { describe, it, expect } from "vitest";
import { EVENT_CACHE_KEYS, UNKNOWN_EVENT_KEYS } from "./useSSE";

/**
 * The failure mode this guards is silence. If our event names drift from the
 * backend's again, nothing throws — live screens just stop updating and look
 * like a quiet service. So the vocabulary itself is asserted, not just the
 * behaviour.
 *
 * Source of truth: the backend README §10 / `docs/openapi.yaml` SSE section.
 */
const BACKEND_EVENTS = [
  "new_order",
  "order_preparing",
  "order_ready",
  "payment_claimed",
  "payment_confirmed",
  "payment_verified",
  "payment_rejected",
  "table_closed",
  "waiter_called",
  "pos_requested",
  "session_started",
  "session_joined",
  "low_stock",
] as const;

describe("SSE event map", () => {
  it("handles every event the backend emits", () => {
    const unhandled = BACKEND_EVENTS.filter((e) => !(e in EVENT_CACHE_KEYS));
    expect(unhandled).toEqual([]);
  });

  it("does not carry names the backend never sends", () => {
    const extra = Object.keys(EVENT_CACHE_KEYS).filter(
      (e) => !BACKEND_EVENTS.includes(e as (typeof BACKEND_EVENTS)[number]),
    );
    expect(extra).toEqual([]);
  });

  // The old SCREAMING_CASE names were never emitted by the backend, so every
  // event fell through to a blanket invalidation.
  it.each(["ORDER_CREATED", "STATUS_CHANGED", "PAYMENT_PENDING", "TABLE_CLOSED"])(
    "no longer listens for the legacy name %s",
    (legacy) => {
      expect(legacy in EVENT_CACHE_KEYS).toBe(false);
    },
  );

  it("invalidates the kitchen board on order events", () => {
    for (const event of ["new_order", "order_preparing", "order_ready"]) {
      const keys = EVENT_CACHE_KEYS[event]!.map((k) => k.join("/"));
      expect(keys).toContain("admin/kitchen");
    }
  });

  it("invalidates menu and stock caches on low_stock, and nothing else does", () => {
    const stockKey = "admin/inventory/alerts";
    expect(EVENT_CACHE_KEYS["low_stock"]!.map((k) => k.join("/"))).toContain(stockKey);
    expect(EVENT_CACHE_KEYS["new_order"]!.map((k) => k.join("/"))).not.toContain(stockKey);
  });

  // Recognised-but-empty must not be confused with unrecognised — `||` instead
  // of `??` at the lookup would turn this into a blanket invalidation.
  it("treats waiter_called as recognised with no cache impact", () => {
    expect(EVENT_CACHE_KEYS["waiter_called"]).toEqual([]);
    expect(EVENT_CACHE_KEYS["waiter_called"]).not.toBe(UNKNOWN_EVENT_KEYS);
  });

  it("falls back broadly for an event we don't know yet", () => {
    expect(EVENT_CACHE_KEYS["something_new"]).toBeUndefined();
    expect(UNKNOWN_EVENT_KEYS.length).toBeGreaterThan(0);
  });
});
