import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createEventSource } from "../api/sse";
import { getAccessToken } from "../api/client";
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

  // Transport frames, not domain events. They carry no state and must not
  // refetch anything — but they have to be *listed*, because an unrecognised
  // type falls through to a blanket invalidation. `heartbeat` arrives on a
  // timer, so leaving it unknown would refetch every admin query, forever,
  // for the lifetime of the connection.
  connected: [],
  heartbeat: [],
};

/** Fallback for an event the backend added and we don't know about yet. */
export const UNKNOWN_EVENT_KEYS: CacheKey[] = [
  queryKeys.admin.all,
  queryKeys.orders.all,
  queryKeys.tables.all,
];

/** A realtime event as it arrives on the wire. `data` varies by `type`. */
export interface RealtimeEvent {
  type: string;
  data?: Record<string, unknown>;
}

type EventListener = (event: RealtimeEvent) => void;

const listeners = new Set<EventListener>();

/**
 * Subscribe to the realtime stream that `useGlobalSSE` already maintains.
 *
 * Deliberately a bus rather than a second EventSource: browsers cap concurrent
 * connections per origin, and every extra stream is another Redis subscriber on
 * the server. Cache invalidation and user-facing alerts are two readers of one
 * connection.
 */
export function subscribeToRealtimeEvents(listener: EventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Fan an event out to every subscriber. One bad listener must not kill the stream. */
export function publishRealtimeEvent(event: RealtimeEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (err) {
      console.error("[SSE] listener threw", err);
    }
  }
}

const RECONNECT_DELAY_MS = 5_000;

/**
 * How long a dead stream may go unnoticed.
 *
 * SSE is the fast path, not the only one. A stream can be down for reasons the
 * page cannot see — a proxy that buffers `text/event-stream`, a phone that
 * slept, an access token that expired mid-connection — and the failure is
 * silent by construction: no error, just a board that quietly stops changing
 * while staff believe they are looking at live orders.
 *
 * So every realtime query also polls slowly. Realtime makes it instant; the
 * poll makes "instant" degrade to "within half a minute" instead of "never".
 */
export const REALTIME_POLL_MS = 20_000;

export function useGlobalSSE() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: number | null = null;
    let closed = false;
    // The token the current stream was opened with. Access tokens expire
    // (~15 minutes), and a reconnect that reuses the expired one 401s forever
    // — retrying every 5s against a credential that can never work again.
    let connectedWith: string | null = null;

    function connect() {
      if (closed) return;
      connectedWith = getAccessToken();
      es = createEventSource("/events");

      es.onmessage = (event) => {
        let parsed: RealtimeEvent;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          console.error("[SSE] Ignoring unparseable event payload");
          return;
        }
        const type = parsed?.type;

        // `?? UNKNOWN` rather than `|| UNKNOWN`: an event mapped to [] means
        // "recognized, invalidates nothing", which must not fall through.
        const keys = EVENT_CACHE_KEYS[type] ?? UNKNOWN_EVENT_KEYS;

        for (const queryKey of keys) {
          queryClient.invalidateQueries({ queryKey });
        }

        // Fan out after invalidating, so a listener that reads the cache sees
        // refetched data rather than the stale copy it just replaced.
        publishRealtimeEvent(parsed);
      };

      es.onerror = () => {
        es?.close();
        if (closed) return;
        reconnectTimeout = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };
    }

    // A refreshed token is the one thing that can turn a permanently failing
    // reconnect into a working one, so react to it rather than waiting for the
    // next 5s retry to reuse the same dead credential.
    function reconnectIfTokenChanged() {
      if (closed) return;
      if (getAccessToken() === connectedWith) return;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      es?.close();
      connect();
    }

    // Coming back to the tab is when a stale stream is most likely, and most
    // likely to be noticed.
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      reconnectIfTokenChanged();
      if (es?.readyState === EventSource.CLOSED) {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        connect();
      }
    }

    connect();
    const tokenWatch = window.setInterval(reconnectIfTokenChanged, 10_000);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      closed = true;
      clearInterval(tokenWatch);
      document.removeEventListener("visibilitychange", onVisible);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      es?.close();
    };
  }, [queryClient]);
}
