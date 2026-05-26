import { useNavigate, useSearchParams } from "react-router";
import {
  formatCurrency,
  getDeviceToken,
  useCreateOrder,
  useTable,
} from "@oshap/shared";
import { CartProvider, useCart } from "../context/CartContext";
import { useSession } from "../context/SessionContext";
import { PrimaryButton, TableBadge } from "@oshap/shared/ui";

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const tableId = params.get("table") ?? "T1";

  return (
    <CartProvider tableId={tableId}>
      <CheckoutView tableId={tableId} />
    </CartProvider>
  );
}

function CheckoutView({ tableId }: { tableId: string }) {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const { session, customerName } = useSession();
  const deviceToken = getDeviceToken();

  const tableQuery = useTable({ tableId, deviceToken, sessionId: session?.id });
  const createOrder = useCreateOrder();

  const handleConfirmOrder = async () => {
    const restaurantId = tableQuery.data?.restaurant?.id;
    if (!restaurantId) {
      alert("Could not load table details. Please refresh and try again.");
      return;
    }

    try {
      const { order_id } = await createOrder.mutateAsync({
        table: tableId,
        restaurant_id: restaurantId,
        items: items.map((i) => ({
          name: i.name,
          qty: i.quantity,
          price: i.price,
        })),
        session_id: session?.id ?? undefined,
        customer_name: customerName || undefined,
        device_token: deviceToken,
      });

      // Track order IDs for unclaimed-order claim flow when joining sessions.
      const idsKey = `oshap-my-order-ids-${tableId}`;
      const stored = JSON.parse(
        window.sessionStorage.getItem(idsKey) ?? "[]",
      ) as string[];
      stored.push(order_id);
      window.sessionStorage.setItem(idsKey, JSON.stringify(stored));

      clearCart();
      navigate(`/orders?table=${tableId}`);
    } catch (err) {
      console.error("Order error:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to place order. Please try again.",
      );
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-surface-container-low pb-20">
        <CheckoutHeader
          tableId={tableId}
          onBack={() => navigate(`/menu?table=${tableId}`)}
        />
        <div className="flex flex-col items-center gap-l py-10 px-md text-center">
          <div className="flex flex-col items-center gap-s">
            <i className="mgc_clipboard_line text-5xl text-outline-variant" />
            <span className="font-display text-display-h4 font-semibold text-primary-text">
              No items yet
            </span>
            <p className="text-p2 text-secondary-text max-w-sm">
              Add items from the menu to place your order.
            </p>
          </div>
          <PrimaryButton
            size="md"
            onClick={() => navigate(`/menu?table=${tableId}`)}
          >
            Browse Menu
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-low pb-20">
      <CheckoutHeader
        tableId={tableId}
        onBack={() => navigate(`/menu?table=${tableId}`)}
      />

      <section className="py-l px-md bg-surface-container-low border-b-[6px] border-surface-container flex flex-col gap-md">
        <h2 className="font-display text-display-h3 font-semibold text-primary-text">
          Order Summary
        </h2>

        <div className="flex flex-col gap-md">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-md"
            >
              <div className="flex items-center gap-s flex-1 min-w-0">
                <i className="mgc_fork_spoon_line text-xl text-outline-variant" />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-label-l3 font-semibold text-primary-text truncate">
                    {item.name}
                  </span>
                  <span className="text-label-l5 text-secondary-text">
                    Qty {item.quantity}
                  </span>
                </div>
              </div>
              <span className="text-label-l3 font-semibold text-primary-text shrink-0">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="py-l px-md bg-surface-container-low border-b-[6px] border-surface-container flex flex-col gap-s">
        <div className="flex justify-between items-center">
          <span className="text-label-l4 text-secondary-text">Subtotal</span>
          <span className="text-label-l4 text-primary-text">
            {formatCurrency(totalPrice)}
          </span>
        </div>
        <div className="h-px bg-outline-variant" />
        <div className="flex justify-between items-center">
          <span className="text-label-l3 font-semibold text-primary-text">
            Total
          </span>
          <span className="font-display text-display-h2 font-semibold text-primary-text">
            {formatCurrency(totalPrice)}
          </span>
        </div>
      </section>

      <section className="py-l px-md bg-surface-container-low">
        <PrimaryButton
          onClick={handleConfirmOrder}
          disabled={createOrder.isPending}
          className="w-full"
        >
          {createOrder.isPending ? "Placing Order…" : "Confirm Order"}
        </PrimaryButton>
      </section>
    </div>
  );
}

function CheckoutHeader({
  tableId,
  onBack,
}: {
  tableId: string;
  onBack: () => void;
}) {
  return (
    <header className="flex items-center justify-between pt-md px-md pb-s bg-surface-container-low">
      <div className="flex items-center gap-s">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to menu"
          className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container hover:bg-surface-container-high transition-colors"
        >
          <i className="mgc_left_line text-xl" />
        </button>
        <h1 className="font-display text-display-h2 font-semibold text-primary-text">
          Confirm Order
        </h1>
      </div>
      <TableBadge tableId={tableId} variant="outlined" />
    </header>
  );
}
