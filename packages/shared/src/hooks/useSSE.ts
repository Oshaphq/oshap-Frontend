import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createEventSource } from "../api/sse";
import { queryKeys } from "../api/keys";

type CacheKey = readonly unknown[];

// Grouped by what actually changes, rather than per event — most events move
// the same set of caches, and naming the groups keeps the mapping readable.
const ORDER_FLOW: CacheKey[] = [
  queryKeys.admin.kitchen(),
  queryKeys.admin.tables(),
  queryKeys.orders.all,
  queryKeys.tables.all,
];

const PAYMENT_FLOW: CacheKey[] = [
  queryKeys.admin.tables(),
  queryKeys.orders.all,
  queryKeys.tables.all,
];

const SESSION_FLOW: CacheKey[] = [queryKeys.orders.all, queryKeys.tables.all];

const STOCK_FLOW: CacheKey[] = [
  queryKeys.admin.inventoryAlerts(),
  queryKeys.admin.menu(),
  queryKeys.menu.all,
];

/**
 * Backend event vocabulary → the caches each one invalidates.
 *
 * These names come from the API (`docs/openapi.yaml` §SSE) and are lower_snake.
 * We previously listened for `ORDER_CREATED` / `STATUS_CHANGED` / etc, which the
 * backend never emitted — so every event fell through to a blanket invalidation,
 * or arrived and did nothing.
 *
 * The richer vocabulary is worth using precisely: `waiter_called` changes no
 * server state, and `low_stock` touches menu caches that order events don't.
 */
export const EVENT_CACHE_KEYS: Record<string, CacheKey[]> = {
  new_order: ORDER_FLOW,
  order_preparing: ORDER_FLOW,
  order_ready: ORDER_FLOW,

  payment_claimed: PAYMENT_FLOW,
  payment_confirmed: PAYMENT_FLOW,
  payment_verified: PAYMENT_FLOW,
  payment_rejected: PAYMENT_FLOW,
  pos_requested: PAYMENT_FLOW,
  table_closed: PAYMENT_FLOW,

  session_started: SESSION_FLOW,
  session_joined: SESSION_FLOW,

  low_stock: STOCK_FLOW,

  // Delivered to staff as a push and an in-app alert. Nothing on the server
  // changed, so invalidating anything here would just be noise.
  waiter_called: [],
};

/** Fallback for an event the backend added and we don't know about yet. */
export const UNKNOWN_EVENT_KEYS: CacheKey[] = [
  queryKeys.admin.all,
  queryKeys.orders.all,
  queryKeys.tables.all,
];

const RECONNECT_DELAY_MS = 5_000;

export function useGlobalSSE() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: number | null = null;

    function connect() {
      es = createEventSource("/events");

      es.onmessage = (event) => {
        let type: string;
        try {
          type = JSON.parse(event.data)?.type;
        } catch {
          console.error("[SSE] Ignoring unparseable event payload");
          return;
        }

        // `?? UNKNOWN` rather than `|| UNKNOWN`: an event mapped to [] means
        // "recognized, invalidates nothing", which must not fall through.
        const keys = EVENT_CACHE_KEYS[type] ?? UNKNOWN_EVENT_KEYS;

        for (const queryKey of keys) {
          queryClient.invalidateQueries({ queryKey });
        }
      };

      es.onerror = () => {
        es?.close();
        reconnectTimeout = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      es?.close();
    };
  }, [queryClient]);
}
