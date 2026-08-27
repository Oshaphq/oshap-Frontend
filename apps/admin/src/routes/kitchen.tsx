import {
  useAdminKitchen,
  useAdminUpdateKitchenStatus,
  formatCurrency,
  useAdminMenu,
  errorMessage,
} from "@oshap/shared";
import type { OrderWithItems } from "@oshap/shared";
import { PrimaryButton, toast } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";
import ServeDialog from "../components/ServeDialog";
import { canAdvanceKitchenTickets } from "../permissions";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function stripRef(ref: string) {
  return ref.split("-").pop() || ref;
}

/**
 * Station routing keys off this menu category by name. It is a real fragility:
 * a restaurant that calls the category "Beverages" or "Bar" gets a bartender
 * who sees nothing and a kitchen that sees everything, silently.
 *
 * Matching by `menu_item_id` would be robust — the backend's OrderItem already
 * carries it — but the field isn't on our OrderItem contract yet. Until then
 * `StationRoutingHint` below makes the misconfiguration visible instead of
 * silent.
 */
const DRINKS_CATEGORY = "Drinks";

export default function KitchenPage() {
  // The order the serve prompt is open for. Held rather than an id, because
  // the dialog needs its table and total and the board already has both.
  const [serving, setServing] = useState<OrderWithItems | null>(null);
  const { user } = useAuth();
  const kitchenQuery = useAdminKitchen();
  /**
   * Only a station role needs the menu, and only to tell a drink from a plate.
   * `GET /admin/menu` is owner and manager only, so asking for it on every
   * role meant a waiter opening this board got a 403 — and the board is the
   * screen a waiter needs most, because Served is tapped from it.
   */
  const isStationRole = user?.role === "BARTENDER" || user?.role === "KITCHEN";
  const menuQuery = useAdminMenu({ enabled: isStationRole });
  const updateStatus = useAdminUpdateKitchenStatus();

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: "PREPARING" | "READY",
  ) => {
    try {
      await updateStatus.mutateAsync({
        order_id: orderId,
        status: newStatus,
      });
    } catch (err) {
      // A dropped connection during service must not leave a ticket stuck in
      // place with no feedback — the board only advances on explicit taps.
      toast.error(errorMessage(err, "update the order status"));
    }
  };

  if (kitchenQuery.isLoading || (isStationRole && menuQuery.isLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-secondary-text">
        <div className="oshap-spinner" />
        <p>Loading orders...</p>
      </div>
    );
  }

  // Only the tickets can empty this screen. A menu that fails costs the
  // drinks/food split, which is recoverable by showing everything; a blank
  // board during service is not.
  if (kitchenQuery.isError) {
    return (
      <QueryError
        error={kitchenQuery.error}
        action="load the orders"
        onRetry={() => kitchenQuery.refetch()}
      />
    );
  }

  const menuItems = menuQuery.data ?? [];
  const menuLookup = new Map(menuItems.map((m) => [m.name, m.category]));
  /**
   * Whether the split can be trusted.
   *
   * With an empty lookup every `.some()` below is false, so a bartender whose
   * menu request failed saw an empty board and no error at all — the worst
   * of the three outcomes, because it looks like a quiet night. Fall back to
   * showing every ticket and say why.
   */
  const canSplit = !isStationRole || menuLookup.size > 0;

  const filterOrder = (o: OrderWithItems): boolean => {
    if (!user || !canSplit) return true;
    if (user.role === "BARTENDER") {
      return o.order_items.some(
        (i) => menuLookup.get(i.name) === DRINKS_CATEGORY,
      );
    }
    if (user.role === "KITCHEN") {
      return o.order_items.some(
        (i) => menuLookup.get(i.name) !== DRINKS_CATEGORY,
      );
    }
    return true;
  };

  const mapOrderItems = (o: OrderWithItems): OrderWithItems => {
    if (!user || !canSplit) return o;
    if (user.role === "BARTENDER") {
      return {
        ...o,
        order_items: o.order_items.filter(
          (i) => menuLookup.get(i.name) === DRINKS_CATEGORY,
        ),
      };
    }
    if (user.role === "KITCHEN") {
      return {
        ...o,
        order_items: o.order_items.filter(
          (i) => menuLookup.get(i.name) !== DRINKS_CATEGORY,
        ),
      };
    }
    return o;
  };

  const rawOrders = kitchenQuery.data ?? [];
  const orders = rawOrders.filter(filterOrder).map(mapOrderItems);

  const canAdvanceTickets = user ? canAdvanceKitchenTickets(user.role) : false;
  // Orders exist but this station sees none of them — usually a category-name
  // mismatch rather than a quiet service.
  const hiddenByStationFilter =
    isStationRole && orders.length === 0 && rawOrders.length > 0;
  const hasDrinksCategory = menuItems.some(
    (m) => m.category === DRINKS_CATEGORY,
  );

  const newOrders = orders.filter((o) => o.status === "CREATED");
  const inProgress = orders.filter((o) => o.status === "PREPARING");
  const ready = orders.filter((o) => o.status === "READY");

  return (
    <main className="h-[calc(100vh-56px)] flex flex-col">
      {/* Stacked on a phone: the title and the three counts fought for one
          row, and the title lost — it shrank to fit beside them. Each gets a
          line of its own, and they sit back on one row from `sm` up where
          there is room for both. */}
      <header className="flex flex-col items-start gap-s px-md py-s sm:flex-row sm:items-center sm:justify-between sm:gap-md bg-surface border-b border-outline-variant shrink-0 sm:min-h-[56px]">
        <h1 className="font-display text-display-h2 font-semibold text-primary-text">
          {user?.role === "BARTENDER" ? "Bar Orders" : "Kitchen Display"}
        </h1>
        {/* Wraps only where three pills genuinely cannot fit, rather than
            running off the edge of the screen. */}
        <div className="flex items-center gap-s flex-wrap">
          <span className="px-s py-xs rounded-4xl font-bold text-caption-sm bg-primary-container text-on-primary-container">
            {newOrders.length} new
          </span>
          <span className="px-s py-xs rounded-4xl font-bold text-caption-sm bg-warning-container text-on-warning-container">
            {inProgress.length} preparing
          </span>
          <span className="px-s py-xs rounded-4xl font-bold text-caption-sm bg-success-container text-on-success-container">
            {ready.length} ready
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-md flex flex-col gap-md">
        {/* Said out loud, because the alternative is a bartender reading a
            board that quietly includes the kitchen's tickets and wondering
            why there is suddenly rice on it. */}
        {isStationRole && !canSplit && (
          <div
            role="alert"
            className="flex items-start gap-s p-md rounded-md bg-warning-container text-on-warning-container"
          >
            <i className="mgc_alert_line text-lg shrink-0" aria-hidden />
            <p className="text-caption-sm font-semibold">
              Showing every ticket — we couldn’t load the menu, so drinks and
              food can’t be told apart right now.
            </p>
          </div>
        )}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-s text-center py-20">
            <i className="mgc_knife_line text-5xl text-outline-variant opacity-40" />
            <span className="font-display text-display-h4 font-semibold text-primary-text">
              No orders yet
            </span>
            <p className="text-p2 text-secondary-text">
              {hiddenByStationFilter
                ? `${rawOrders.length} active order${rawOrders.length === 1 ? "" : "s"}, none for this station.`
                : "Waiting for new orders..."}
            </p>
            {hiddenByStationFilter && !hasDrinksCategory && (
              <StationRoutingHint />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-md items-start">
            <KitchenColumn
              title="New"
              accent="primary"
              orders={newOrders}
              ctaLabel={canAdvanceTickets ? "Start" : null}
              ctaDisabledLabel="..."
              isUpdatingId={
                updateStatus.isPending ? updateStatus.variables?.order_id : null
              }
              onAction={(id) => handleUpdateStatus(id, "PREPARING")}
            />
            <KitchenColumn
              title="Preparing"
              accent="warning"
              orders={inProgress}
              ctaLabel={canAdvanceTickets ? "Ready" : null}
              ctaDisabledLabel="..."
              isUpdatingId={
                updateStatus.isPending ? updateStatus.variables?.order_id : null
              }
              onAction={(id) => handleUpdateStatus(id, "READY")}
            />
            {/* Ready used to be the end of the line — an order sat here with
                no action, so nothing recorded that the food reached the table
                and a plate going cold on the pass looked exactly like a waiter
                who forgot to tap. */}
            <KitchenColumn
              title="Ready"
              accent="success"
              orders={ready}
              ctaLabel="Served"
              ctaDisabledLabel="..."
              isUpdatingId={null}
              onAction={(id) => {
                const order = ready.find((o) => o.id === id);
                if (order) setServing(order);
              }}
            />
          </div>
        )}
      </div>

      {serving && (
        <ServeDialog
          orderId={serving.id}
          tableName={serving.table_id}
          total={serving.total}
          onClose={() => setServing(null)}
        />
      )}
    </main>
  );
}

