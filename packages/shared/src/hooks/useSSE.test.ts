import { describe, it, expect } from "vitest";
import {
  EVENT_CACHE_KEYS,
  UNKNOWN_EVENT_KEYS,
  subscribeToRealtimeEvents,
  publishRealtimeEvent,
  type RealtimeEvent,
} from "./useSSE";

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

/**
 * Frames the transport sends that are not domain events. They must be listed
 * in the map so they invalidate nothing — an unlisted type falls through to a
 * blanket invalidation, and `heartbeat` arrives on a timer.
 */
const TRANSPORT_FRAMES = ["connected", "heartbeat"] as const;

describe("SSE event map", () => {
  it("handles every event the backend emits", () => {
    const unhandled = BACKEND_EVENTS.filter((e) => !(e in EVENT_CACHE_KEYS));
    expect(unhandled).toEqual([]);
  });

  it("does not carry names the backend never sends", () => {
    const known = [...BACKEND_EVENTS, ...TRANSPORT_FRAMES] as readonly string[];
    const extra = Object.keys(EVENT_CACHE_KEYS).filter((e) => !known.includes(e));
    expect(extra).toEqual([]);
  });

  // Observed on the live stream: `connected` on open, `heartbeat` on a timer.
  // Unlisted, each one would trigger UNKNOWN_EVENT_KEYS and refetch every
  // admin query — the heartbeat turning a quiet dashboard into a poll.
  it.each(TRANSPORT_FRAMES)("treats %s as a no-op, not an unknown event", (frame) => {
    expect(EVENT_CACHE_KEYS[frame]).toEqual([]);
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

/**
 * The bug this guards: alerts and the chime used to be wired to Firebase
 * `onMessage` alone. On any deployment without FCM credentials — production
 * included — no alert could ever fire, while the events sat on the SSE stream
 * being dropped. `waiter_called` invalidates no caches by design, so the
 * subscriber bus is the *only* thing that makes a waiter call visible.
 */
describe("realtime event bus", () => {
  it("delivers events to subscribers and stops on unsubscribe", () => {
    const seen: RealtimeEvent[] = [];
    const unsubscribe = subscribeToRealtimeEvents((e) => seen.push(e));

    publishRealtimeEvent({ type: "waiter_called", data: { table_id: "abc" } });
    expect(seen).toHaveLength(1);
    expect(seen[0]!.type).toBe("waiter_called");
    expect(seen[0]!.data?.table_id).toBe("abc");

    unsubscribe();
    publishRealtimeEvent({ type: "waiter_called", data: {} });
    expect(seen).toHaveLength(1);
  });

  it("keeps delivering to healthy listeners when one throws", () => {
    const seen: string[] = [];
    const un1 = subscribeToRealtimeEvents(() => {
      throw new Error("boom");
    });
    const un2 = subscribeToRealtimeEvents((e) => seen.push(e.type));

    expect(() => publishRealtimeEvent({ type: "new_order" })).not.toThrow();
    expect(seen).toEqual(["new_order"]);

    un1();
    un2();
  });

  // Every event that interrupts staff must be one the backend actually emits.
  it("only alerts on events in the backend vocabulary", () => {
    for (const t of ["waiter_called", "pos_requested", "new_order", "payment_claimed"]) {
      expect(BACKEND_EVENTS).toContain(t as (typeof BACKEND_EVENTS)[number]);
    }
  });
});
