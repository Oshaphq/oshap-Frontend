import { useNavigate, useSearchParams } from "react-router";
import {
  computeOrderTotals,
  formatCurrency,
  getDeviceToken,
  useCreateOrder,
  useTable,
} from "@oshap/shared";
import { CartProvider, unitPrice, useCart } from "../context/CartContext";
import { useSession } from "../context/SessionContext";
import CustomerHeader from "../components/CustomerHeader";
import BillBreakdown from "../components/BillBreakdown";
import {
  EmptyState,
  IconButton,
  PrimaryButton,
  toast,
} from "@oshap/shared/ui";

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

  // Computed with the server's own formula rather than shown as an estimate:
  // same integer arithmetic, same basis-point rates off the restaurant, so
  // this is the figure that will be charged. Before this, the screen printed
  // the subtotal twice and called the second one "Total", which understated
  // what the guest was agreeing to by the VAT and service charge.
  const totals = computeOrderTotals(totalPrice, {
    vat_rate: tableQuery.data?.restaurant?.vat_rate,
    service_charge_rate: tableQuery.data?.restaurant?.service_charge_rate,
  });

  const handleConfirmOrder = async () => {
    const restaurantId = tableQuery.data?.restaurant?.id;
    // The URL carries the table's uuid, but POST /orders records the order
    // against the table's NAME — the two endpoints take different
    // identifiers, and sending the uuid here returns 404.
    const tableName = tableQuery.data?.table_id;
    if (!restaurantId || !tableName) {
      toast.error("Could not load table details. Please refresh and try again.");
      return;
    }

    try {
      const { order_id } = await createOrder.mutateAsync({
        table: tableName,
        restaurant_id: restaurantId,
        // `price` is the dish's BASE price. The server adds each option's
        // delta itself, so sending unitPrice() here would charge every
        // modifier twice.
        items: items.map((i) => ({
          name: i.name,
          qty: i.quantity,
          price: i.basePrice,
          menu_item_id: i.menuItemId,
          notes: i.notes,
          modifiers: i.modifiers.map((m) => ({ option_id: m.option_id })),
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
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to place order. Please try again.",
      );
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-surface-container-low pb-[var(--app-bottom-inset)]">
        <CustomerHeader
          tableId={tableId}
          title="Confirm Order"
          leftSlot={
            <IconButton
              variant="surface"
              icon="mgc_left_line"
              aria-label="Back to menu"
              onClick={() => navigate(`/menu?table=${tableId}`)}
            />
          }
        />
        <EmptyState
          icon="mgc_clipboard_line"
          title="No items yet"
          message="Add items from the menu to place your order."
        >
          <PrimaryButton
            size="md"
            onClick={() => navigate(`/menu?table=${tableId}`)}
          >
            Browse Menu
          </PrimaryButton>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-low pb-[var(--app-bottom-inset)]">
      <CustomerHeader
        tableId={tableId}
        title="Confirm Order"
        leftSlot={
          <IconButton
            variant="surface"
            icon="mgc_left_line"
            aria-label="Back to menu"
            onClick={() => navigate(`/menu?table=${tableId}`)}
          />
        }
      />

      <BillBreakdown
        heading="Order Summary"
        items={items.map((item) => ({
          id: item.lineId,
          name: item.modifiers.length
            ? `${item.name} (${item.modifiers.map((m) => m.option_name).join(", ")})`
            : item.name,
          quantity: item.quantity,
          price: unitPrice(item),
        }))}
        subtotal={totals.subtotal}
        serviceCharge={totals.service_charge}
        vat={totals.vat}
        total={totals.total}
      />

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

