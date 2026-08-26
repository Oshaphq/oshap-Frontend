import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  subscribeToRealtimeEvents,
  type RealtimeEvent,
} from "@oshap/shared";
import type { AdminTablesResponse } from "@oshap/shared";
import { playChime, listenForFirstGesture } from "../utils/chime";
import { NOTIFICATION_META } from "../notificationCopy";
import { whenVisible } from "../whenVisible";
import type { NotificationType } from "@oshap/shared";

/**
 * Which realtime events staff are interrupted for, and how it reads.
 *
 * Alerts are driven by SSE, not FCM. This used to subscribe to `onMessage`
 * from Firebase alone, which meant that on any deployment without FCM
 * credentials — including production — `getMessagingInstance()` returned null
 * and no alert or chime could ever fire, silently. The events were arriving on
 * the SSE stream the whole time and being dropped.
 *
 * FCM keeps its real job: waking staff when the tab is closed, via the service
 * worker. That path does not run this component.
 *
 * The wording lives in `notificationCopy` because the same fact also becomes a
 * row in the notification panel, and two copies of a sentence drift.
 */
const TYPE_META = NOTIFICATION_META as Record<
  string,
  (typeof NOTIFICATION_META)[NotificationType]
>;

interface Alert {
  id: number;
  title: string;
  body: string;
  iconClass: string;
  iconColorClass: string;
}

const VISIBLE_MS = 5_000;

/**
 * The name staff read, from whichever identifier the event happened to carry.
 *
 * Tries the uuid first: names repeat across restaurants and a uuid never does,
 * so on the vanishing chance a table is literally named after another table's
 * id, the id wins. Returns null rather than the raw reference — a uuid on
 * screen tells a waiter nothing.
 */
export function resolveTableName(
  tables: Array<{ id: string; table_id: string }> | undefined,
  reference: string,
): string | null {
  if (!tables?.length || !reference) return null;
  const byId = tables.find((t) => t.id === reference);
  if (byId) return byId.table_id;
  return tables.find((t) => t.table_id === reference)?.table_id ?? null;
}

/** Events that add a notification, and events that resolve one. */
const NOTIFYING = new Set([
  "waiter_called",
  "pos_requested",
  "new_order",
  "order_ready",
  "payment_claimed",
  "low_stock",
  "order_preparing",
  "payment_verified",
  "payment_rejected",
  "table_closed",
  "notification_resolved",
]);

export default function AlertCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const nextIdRef = useRef(1);
  const queryClient = useQueryClient();

  // Arms the audio on the first tap or keypress anywhere in the app. Without
  // it the context is first created inside an SSE handler, where the browser
  // refuses to start it — so the chime never sounded, silently.
  useEffect(listenForFirstGesture, []);

  useEffect(() => {
    const timers: number[] = [];
    // Listeners that outlive a single alert, cleared with the subscription.
    const cleanups: Array<() => void> = [];

    /**
     * Starts an alert's five seconds only once somebody can actually see it.
     *
     * Staff run the admin board in one tab and the guest app in another — the
     * same person testing, or a manager watching a table order. An alert that
     * arrived while the board was hidden used to appear and dismiss itself in
     * the background, so switching back showed nothing and the feature looked
     * dead. The bell still counted it, which is how we know it was firing.
     *
     * Hidden means the clock has not started, not that the alert is stale.
     */
    const dismissWhenSeen = (id: number) => {
      const drop = () => setAlerts((prev) => prev.filter((a) => a.id !== id));
      cleanups.push(
        whenVisible(() => timers.push(window.setTimeout(drop, VISIBLE_MS))),
      );
    };

    const unsubscribe = subscribeToRealtimeEvents((event: RealtimeEvent) => {
      // Refresh the bell on anything that creates a notification *or* closes
      // one. Done before the toast check on purpose: `payment_verified` and
      // `order_preparing` are never toasted — they are the events that make a
      // row go quiet, and the badge is wrong until it hears about them.
      if (NOTIFYING.has(event.type)) {
        queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      }

      const meta = TYPE_META[event.type];
      if (!meta) return;

      // The stream carries the table's uuid; staff read names. Resolve off the
      // tables cache the dashboard already keeps warm, and degrade to a
      // table-less message rather than printing a uuid at a busy waiter.
      //
      // `table_id` on the stream is a **uuid on some events and a name on
      // others** — measured on the live stream:
      //
      //   waiter_called   table_id: "ace5c88a-aa5e-470b-…"   uuid
      //   new_order       table_id: "T1"                     name
      //   pos_requested   table_id: "T1"                     name
      //
      // Matching only the uuid meant orders and card requests never resolved a
      // name and fell through to "table not recorded" — the copy meant for
      // genuinely broken data, on the two events that carry it perfectly well.
      const tableRef = event.data?.table_id;
      const cached = queryClient.getQueryData<AdminTablesResponse>(
        queryKeys.admin.tables(),
      );
      const tableName =
        typeof tableRef === "string"
          ? resolveTableName(cached?.tables, tableRef)
          : null;

      const id = nextIdRef.current++;
      setAlerts((prev) => [
        ...prev,
        {
          id,
          title: meta.title,
          body: meta.body({ table_name: tableName }),
          iconClass: meta.iconClass,
          iconColorClass: meta.iconColorClass,
        },
      ]);

      if (meta.chime) playChime();

      dismissWhenSeen(id);
    });

    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
      cleanups.forEach((off) => off());
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