/**
 * Shown when a station's board is empty while orders exist and no menu category
 * is named "Drinks" — i.e. routing is misconfigured rather than the venue being
 * quiet. Cheap to surface, and otherwise invisible until someone complains that
 * the bar never gets tickets.
 */
function StationRoutingHint() {
  return (
    <div className="flex items-start gap-s p-md mt-s max-w-[480px] rounded-lg bg-warning-container text-on-warning-container text-left">
      <i className="mgc_alert_line text-xl shrink-0 mt-0.5" />
      <p className="text-label-l5">
        Kitchen and bar orders are split by a menu category named{" "}
        <span className="font-semibold">&ldquo;{DRINKS_CATEGORY}&rdquo;</span>,
        and your menu has no such category. Rename your drinks category in{" "}
        <span className="font-semibold">Menu</span> so tickets reach the right
        station.
      </p>
    </div>
  );
}

interface ColumnProps {
  title: string;
  accent: "primary" | "warning" | "success";
  orders: OrderWithItems[];
  ctaLabel: string | null;
  ctaDisabledLabel: string | null;
  isUpdatingId: string | null | undefined;
  onAction: (orderId: string) => void;
}

/**
 * The column's colour, on the header rule and the quantity.
 *
 * Not on the card any more. A ticket already sits under a coloured heading in
 * a single-column phone layout, so a 4px bar down its left edge repeated what
 * the heading above it had just said and ate the padding on the side where the
 * table number starts.
 */
