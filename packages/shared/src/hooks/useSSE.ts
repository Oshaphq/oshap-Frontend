import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createEventSource } from "../api/sse";
import { queryKeys } from "../api/keys";

export function useGlobalSSE() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: number | null = null;

    function connect() {
      es = createEventSource("/events");

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[SSE] Received event:", data);
          
          if (data.type === "ORDER_CREATED" || data.type === "STATUS_CHANGED") {
            // Kitchen dashboard
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.kitchen() });
            // Customer active session
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
            // Customer polling table status
            queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
            // Admin tables dashboard
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
          } else if (data.type === "PAYMENT_PENDING" || data.type === "PAYMENT_VERIFIED") {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
            queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
          } else if (data.type === "TABLE_CLOSED") {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.tables() });
            queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
          } else {
            // Blanket invalidation
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.tables.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
          }
        } catch (err) {
          console.error("[SSE] Failed to parse event:", err);
        }
      };

      es.onerror = () => {
        console.error("[SSE] Connection error. Reconnecting in 5s...");
        es?.close();
        reconnectTimeout = window.setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      es?.close();
    };
  }, [queryClient]);
}
