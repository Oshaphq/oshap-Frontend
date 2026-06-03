import {
  useAdminKitchen,
  useAdminUpdateKitchenStatus,
  formatCurrency,
  useAdminMenu,
} from "@oshap/shared";
import type { OrderWithItems } from "@oshap/shared";
import { PrimaryButton } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";
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

export default function KitchenPage() {
  const { user } = useAuth();
  const kitchenQuery = useAdminKitchen(5000);
  const menuQuery = useAdminMenu();
  const updateStatus = useAdminUpdateKitchenStatus();

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: "PREPARING" | "READY",
  ) => {
    await updateStatus.mutateAsync({
      order_id: orderId,
      status: newStatus,
    });
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
    return <QueryError onRetry={() => { kitchenQuery.refetch(); menuQuery.refetch(); }} />;
  }

  const menuItems = menuQuery.data ?? [];
  const menuLookup = new Map(menuItems.map((m) => [m.name, m.category]));

  const filterOrder = (o: OrderWithItems): boolean => {
    if (!user) return true;
    if (user.role === "BARTENDER") {
      return o.order_items.some((i) => menuLookup.get(i.name) === "Drinks");
    }
    if (user.role === "KITCHEN") {
      return o.order_items.some((i) => menuLookup.get(i.name) !== "Drinks");
    }
    return true;
  };

  const mapOrderItems = (o: OrderWithItems): OrderWithItems => {
    if (!user) return o;
    if (user.role === "BARTENDER") {
      return {
        ...o,
        order_items: o.order_items.filter((i) => menuLookup.get(i.name) === "Drinks"),
      };
    }
    if (user.role === "KITCHEN") {
      return {
        ...o,
        order_items: o.order_items.filter((i) => menuLookup.get(i.name) !== "Drinks"),
      };
    }
    return o;
  };

  const rawOrders = kitchenQuery.data ?? [];
  const orders = rawOrders.filter(filterOrder).map(mapOrderItems);
  
  const newOrders = orders.filter((o) => o.status === "CREATED");
  const inProgress = orders.filter((o) => o.status === "PREPARING");
  const ready = orders.filter((o) => o.status === "READY");

  return (
    <main className="h-[calc(100vh-56px)] flex flex-col">
      <header className="flex items-center justify-between px-md py-s bg-surface-container-lowest border-b border-surface-container-high shrink-0 min-h-[56px]">
        <h1 className="font-display text-display-h2 font-semibold text-primary-text">
          {user?.role === "BARTENDER" ? "Bar Orders" : "Kitchen Display"}
        </h1>
        <div className="flex items-center gap-s">
          <span className="px-s py-xs rounded-4xl font-bold text-caption-sm bg-error-container text-on-error-container">
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
              Waiting for new orders...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-md items-start">
            <KitchenColumn
              title="New"
              accent="error"
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
              accent="amber"
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

interface ColumnProps {
  title: string;
  accent: "error" | "amber" | "success";
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
  error: {
    headerBorder: "border-b-error",
    cardBorder: "border-l-error",
    qty: "text-error",
  },
  amber: {
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
                className={`rounded-md p-md flex flex-col gap-s bg-surface-container transition-shadow hover:shadow-md border-l-4 ${cls.cardBorder}`}
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
                  <span className="text-caption-sm text-outline font-mono">
                    #{stripRef(order.reference)}
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {order.order_items.map((item) => (
                    <li key={item.id} className="flex items-center gap-s">
                      <span className={`font-bold min-w-6 ${cls.qty}`}>
                        {item.quantity}x
                      </span>
                      <span className="text-primary-text">{item.name}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between pt-s border-t border-surface-container-high">
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