const ACCENT_CLS: Record<
  ColumnProps["accent"],
  { headerBorder: string; qty: string }
> = {
  primary: {
    headerBorder: "border-b-primary",
    qty: "text-primary",
  },
  warning: {
    headerBorder: "border-b-warning",
    qty: "text-warning",
  },
  success: {
    headerBorder: "border-b-success",
    qty: "text-success",
  },
};

function KitchenColumn({
  title,
  accent,
  orders,
  ctaLabel,
  ctaDisabledLabel,
  isUpdatingId,
  onAction,
}: ColumnProps) {
  const cls = ACCENT_CLS[accent];

  return (
    <div className="flex flex-col gap-md">
      <h2
        className={`font-semibold uppercase tracking-wider text-caption-md pb-s border-b-2 flex items-center gap-s text-primary-text ${cls.headerBorder}`}
      >
        {title}
      </h2>
      {orders.length === 0 ? (
        <p className="text-center py-xl text-outline">—</p>
      ) : (
        <div className="flex flex-col gap-md">
          {orders.map((order) => {
            const isUpdating = isUpdatingId === order.id;
            return (
              <div
                key={order.id}
                className="rounded-md p-md flex flex-col gap-s bg-surface-container-low transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-s">
                  <div className="flex items-center gap-s">
                    <span className="font-bold text-primary-text">
                      {order.table_id}
                    </span>
                    <span className="text-caption-sm text-secondary-text">
                      {timeAgo(order.created_at)}
                    </span>
                  </div>
                  <Link
                    to={`/orders/${order.id}`}
                    title="Open the bill"
                    className="text-caption-sm text-outline font-mono hover:text-primary transition-colors no-underline"
                  >
                    #{stripRef(order.reference)}
                  </Link>
                </div>
                <ul className="flex flex-col gap-xs">
                  {order.order_items.map((item) => (
                    <li key={item.id} className="flex items-start gap-s">
                      <span className={`font-bold min-w-l ${cls.qty}`}>
                        {item.quantity}x
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-primary-text">{item.name}</span>
                        {/* The whole point of modifiers: a cook who can't see
                            "No pepper" is cooking the wrong dish. Prices are
                            deliberately omitted — the kitchen doesn't need
                            them and they'd crowd the instruction. */}
                        {item.modifiers?.map((modifier, i) => (
                          <span
                            key={`${modifier.option}-${i}`}
                            className="text-caption-md text-secondary-text"
                          >
                            + {modifier.option}
                          </span>
                        ))}
                        {item.notes && (
                          <span className="text-caption-md font-semibold text-warning italic">
                            {item.notes}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-xl pt-s border-t border-surface-container-high">
                  <span className="text-caption-md font-bold text-secondary-text">
                    {formatCurrency(order.total)}
                  </span>
                  {ctaLabel != null && (
                    <PrimaryButton
                      onClick={() => onAction(order.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? ctaDisabledLabel : ctaLabel}
                    </PrimaryButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
