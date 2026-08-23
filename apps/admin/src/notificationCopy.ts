import { formatCurrency } from "@oshap/shared";
import type { NotificationType } from "@oshap/shared";

/**
 * One place that turns a notification into words.
 *
 * The server sends facts — a type, a table name, an amount — and never a
 * `title` or `body`. The same record drives a toast the moment it happens and a
 * row in the panel three hours later, and if each composed its own wording the
 * two would drift until a waiter noticed. Copy belongs where the UI is, once.
 */

/** The facts a message can draw on. The stream carries a subset. */
export interface NotificationFacts {
  table_name?: string | null;
  order_reference?: string | null;
  amount?: number | null;
  menu_item_name?: string | null;
}

export interface NotificationMeta {
  iconClass: string;
  iconColorClass: string;
  /** Whether staff are interrupted with a sound. */
  chime: boolean;
  title: string;
  body: (facts: NotificationFacts) => string;
  /**
   * Whether a person can claim it. Only the two with no entity to watch —
   * the rest resolve themselves when the order or the payment moves, and a
   * hand-closed row would put this list out of step with the board.
   */
  claimable: boolean;
}

/** Falls back to "a table" rather than printing a uuid at a busy waiter. */
const at = (table?: string | null) => table ?? "A table";
const to = (table?: string | null) => table ?? "the table";

export const NOTIFICATION_META: Record<NotificationType, NotificationMeta> = {
  waiter_called: {
    iconClass: "mgc_service_line",
    iconColorClass: "text-primary",
    chime: true,
    title: "Waiter requested",
    body: (f) => `${at(f.table_name)} needs attention`,
    claimable: true,
  },
  pos_requested: {
    iconClass: "mgc_card_pay_line",
    iconColorClass: "text-primary",
    chime: true,
    title: "POS requested",
    body: (f) => `Take the card machine to ${to(f.table_name)}`,
    claimable: true,
  },
  new_order: {
    iconClass: "mgc_shopping_bag_2_line",
    iconColorClass: "text-primary",
    chime: true,
    title: "New order",
    body: (f) => `${at(f.table_name)} placed an order`,
    claimable: false,
  },
  order_ready: {
    iconClass: "mgc_bowl_line",
    iconColorClass: "text-success",
    chime: true,
    title: "Order ready",
    body: (f) =>
      f.table_name
        ? `Run ${f.table_name}'s food before it dies`
        : "Food is up — run it before it dies",
    claimable: false,
  },
  payment_claimed: {
    iconClass: "mgc_wallet_4_line",
    iconColorClass: "text-warning",
    chime: true,
    title: "Payment to verify",
    body: (f) => {
      const who = f.table_name ?? "A guest";
      // The amount is the whole point of this one — it is what the cashier
      // checks against the bank app before anyone leaves.
      return f.amount != null
        ? `${who} says they have paid ${formatCurrency(f.amount)}`
        : `${who} says they have paid`;
    },
    claimable: false,
  },
  low_stock: {
    iconClass: "mgc_box_2_line",
    iconColorClass: "text-warning",
    chime: false,
    title: "Running low",
    body: (f) =>
      f.menu_item_name
        ? `${f.menu_item_name} is at or below its threshold`
        : "An item is at or below its threshold",
    claimable: false,
  },
};

/**
 * How long ago, in the shortest form that is still honest.
 *
 * Staff read this mid-service. "2m" answers "has someone gone yet?" faster than
 * a timestamp does, and the panel is only ever showing today.
 */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.floor((now - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export type TimeBucket = "Now" | "Earlier today" | "Yesterday" | "Older";

/**
 * Buckets by wall-clock day, not by elapsed hours.
 *
 * 00:30 is "yesterday" to someone who worked the evening shift, even though it
 * is forty minutes ago. Counting backwards in hours would file it under "now"
 * and put last night's service in with this morning's.
 */
export function timeBucket(iso: string, now: number = Date.now()): TimeBucket {
  const then = new Date(iso).getTime();
  if (now - then < 5 * 60_000) return "Now";

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (then >= startOfToday.getTime()) return "Earlier today";

  const startOfYesterday = startOfToday.getTime() - 86_400_000;
  return then >= startOfYesterday ? "Yesterday" : "Older";
}

export const TIME_BUCKETS: TimeBucket[] = [
  "Now",
  "Earlier today",
  "Yesterday",
  "Older",
];
