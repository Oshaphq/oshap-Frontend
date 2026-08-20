import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createPublicEventSource } from "../api/sse";
import { queryKeys } from "../api/keys";
import type { RealtimeEvent } from "./useSSE";

/**
 * Events a guest is allowed to hear about, and the reason each one matters to
 * them. Anything not listed is staff business and is ignored rather than
 * blanket-invalidated — the opposite of the admin stream, which refetches on an
 * unknown type so a new backend event is never missed.
 *
 * The asymmetry is deliberate. On the admin board a missed event means a stale
 * ticket; here an unrecognised event means the backend started sending guests
 * something nobody designed the customer app to react to, and refetching on it
 * would be guessing.
 */
const GUEST_EVENTS = new Set([
  // The one that matters most: staff verified the transfer, so the pay screen
  // owes the guest a receipt instead of "awaiting verification".
  "payment_verified",
  "payment_confirmed",
  // Verification can also go the other way, and a guest who is told nothing
  // will keep waiting at a table for a receipt that is not coming.
  "payment_rejected",
  "order_preparing",
  "order_ready",
  "table_closed",
  "session_started",
  "session_joined",
]);

/** What a guest-visible event can change: their table, and their orders. */
const GUEST_CACHE_KEYS = [queryKeys.tables.all, queryKeys.orders.all];

const RECONNECT_DELAY_MS = 5_000;

export interface UseTableEventsOptions {
  tableId?: string;
  deviceToken?: string;
  sessionId?: string;
  /** Off by default — a caller opts in on the screens that need it. */
  enabled?: boolean;
}

/**
 * Subscribe a guest's device to their own table's changes.
 *
 * Without this the customer app has no live channel at all: a guest who taps
 * "I have paid" sits on "awaiting verification" until they reload, because
 * nothing tells the page that staff verified the transfer thirty seconds ago.
 *
 * This is the fast path, not the only one. Callers that care about a specific
 * transition should also poll — see `useTable`'s `pollMs`. A guest's phone
 * sleeps, backgrounds, and moves between cell and wifi far more than a till
 * does, and a stream that dies silently must degrade to slow rather than to
 * never.
 */
export function useTableEvents({
  tableId,
  deviceToken,
  sessionId,
  enabled = true,
}: UseTableEventsOptions): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !tableId) return;

    let es: EventSource | null = null;
    let reconnectTimeout: number | null = null;
    let closed = false;

    function connect() {
      if (closed || !tableId) return;

      try {
        es = createPublicEventSource(
          `/events/table/${encodeURIComponent(tableId)}`,
          { device_token: deviceToken, session_id: sessionId },
        );
      } catch {
        // Construction threw rather than the connection failing: no base URL,
        // or the `mock://` origin the mock client hands out. Neither fixes
        // itself, so there is nothing to retry — give up quietly and let the
        // caller's poll carry the screen. Retrying here would spin every 5s
        // for the length of a meal.
        es = null;
        return;
      }

      es.onmessage = (event) => {
        let parsed: RealtimeEvent;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }

        if (!GUEST_EVENTS.has(parsed?.type)) return;

        for (const queryKey of GUEST_CACHE_KEYS) {
          queryClient.invalidateQueries({ queryKey });
        }
      };

      es.onerror = () => {
        es?.close();
        if (closed) return;
        reconnectTimeout = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };
    }

    // A guest reads the pay screen, locks the phone, and comes back to it.
    // That return is exactly when a dead stream matters and when it is cheapest
    // to notice.
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (es?.readyState === EventSource.CLOSED) {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        connect();
      }
    }

    connect();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      closed = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      es?.close();
    };
  }, [queryClient, tableId, deviceToken, sessionId, enabled]);
}
