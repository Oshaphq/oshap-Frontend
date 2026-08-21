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
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";

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
  const { user } = useAuth();
  const kitchenQuery = useAdminKitchen();
  const menuQuery = useAdminMenu();
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

  if (kitchenQuery.isLoading || menuQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-secondary-text">
        <div className="oshap-spinner" />
        <p>Loading orders...</p>
      </div>
    );
  }

  if (kitchenQuery.isError || menuQuery.isError) {
    return <QueryError
        error={kitchenQuery.error ?? menuQuery.error}
        action="load the orders"
        onRetry={() => { kitchenQuery.refetch(); menuQuery.refetch(); }}
      />;
  }

  const menuItems = menuQuery.data ?? [];
  const menuLookup = new Map(menuItems.map((m) => [m.name, m.category]));

  const filterOrder = (o: OrderWithItems): boolean => {
    if (!user) return true;
    if (user.role === "BARTENDER") {
      return o.order_items.some((i) => menuLookup.get(i.name) === DRINKS_CATEGORY);
    }
    if (user.role === "KITCHEN") {
      return o.order_items.some((i) => menuLookup.get(i.name) !== DRINKS_CATEGORY);
    }
    return true;
  };

  const mapOrderItems = (o: OrderWithItems): OrderWithItems => {
    if (!user) return o;
    if (user.role === "BARTENDER") {
      return {
        ...o,
        order_items: o.order_items.filter((i) => menuLookup.get(i.name) === DRINKS_CATEGORY),
      };
    }
    if (user.role === "KITCHEN") {
      return {
        ...o,
        order_items: o.order_items.filter((i) => menuLookup.get(i.name) !== DRINKS_CATEGORY),
      };
    }
    return o;
  };

  const rawOrders = kitchenQuery.data ?? [];
  const orders = rawOrders.filter(filterOrder).map(mapOrderItems);

  const isStationRole = user?.role === "BARTENDER" || user?.role === "KITCHEN";
  // Orders exist but this station sees none of them — usually a category-name
  // mismatch rather than a quiet service.
  const hiddenByStationFilter =
    isStationRole && orders.length === 0 && rawOrders.length > 0;
  const hasDrinksCategory = menuItems.some((m) => m.category === DRINKS_CATEGORY);
  
  const newOrders = orders.filter((o) => o.status === "CREATED");
  const inProgress = orders.filter((o) => o.status === "PREPARING");
  const ready = orders.filter((o) => o.status === "READY");

  return (
    <main className="h-[calc(100vh-56px)] flex flex-col">
      <header className="flex items-center justify-between px-md py-s bg-surface border-b border-outline-variant shrink-0 min-h-[56px]">
        <h1 className="font-display text-display-h2 font-semibold text-primary-text">
          {user?.role === "BARTENDER" ? "Bar Orders" : "Kitchen Display"}
        </h1>
        <div className="flex items-center gap-s">
          <span className="px-s py-xs rounded-4xl font-bold text-caption-sm bg-primary-container text-on-primary-container">
            {newOrders.length} new
          </span>
          <span className="px-s py-xs rounded-4xl font-bold text-caption-sm bg-warning-container text-on-warning-container">
            {inProgress.length} cooking
          </span>
          <span className="px-s py-xs rounded-4xl font-bold text-caption-sm bg-success-container text-on-success-container">
            {ready.length} ready
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-md">
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
              ctaLabel="Start"
              ctaDisabledLabel="..."
              isUpdatingId={
                updateStatus.isPending ? updateStatus.variables?.order_id : null
              }
              onAction={(id) => handleUpdateStatus(id, "PREPARING")}
            />
            <KitchenColumn
              title="Cooking"
              accent="warning"
              orders={inProgress}
              ctaLabel="Ready"
              ctaDisabledLabel="..."
              isUpdatingId={
                updateStatus.isPending ? updateStatus.variables?.order_id : null
              }
              onAction={(id) => handleUpdateStatus(id, "READY")}
            />
            <KitchenColumn
              title="Ready"
              accent="success"
              orders={ready}
              ctaLabel={null}
              ctaDisabledLabel={null}
              isUpdatingId={null}
              onAction={() => {}}
            />
          </div>
        )}
      </div>
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
        <span className="font-semibold">&ldquo;{DRINKS_CATEGORY}&rdquo;</span>, and
        your menu has no such category. Rename your drinks category in{" "}
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

const ACCENT_CLS: Record<
  ColumnProps["accent"],
  { headerBorder: string; cardBorder: string; qty: string }
> = {
  primary: {
    headerBorder: "border-b-primary",
    cardBorder: "border-l-primary",
    qty: "text-primary",
  },
  warning: {
    headerBorder: "border-b-warning",
    cardBorder: "border-l-warning",
    qty: "text-warning",
  },
  success: {
    headerBorder: "border-b-success",
    cardBorder: "border-l-success",
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
                className={`rounded-md p-md flex flex-col gap-s bg-surface-container-low transition-shadow hover:shadow-md border-l-4 ${cls.cardBorder}`}
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
