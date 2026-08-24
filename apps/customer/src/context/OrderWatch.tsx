import { useEffect, useRef } from "react";
import { getDeviceToken, useSessionOrders, useTable } from "@oshap/shared";
import type { OrderStatus } from "@oshap/shared";
import { toast } from "@oshap/shared/ui";
import { useSession } from "./SessionContext";
import { newestOrderId, rememberLastOrder } from "../lastOrder";

/**
 * Tells a guest when their order moves, wherever they are in the app.
 *
 * This used to live inside the Orders screen, so it only fired if the guest
 * happened to be looking at that tab — which is the one moment they least need
 * telling, because the statuses are on screen in front of them. Someone
 * reading the menu or sitting on the pay screen heard nothing.
 *
 * Mounted app-wide instead. The toast also lands in the notification centre,
 * so a guest who missed it can still find out what happened.
 */

const ANNOUNCED: Partial<Record<OrderStatus, { message: string; kind: "info" | "success" }>> = {
  PREPARING: { message: "Your order is being prepared", kind: "info" },
  READY: { message: "Your order is ready", kind: "success" },
  CONFIRMED: { message: "Payment confirmed — enjoy your meal", kind: "success" },
};

export function OrderWatch({ tableId }: { tableId: string }) {
  const { session } = useSession();
  const deviceToken = getDeviceToken();

  const tableQuery = useTable({ tableId, deviceToken, sessionId: session?.id });
  // A query field, so it takes the table's **name**. The uuid returns 200 with
  // an empty list — a silent "no orders" rather than an error.
  const tableName = tableQuery.data?.table_id;

  const ordersQuery = useSessionOrders({
    sessionId: session?.id,
    tableId: tableName,
    deviceToken,
  });

  const seen = useRef<Record<string, OrderStatus>>({});
  /**
   * The first response is the current state, not news. Without this a guest
   * who opens the app to an order already being prepared is told it just
   * started, and one who reloads is told everything again.
   */
  const primed = useRef(false);

  /**
   * Remember the newest order while it is still live.
   *
   * This is the only place that reliably sees one: it is mounted app-wide, so
   * it watches whether the guest is on the menu, the orders list or the pay
   * screen. The Pay screen used to record it, which missed every bill served
   * and settled at the table while the guest was looking elsewhere — and left
   * that screen showing the previous order's receipt.
   */
  useEffect(() => {
    const id = newestOrderId(ordersQuery.data?.orders);
    if (id) rememberLastOrder(tableId, id);
  }, [tableId, ordersQuery.data]);

  useEffect(() => {
    const orders = ordersQuery.data?.orders;
    if (!orders) return;

    for (const order of orders) {
      const previous = seen.current[order.id];
      seen.current[order.id] = order.status;
      if (!primed.current || !previous || previous === order.status) continue;

      const announcement = ANNOUNCED[order.status];
      if (!announcement) continue;
      if (announcement.kind === "success") toast.success(announcement.message);
      else toast.info(announcement.message);
    }
    primed.current = true;
  }, [ordersQuery.data]);

  return null;
}
