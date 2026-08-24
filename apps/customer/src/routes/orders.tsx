import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  formatCurrency,
  getDeviceToken,
  useSessionOrders,
  useTable,
  parseApiDate,
} from "@oshap/shared";
import type { OrderStatus, OrderWithItems, OrderItem } from "@oshap/shared";
import { CartProvider, useCart } from "../context/CartContext";
import { useSession } from "../context/SessionContext";
import BottomNav from "../components/BottomNav";
import CartBar from "../components/CartBar";
import CartDrawer from "../components/CartDrawer";
import { useDragToDismiss } from "../hooks/useDragToDismiss";
import { PrimaryButton, SecondaryButton } from "@oshap/shared/ui";
import PinChip from "../components/PinChip";
import AddButton from "../components/AddButton";
import CustomerHeader from "../components/CustomerHeader";

export default function OrdersPage() {
  const [params] = useSearchParams();
  const tableId = params.get("table") ?? "T1";

  return (
    <CartProvider tableId={tableId}>
      <OrdersView tableId={tableId} />
      <CartBar />
      <CartDrawer tableId={tableId} />
      <BottomNav tableId={tableId} />
    </CartProvider>
  );
}

function OrdersView({ tableId }: { tableId: string }) {
  const navigate = useNavigate();
  const { session, customerName, setCustomerName, isHydrated, startSession, joinSession } = useSession();
  const deviceToken = getDeviceToken();

  const [pinInput, setPinInput] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState("");
  const [showOthersDetail, setShowOthersDetail] = useState(false);
  const { sheetRef: othersSheetRef, handleProps: othersHandleProps } =
    useDragToDismiss(() => setShowOthersDetail(false));

  // POST /session records against the table's NAME, while the URL carries its
  // uuid — see the note in checkout.tsx.
  const tableQuery = useTable({ tableId, deviceToken });
  const tableName = tableQuery.data?.table_id;

  // `table_id` here is a query field, so it takes the NAME. Passing the uuid
  // returns 200 with an empty list — a silent "no orders" rather than an
  // error, which is the failure mode worth guarding hardest against.
  const sessionOrdersQuery = useSessionOrders({
    sessionId: session?.id,
    tableId: tableName,
    deviceToken,
  });



  const orders = useMemo(() => {
    const list = sessionOrdersQuery.data?.orders ?? [];
    return [...list].sort(
      (a, b) => parseApiDate(a.created_at).getTime() - parseApiDate(b.created_at).getTime(),
    );
  }, [sessionOrdersQuery.data]);

  const displayOrderId = useMemo(() => {
    if (orders.length === 0) return "1234-5678";
    const ref = orders[0]?.reference ?? "1234-5678";
    return ref.split("-").pop() ?? ref;
  }, [orders]);

  const handleStartSession = async () => {
    if (!customerName.trim()) return;
    if (!tableName) {
      setPinError("Still loading this table. Try again in a moment.");
      return;
    }
    setPinError("");
    try {
      await startSession(tableName);
    } catch (err) {
      setPinError(
        err instanceof Error
          ? err.message
          : "Could not start session. Please try again.",
      );
    }
  };

  const handleJoinSession = async () => {
    if (!pinInput.trim()) {
      setPinError("Enter a PIN to join.");
      return;
    }
    setPinError("");
    try {
      await joinSession(pinInput.trim(), tableName ?? tableId);
      setShowPinInput(false);
      setPinInput("");
    } catch (err) {
      setPinError(
        err instanceof Error
          ? err.message
          : "Could not join session. Please try again.",
      );
    }
  };

  // Split orders into the current customer's vs. everyone else's at the table.
  // Pre-session (no session.id, no customer_name yet) all orders belong to this device.
  const { myOrders, othersOrders, otherCustomers, otherItemNames } = useMemo(() => {
    if (!session || !customerName) {
      return {
        myOrders: orders,
        othersOrders: [],
        otherCustomers: [] as string[],
        otherItemNames: [] as string[],
      };
    }
    const mine = orders.filter((o) => o.customer_name === customerName);
    const others = orders.filter((o) => o.customer_name !== customerName);
    const names = Array.from(
      new Set(others.map((o) => o.customer_name).filter((n): n is string => !!n)),
    );
    const items = Array.from(
      new Set(others.flatMap((o) => o.order_items.map((i) => i.name))),
    );
    return {
      myOrders: mine,
      othersOrders: others,
      otherCustomers: names,
      otherItemNames: items,
    };
  }, [orders, session, customerName]);

  const yourTotal = useMemo(
    () => myOrders.reduce((sum, o) => sum + o.total, 0),
    [myOrders],
  );

  // Status announcements moved to `OrderWatch`, mounted app-wide — they were
  // firing only on this screen, which is the one place the statuses are
  // already visible.

  const groupTotal = useMemo(
    () => orders.reduce((sum, o) => sum + o.total, 0),
    [orders],
  );

  const othersTotal = useMemo(
    () => othersOrders.reduce((sum, o) => sum + o.total, 0),
    [othersOrders],
  );

  // Group other customers' orders by name for the expanded sheet.
  const othersByCustomer = useMemo(() => {
    const groups = new Map<string, OrderWithItems[]>();
    for (const order of othersOrders) {
      const name = order.customer_name ?? "Guest";
      const existing = groups.get(name) ?? [];
      existing.push(order);
      groups.set(name, existing);
    }
    return Array.from(groups.entries());
  }, [othersOrders]);

  return (
    <div className="min-h-screen bg-surface-container-low pb-[var(--app-bottom-inset)]">
      <CustomerHeader
        tableId={tableId}
        title="My Orders"
        subtitle={`Order id: ${displayOrderId}`}
        leftSlot={
          <button
            type="button"
            onClick={() => navigate(`/menu?table=${tableId}`)}
            aria-label="Back"
            className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container hover:bg-surface-container-high transition-colors"
          >
            <i className="mgc_left_line text-xl" />
          </button>
        }
      />

      {!isHydrated ? (
        <section className="py-l px-md">
          <p className="text-p2 text-secondary-text">Loading session...</p>
        </section>
      ) : session ? (
        <section className="py-l px-md bg-surface-container-low border-b-[6px] border-surface-container flex flex-col gap-s">
          <h2 className="font-display text-display-h3 font-semibold text-primary-text">
            Order together
          </h2>
          <p className="text-p2 text-secondary-text">
            Share PIN with your companions at table & order<br />together.
          </p>
          <PinChip pin={session.pin} />
        </section>
      ) : (
        <section className="py-l px-md bg-surface-container-low border-b-[6px] border-surface-container flex flex-col gap-md">
          <h2 className="font-display text-display-h3 font-semibold text-primary-text">
            Order together
          </h2>
          <p className="text-p2 text-secondary-text">
            Share PIN with your companions at table & order<br />together.
          </p>

          <div className="flex flex-col gap-s">
            <span className="text-label-l5 font-semibold text-secondary-text">
              YOUR NAME
            </span>
            <input
              type="text"
              placeholder="Enter your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="px-md py-md bg-surface-container-low border border-outline-variant rounded-lg text-label-l3 text-primary-text placeholder:text-secondary-text outline-none focus:border-primary transition-colors"
            />
          </div>

          {showPinInput && (
            <div className="flex flex-col gap-s">
              <span className="text-label-l5 font-semibold text-secondary-text">
                TABLE PIN
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError("");
                }}
                className="px-md py-md bg-surface-container-low border border-outline-variant rounded-lg text-label-l3 text-primary-text placeholder:text-secondary-text outline-none focus:border-primary transition-colors"
              />
              {pinError && (
                <span className="text-caption-sm text-error">{pinError}</span>
              )}
            </div>
          )}

          <div className="flex gap-s">
            <SecondaryButton
              size="md"
              className="flex-1"
              onClick={() => setShowPinInput((v) => !v)}
            >
              Join with PIN
            </SecondaryButton>
            <PrimaryButton
              size="md"
              className="flex-1"
              onClick={showPinInput ? handleJoinSession : handleStartSession}
              disabled={!customerName.trim()}
            >
              {showPinInput ? "Join" : "Start Session"}
            </PrimaryButton>
          </div>
        </section>
      )}

      <section className="pt-l pb-md px-md bg-surface-container-low flex flex-col gap-s">
        <h2 className="font-display text-display-h3 font-semibold text-primary-text">
          {customerName ? `${customerName}'s Order` : "Your Order"}
        </h2>
        <div className="h-px bg-outline-variant" />

        {myOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-s py-10 px-md">
            <i className="mgc_shopping_bag_2_line text-5xl text-outline-variant" />
            <span className="font-display text-display-h4 font-semibold text-primary-text">
              No orders yet
            </span>
            <p className="text-p2 text-secondary-text text-center">
              Add items from the menu to place your order.
            </p>
            <PrimaryButton
              size="md"
              onClick={() => navigate(`/menu?table=${tableId}`)}
            >
              Browse Menu
            </PrimaryButton>
          </div>
        ) : (
          <div className="flex flex-col gap-md pt-md">
            {myOrders.map((order, i) => (
              <div key={order.id} className="flex flex-col gap-md">
                <div className="flex items-center justify-between gap-s">
                  <span className="text-label-l4 text-secondary-text">
                    Order {i + 1}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex flex-col gap-md">
                  {order.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-s">
                        <i className="mgc_fork_spoon_line text-xl text-primary" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-label-l3 font-semibold text-primary-text">
                            {item.name}
                          </span>
                          <span className="text-label-l5 text-secondary-text">
                            Qty {item.quantity}
                          </span>
                        </div>
                      </div>
                      <ReorderButton item={item} />
                    </div>
                  ))}
                </div>
                {i < myOrders.length - 1 && (
                  <div className="h-px bg-outline-variant" />
                )}
              </div>
            ))}

            <div className="h-px bg-outline-variant" />

            <div className="flex items-center justify-between">
              <span className="text-label-l4 text-secondary-text">
                {othersOrders.length > 0 ? "Your Total" : "Total"}
              </span>
              <span className="text-label-l4 font-semibold text-primary-text">
                {formatCurrency(yourTotal)}
              </span>
            </div>

            {othersOrders.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-label-l4 text-secondary-text">
                  Group Total
                </span>
                <span className="text-label-l4 text-secondary-text">
                  {formatCurrency(groupTotal)}
                </span>
              </div>
            )}
          </div>
        )}

        {otherCustomers.length > 0 && (
          <button
            type="button"
            onClick={() => setShowOthersDetail(true)}
            aria-label="See what others are ordering"
            className="fixed left-0 right-0 bottom-16 bg-inverse-surface px-md py-md flex items-center justify-between gap-md z-[44] hover:opacity-95 active:opacity-90 transition-opacity"
          >
            <div className="flex flex-col gap-xs min-w-0 text-left">
              <span className="text-label-l4 font-semibold font-display text-inverse-on-surface">
                See what others are ordering
              </span>
              <span className="text-label-l5 text-outline-variant truncate">
                {otherItemNames.join(", ")}
              </span>
            </div>
            <div className="flex items-center -space-x-2 shrink-0">
              {otherCustomers.slice(0, 3).map((name) => (
                <div
                  key={name}
                  title={name}
                  className="w-10 h-10 rounded-full bg-primary-container border-2 border-inverse-surface flex items-center justify-center text-label-l5 font-semibold text-on-primary-container"
                >
                  {name.slice(0, 2).toUpperCase()}
                </div>
              ))}
              {otherCustomers.length > 3 && (
                <div className="w-10 h-10 rounded-full bg-surface-container-high border-2 border-inverse-surface flex items-center justify-center text-label-l5 font-semibold text-on-surface">
                  +{otherCustomers.length - 3}
                </div>
              )}
            </div>
          </button>
        )}
      </section>

      {showOthersDetail && (
        <>
          <div
            className="fixed inset-0 bg-scrim z-[90] animate-[fade-in_0.2s_ease]"
            onClick={() => setShowOthersDetail(false)}
          />
          <div
            ref={othersSheetRef}
            role="dialog"
            aria-label="Others' orders"
            className="fixed left-0 right-0 bottom-0 max-h-[80vh] bg-surface-container-low rounded-t-l z-[100] flex flex-col shadow-[0_-4px_24px_var(--ds-shadow)] animate-[slide-up-drawer_0.3s_ease] will-change-transform"
          >
            <div {...othersHandleProps} className="flex justify-center py-s cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-4xl bg-outline-variant" />
            </div>

            <div className="flex items-center justify-between px-md pb-md border-b border-outline-variant">
              <h2 className="font-display text-display-h2 font-semibold text-primary-text">
                Others' Orders
              </h2>
              <button
                type="button"
                onClick={() => setShowOthersDetail(false)}
                aria-label="Close"
                className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <i className="mgc_close_line text-xl" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-md py-md flex flex-col gap-l">
              {othersByCustomer.map(([name, ordersForName]) => {
                const customerTotal = ordersForName.reduce(
                  (sum, o) => sum + o.total,
                  0,
                );
                const items = ordersForName.flatMap((o) => o.order_items);
                return (
                  <div key={name} className="flex flex-col gap-s">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-s">
                        <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-label-l5 font-semibold text-on-primary-container">
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-label-l3 font-semibold text-primary-text">
                          {name}
                        </span>
                      </div>
                      <span className="text-label-l4 font-semibold text-primary-text">
                        {formatCurrency(customerTotal)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-s">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-s">
                            <i className="mgc_fork_spoon_line text-xl text-primary" />
                            <div className="flex flex-col gap-0.5">
                              <span className="text-label-l3 font-semibold text-primary-text">
                                {item.name}
                              </span>
                              <span className="text-label-l5 text-secondary-text">
                                Qty {item.quantity}
                              </span>
                            </div>
                          </div>
                          <span className="text-label-l4 text-primary-text">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-md py-md border-t border-outline-variant flex items-center justify-between">
              <span className="text-label-l4 text-secondary-text">
                Others' Total
              </span>
              <span className="font-display text-display-h2 font-semibold text-primary-text">
                {formatCurrency(othersTotal)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const ORDER_STATUS_META: Record<OrderStatus, { label: string; cls: string }> = {
  CREATED: {
    label: "Sent",
    cls: "bg-surface-container-high text-on-surface-variant",
  },
  PREPARING: {
    label: "Preparing",
    cls: "bg-warning-container text-on-warning-container",
  },
  READY: {
    label: "Ready",
    cls: "bg-success-container text-on-success-container",
  },
  PAYMENT_PENDING: {
    label: "Awaiting payment",
    cls: "bg-warning-container text-on-warning-container",
  },
  CONFIRMED: {
    label: "Paid",
    cls: "bg-success-container text-on-success-container",
  },
  REFUNDED: {
    label: "Refunded",
    cls: "bg-surface-container-high text-outline",
  },
  CANCELLED: {
    label: "Cancelled",
    cls: "bg-error-container text-on-error-container",
  },
};

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, cls } = ORDER_STATUS_META[status];
  return (
    <span
      className={`text-caption-xs font-bold uppercase tracking-wider px-s py-xs rounded-4xl whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}

function ReorderButton({ item }: { item: OrderItem }) {
  const { addItem } = useCart();
  const modifiers = item.modifiers ?? [];

  /**
   * A past line can only go back in the cart if every choice on it still has
   * an id to order against. The API returns `option_id` now, but orders placed
   * before it did have none — and a line reordered "close enough" puts food on
   * a bill the guest did not pick, which is worse than making them tap twice.
   */
  /**
   * Two things have to be recoverable: which dish this was, and which options.
   *
   * `item.id` is the *line's* id, not the dish's — sending it as the menu item
   * is why reordering failed with "something went wrong". `menu_item_id` is
   * what the API has always returned for this.
   */
  const reconstructable =
    Boolean(item.menu_item_id) && modifiers.every((m) => Boolean(m.option_id));

  if (!reconstructable) {
    return (
      <span
        className="text-caption-xs text-secondary-text"
        title="This item had choices we can no longer identify — add it from the menu to pick them again."
      >
        Reorder from menu
      </span>
    );
  }

  // `item.price` is per-unit **including** the deltas the server resolved, and
  // the cart wants the base — sending the resolved figure would charge every
  // modifier twice, once here and once again server-side.
  const deltas = modifiers.reduce((sum, m) => sum + m.price_delta, 0);

  return (
    <AddButton
      label="REORDER"
      onClick={() =>
        addItem(
          {
            menuItemId: item.menu_item_id!,
            name: item.name,
            basePrice: item.price - deltas,
            modifiers: modifiers.map((m) => ({
              option_id: m.option_id!,
              group_name: m.name,
              option_name: m.option,
              price_delta: m.price_delta,
            })),
          },
          item.quantity,
        )
      }
    />
  );
}
