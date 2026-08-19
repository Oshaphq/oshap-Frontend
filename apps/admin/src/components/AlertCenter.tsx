import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  subscribeToRealtimeEvents,
  type RealtimeEvent,
} from "@oshap/shared";
import type { AdminTablesResponse } from "@oshap/shared";
import { playChime } from "../utils/chime";

interface Alert {
  id: number;
  title: string;
  body: string;
  iconClass: string;
  iconColorClass: string;
}

const VISIBLE_MS = 5_000;

/**
 * Which realtime events staff are interrupted for, and how it reads.
 *
 * Alerts are driven by SSE, not FCM. This used to subscribe to
 * `onMessage` from Firebase alone, which meant that on any deployment
 * without FCM credentials — including production — `getMessagingInstance()`
 * returned null and no alert or chime could ever fire, silently. The events
 * were arriving on the SSE stream the whole time and being dropped.
 *
 * FCM keeps its real job: waking staff when the tab is closed, via the
 * service worker. That path does not run this component.
 */
const TYPE_META: Record<
  string,
  {
    iconClass: string;
    iconColorClass: string;
    chime: boolean;
    title: string;
    body: (table: string | null) => string;
  }
> = {
  waiter_called: {
    iconClass: "mgc_service_line",
    iconColorClass: "text-primary",
    chime: true,
    title: "Waiter requested",
    body: (t) => (t ? `${t} needs attention` : "A table needs attention"),
  },
  pos_requested: {
    iconClass: "mgc_card_pay_line",
    iconColorClass: "text-primary",
    chime: true,
    title: "POS requested",
    body: (t) => (t ? `Take the card machine to ${t}` : "Take the card machine over"),
  },
  new_order: {
    iconClass: "mgc_shopping_bag_2_line",
    iconColorClass: "text-primary",
    chime: true,
    title: "New order",
    body: (t) => (t ? `${t} placed an order` : "An order came in"),
  },
  payment_claimed: {
    iconClass: "mgc_wallet_4_line",
    iconColorClass: "text-warning",
    chime: true,
    title: "Payment to verify",
    body: (t) =>
      t ? `${t} says they have paid` : "A guest says they have paid",
  },
};

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const nextIdRef = useRef(1);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timers: number[] = [];

    const unsubscribe = subscribeToRealtimeEvents((event: RealtimeEvent) => {
      const meta = TYPE_META[event.type];
      if (!meta) return;

      // The stream carries the table's uuid; staff read names. Resolve off the
      // tables cache the dashboard already keeps warm, and degrade to a
      // table-less message rather than printing a uuid at a busy waiter.
      const tableUuid = event.data?.table_id;
      const cached = queryClient.getQueryData<AdminTablesResponse>(
        queryKeys.admin.tables(),
      );
      const tableName =
        typeof tableUuid === "string"
          ? cached?.tables.find((t) => t.id === tableUuid)?.table_id ?? null
          : null;

      const id = nextIdRef.current++;
      setAlerts((prev) => [
        ...prev,
        {
          id,
          title: meta.title,
          body: meta.body(tableName),
          iconClass: meta.iconClass,
          iconColorClass: meta.iconColorClass,
        },
      ]);

      if (meta.chime) playChime();

      timers.push(
        window.setTimeout(() => {
          setAlerts((prev) => prev.filter((a) => a.id !== id));
        }, VISIBLE_MS),
      );
    });

    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
    };
  }, [queryClient]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top,0px)+1rem)] right-4 z-[60] flex flex-col gap-s max-w-[calc(100vw-2rem)] w-[360px]">
      {alerts.map((a) => (
        <div
          key={a.id}
          role="status"
          aria-live="polite"
          className="flex items-start gap-s p-md rounded-lg bg-inverse-surface text-inverse-on-surface shadow-lg"
          style={{ animation: "slide-down 220ms ease-out" }}
        >
          <i className={`${a.iconClass} text-2xl shrink-0 ${a.iconColorClass}`} />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-label-l4 font-semibold font-display">
              {a.title}
            </span>
            <p className="text-label-l5 text-outline-variant">{a.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
