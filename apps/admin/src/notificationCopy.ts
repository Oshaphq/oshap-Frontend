import { formatCurrency, parseApiDate } from "@oshap/shared";
import type { Notification, NotificationType } from "@oshap/shared";

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

/**
 * What to say when we genuinely do not know which table.
 *
 * The old fallback read "A table needs attention", which is calm, grammatical
 * and useless — it tells a waiter to check every table in the room. Worse, it
 * looks like normal copy, so nobody reports it.
 *
 * A notification without a table is broken data, and it should read that way.
 * `NotificationRow` resolves the name from `table_id` against the tables cache
 * before falling back here, so this only fires when both fields are missing.
 */
const NO_TABLE = "table not recorded";

export const NOTIFICATION_META: Record<NotificationType, NotificationMeta> = {
  waiter_called: {
    iconClass: "mgc_service_line",
    iconColorClass: "text-primary",
    chime: true,
    title: "Waiter requested",
    body: (f) =>
      f.table_name
        ? `${f.table_name} needs attention`
        : `A waiter was called — ${NO_TABLE}`,
    claimable: true,
  },
  pos_requested: {
    iconClass: "mgc_card_pay_line",
    iconColorClass: "text-primary",
    chime: true,
    title: "POS requested",
    body: (f) =>
      f.table_name
        ? `Take the card machine to ${f.table_name}`
        : `Card machine requested — ${NO_TABLE}`,
    claimable: true,
  },
  new_order: {
    iconClass: "mgc_shopping_bag_2_line",
    iconColorClass: "text-primary",
    chime: true,
    title: "New order",
    body: (f) =>
      f.table_name
        ? `${f.table_name} placed an order`
        : `An order came in — ${NO_TABLE}`,
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
        : `Food is up — ${NO_TABLE}`,
    claimable: false,
  },
  payment_claimed: {
    iconClass: "mgc_wallet_4_line",
    iconColorClass: "text-warning",
    chime: true,
    title: "Payment to verify",
    body: (f) => {
      // The amount is the whole point of this one — it is what the cashier
      // checks against the bank app before anyone leaves. The table is what
      // tells them who to check it against.
      const paid = f.amount != null ? ` ${formatCurrency(f.amount)}` : "";
      return f.table_name
        ? `${f.table_name} says they have paid${paid}`
        : `A payment of${paid || " an unknown amount"} was claimed — ${NO_TABLE}`;
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
  const seconds = Math.floor((now - parseApiDate(iso).getTime()) / 1000);
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
  const then = parseApiDate(iso).getTime();
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

/**
 * Pulls the facts a message needs out of a stored notification.
 *
 * The agreed contract named them — `amount`, `menu_item_name`,
 * `order_reference`. What shipped puts them in a freeform `payload`, so they
 * are read out here rather than at every call site, and a missing one simply
 * drops the clause it would have filled.
 */
export function notificationFacts(n: Notification): NotificationFacts {
  const payload = (n.payload ?? {}) as Record<string, unknown>;
  const str = (key: string) =>
    typeof payload[key] === "string" ? (payload[key] as string) : null;
  const num = (key: string) =>
    typeof payload[key] === "number" ? (payload[key] as number) : null;

  return {
    table_name: n.table_name ?? str("table_name"),
    order_reference: str("order_reference"),
    amount: num("amount"),
    menu_item_name: str("menu_item_name") ?? str("item_name"),
  };
}
