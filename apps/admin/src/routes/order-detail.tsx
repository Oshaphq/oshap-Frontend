import { useState } from "react";
import { Link, useParams } from "react-router";
import {
  formatCurrency,
  nairaToKobo,
  useAdminCompOrderItem,
  useAdminDiscountOrder,
  useAdminRefundOrder,
  useAdminTipOrder,
  useAdminUpdateOrderItem,
  useAdminVoidOrderItem,
  useOrder,
} from "@oshap/shared";
import { Button, SecondaryButton, toast } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";
import ReceiptSheet from "../components/ReceiptSheet";

type Adjustment = "discount" | "tip" | "refund";

/**
 * The bill, with the ability to correct it.
 *
 * Real service goes wrong in small ways — a dish sent back, a regular given
 * something off, a card charged twice — and without this the only way to fix a
 * bill is on paper, which is how a restaurant ends up running two systems.
 *
 * Every action here is destructive to a guest-visible number, so each is
 * two-step: choose, confirm, then it applies.
 */
export default function OrderDetailPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const order = useOrder(orderId);

  const discount = useAdminDiscountOrder();
  const tip = useAdminTipOrder();
  const refund = useAdminRefundOrder();
  const updateItem = useAdminUpdateOrderItem();
  const voidItem = useAdminVoidOrderItem();
  const compItem = useAdminCompOrderItem();

  const [openAdjustment, setOpenAdjustment] = useState<Adjustment | null>(null);
  const [amount, setAmount] = useState("");
  const [pendingItemAction, setPendingItemAction] = useState<string | null>(null);
  const [printingReceipt, setPrintingReceipt] = useState(false);

  const fail = (err: unknown, fallback: string) =>
    toast.error(err instanceof Error ? err.message : fallback);

  const closeAdjustment = () => {
    setOpenAdjustment(null);
    setAmount("");
  };

  const applyAdjustment = () => {
    const kobo = nairaToKobo(Number(amount));
    if (!Number.isFinite(kobo) || kobo <= 0) {
      toast.error("Enter an amount");
      return;
    }

    const done = (message: string) => () => {
      closeAdjustment();
      toast.success(message);
    };

    if (openAdjustment === "discount") {
      discount.mutate(
        { orderId, payload: { amount: kobo } },
        { onSuccess: done("Discount applied"), onError: (e) => fail(e, "Could not apply discount") },
      );
    } else if (openAdjustment === "tip") {
      tip.mutate(
        { orderId, payload: { amount: kobo } },
        { onSuccess: done("Tip added"), onError: (e) => fail(e, "Could not add tip") },
      );
    } else if (openAdjustment === "refund") {
      refund.mutate(
        { orderId, payload: { amount: kobo } },
        { onSuccess: done("Refund recorded"), onError: (e) => fail(e, "Could not refund") },
      );
    }
  };

  if (order.isError) return <QueryError error={order.error} action="load the order" onRetry={() => order.refetch()} />;

  if (order.isLoading || !order.data) {
    return (
      <div className="flex justify-center py-xl">
        <div className="oshap-spinner" />
      </div>
    );
  }

  const data = order.data;
  const isSettled = data.status === "CONFIRMED";
  // A refunded bill was paid then handed back; a cancelled one was never paid.
  // Both are closed to further changes, but they read differently to staff.
  const isRefunded = data.status === "REFUNDED";
  const isClosed = isRefunded || data.status === "CANCELLED";
  const busy =
    discount.isPending || tip.isPending || refund.isPending ||
    updateItem.isPending || voidItem.isPending || compItem.isPending;

  return (
    <main className="p-md flex flex-col gap-l max-w-[42rem]">
      <header className="flex items-start gap-md">
        <Link
          to="/"
          aria-label="Back to tables"
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors no-underline"
        >
          <i className="mgc_left_line" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-title-large font-semibold text-on-surface truncate">
            {data.reference}
          </h1>
          <p className="text-body-medium text-on-surface-variant">
            Table {data.table} · {data.status}
          </p>
        </div>
        <SecondaryButton size="md" onClick={() => setPrintingReceipt(true)}>
          <i className="mgc_print_line" /> Receipt
        </SecondaryButton>
      </header>

      {printingReceipt && (
        <ReceiptSheet orderId={orderId} onDone={() => setPrintingReceipt(false)} />
      )}

      {isClosed && (
        <div className="flex items-start gap-s p-md rounded-sm bg-error-container text-on-error-container">
          <i className="mgc_alert_line text-xl shrink-0 mt-0.5" />
          <p className="text-label-medium">
            {isRefunded
              ? "This bill was refunded. It no longer counts towards the day's takings."
              : "This order was cancelled. It was never paid for."}
          </p>
        </div>
      )}

      <section className="bg-surface-container-low rounded-lg p-l flex flex-col gap-md">
        <h2 className="text-title-large font-semibold text-on-surface">Items</h2>
        <div className="flex flex-col">
          {data.items.map((item) => {
            const isComped = item.price === 0;
            const confirming = pendingItemAction === item.id;
            return (
              <div
                key={item.id}
                className="flex flex-col gap-s py-s border-b border-outline-variant last:border-none"
              >
                <div className="flex items-center justify-between gap-md">
                  <span className="text-body-medium text-on-surface min-w-0">
                    <span className="tabular-nums text-on-surface-variant">
                      {item.quantity}×{" "}
                    </span>
                    {item.name}
                    {isComped && (
                      <span className="ml-s px-s py-0.5 rounded-full bg-success-container text-on-success-container text-label-small font-semibold uppercase tracking-wider">
                        Comped
                      </span>
                    )}
                  </span>
                  <span className="text-title-medium font-semibold text-on-surface tabular-nums shrink-0">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>

                {!isSettled && !isClosed && (
                  <div className="flex items-center gap-md">
                    {confirming ? (
                      <>
                        <span className="text-body-medium text-on-surface-variant">
                          Remove or comp this line?
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            compItem.mutate(
                              { orderId, itemId: item.id },
                              {
                                onSuccess: () => {
                                  setPendingItemAction(null);
                                  toast.success(`${item.name} comped`);
                                },
                                onError: (e) => fail(e, "Could not comp the item"),
                              },
                            )
                          }
                          className="text-body-medium font-semibold text-primary-label hover:underline disabled:opacity-50"
                        >
                          Comp
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            voidItem.mutate(
                              { orderId, itemId: item.id },
                              {
                                onSuccess: () => {
                                  setPendingItemAction(null);
                                  toast.success(`${item.name} removed`);
                                },
                                onError: (e) => fail(e, "Could not remove the item"),
                              },
                            )
                          }
                          className="text-body-medium font-semibold text-error hover:underline disabled:opacity-50"
                        >
                          Void
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingItemAction(null)}
                          className="text-body-medium text-on-surface-variant hover:underline"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busy || item.quantity <= 1}
                          onClick={() =>
                            updateItem.mutate({
                              orderId,
                              itemId: item.id,
                              payload: { quantity: item.quantity - 1 },
                            })
                          }
                          className="text-body-medium text-on-surface-variant hover:underline disabled:opacity-30"
                        >
                          −1
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            updateItem.mutate({
                              orderId,
                              itemId: item.id,
                              payload: { quantity: item.quantity + 1 },
                            })
                          }
                          className="text-body-medium text-on-surface-variant hover:underline disabled:opacity-30"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingItemAction(item.id)}
                          className="text-body-medium text-on-surface-variant hover:underline ml-auto"
                        >
                          Remove…
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-surface-container-low rounded-lg p-l flex flex-col gap-md">
        <h2 className="text-title-large font-semibold text-on-surface">Bill</h2>
        <div className="flex flex-col">
          <Line label="Subtotal" value={data.subtotal ?? data.total} />
          {(data.discount ?? 0) > 0 && <Line label="Discount" value={-(data.discount ?? 0)} />}
          {(data.service_charge ?? 0) > 0 && (
            <Line label="Service charge" value={data.service_charge ?? 0} />
          )}
          {(data.vat ?? 0) > 0 && <Line label="VAT" value={data.vat ?? 0} />}
          {(data.tip ?? 0) > 0 && <Line label="Tip" value={data.tip ?? 0} />}
          <div className="flex items-center justify-between gap-md pt-md mt-s border-t-2 border-ink">
            <span className="text-title-large font-semibold text-on-surface">Total</span>
            <span className="font-display text-title-large font-semibold text-primary-label tabular-nums">
              {formatCurrency(data.total)}
            </span>
          </div>
        </div>
      </section>

      {!isClosed && (
        <section className="bg-surface-container-low rounded-lg p-l flex flex-col gap-md">
          <h2 className="text-title-large font-semibold text-on-surface">Adjust</h2>

          {openAdjustment ? (
            <div className="flex flex-col gap-s">
              <label className="text-body-medium font-semibold text-on-surface" htmlFor="adjust-amount">
                {openAdjustment === "discount"
                  ? "Discount amount"
                  : openAdjustment === "tip"
                    ? "Tip amount"
                    : "Refund amount"}
              </label>
              <input
                id="adjust-amount"
                type="number"
                inputMode="decimal"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount in ₦"
                className="w-full px-md py-s rounded-sm bg-surface-container border border-outline-variant text-body-medium text-on-surface placeholder:text-outline outline-none focus:border-primary transition-colors"
              />
              {openAdjustment === "refund" && (
                <p className="text-body-medium text-on-surface-variant">
                  Refunding removes this order from the day&rsquo;s takings.
                </p>
              )}
              <div className="flex justify-end gap-s">
                <SecondaryButton size="md" onClick={closeAdjustment}>
                  Cancel
                </SecondaryButton>
                {/* One button, three jobs. Only a refund is destructive — it
                    removes the order from the day's takings, which the copy
                    above already warns about — so only that one wears error. */}
                <Button
                  variant={openAdjustment === "refund" ? "destructive" : "filled"}
                  size="md"
                  onClick={applyAdjustment}
                  disabled={busy}
                >
                  {busy ? "Applying…" : "Apply"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-s">
              {!isSettled && (
                <SecondaryButton size="md" onClick={() => setOpenAdjustment("discount")}>
                  Discount
                </SecondaryButton>
              )}
              <SecondaryButton size="md" onClick={() => setOpenAdjustment("tip")}>
                Add tip
              </SecondaryButton>
              {isSettled && (
                <SecondaryButton size="md" onClick={() => setOpenAdjustment("refund")}>
                  Refund
                </SecondaryButton>
              )}
            </div>
          )}

          {isSettled && (
            <p className="text-body-medium text-on-surface-variant">
              This bill is settled — items can no longer be changed, only refunded.
            </p>
          )}
        </section>
      )}
    </main>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  const isDeduction = value < 0;
  return (
    <div className="flex items-center justify-between gap-md py-s border-b border-outline-variant last:border-none">
      <span className="text-body-medium text-on-surface-variant">{label}</span>
      <span
        className={`text-title-medium font-semibold tabular-nums ${
          isDeduction ? "text-error" : "text-on-surface"
        }`}
      >
        {isDeduction ? `− ${formatCurrency(-value)}` : formatCurrency(value)}
      </span>
    </div>
  );
}
