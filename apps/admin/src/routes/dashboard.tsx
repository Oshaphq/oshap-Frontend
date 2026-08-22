import { useState } from "react";
import { Link } from "react-router";
import {
  useAdminTables,
  useAdminVerifyPayment,
  useAdminRejectPayment,
  useAdminCloseTable,
  useAdminInventoryAlerts,
  formatCurrency,
  getAdminRestaurantId,
  errorMessage,
  describeError,
} from "@oshap/shared";
import type { AdminTableStatus } from "@oshap/shared";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";
import CashPaymentDialog from "../components/CashPaymentDialog";
import SetupChecklist from "../components/SetupChecklist";

/**
 * A 404 from verify or reject nearly always means this bill was settled while
 * the board was showing an older picture — someone else cleared it, or the
 * same person cleared it a moment ago and the row had not caught up.
 *
 * "Not found" is technically true and useless: it reads as a broken button.
 * Naming what happened, on a board that has just refreshed itself, tells a
 * waiter the bill is dealt with and they can move on.
 */
const ALREADY_SETTLED =
  "That bill was already settled — the board has been refreshed.";

function settledElsewhere(err: unknown): boolean {
  return describeError(err).kind === "notFound";
}

export default function DashboardPage() {
  const restaurantId = getAdminRestaurantId();
  const tablesQuery = useAdminTables();
  const verifyPayment = useAdminVerifyPayment();
  const rejectPayment = useAdminRejectPayment();
  const closeTable = useAdminCloseTable();
  const alertsQuery = useAdminInventoryAlerts();

  const [clearPromptTable, setClearPromptTable] = useState<string | null>(null);
  // Two-step, because rejecting is destructive from the guest's side: their
  // bill returns to unpaid and the account they used is marked down.
  const [rejectingTableId, setRejectingTableId] = useState<string | null>(null);
  const [cashTableId, setCashTableId] = useState<string | null>(null);

  if (tablesQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-secondary-text">
        <div className="oshap-spinner" />
        <p>Loading tables...</p>
      </div>
    );
  }

  if (tablesQuery.isError) {
    return <QueryError error={tablesQuery.error} action="load the tables" onRetry={() => tablesQuery.refetch()} />;
  }

  const tables = tablesQuery.data?.tables ?? [];
  const activeTablesCount = tables.filter((t) => t.hasPending || t.hasUnpaid).length;
  const pendingCount = tables.filter((t) => t.hasPending).length;

  /**
   * Rejection is per order, because payment is.
   *
   * Two guests at one table pay separately, so "reject the payment on table 4"
   * names nothing — which is why the server asks for an `order_id` and why
   * every rejection was failing. Until the tables endpoint returns each bill,
   * we can only act when the table has exactly one, and guessing is not an
   * option here: the wrong choice puts a real guest's bill back to unpaid and
   * marks down the account they paid from.
   */
  const handleReject = async (table: AdminTableStatus) => {
    const orderIds = table.unpaid_order_ids ?? [];
    if (orderIds.length !== 1) {
      setRejectingTableId(null);
      toast.error(
        orderIds.length === 0
          ? "There's no open bill on this table to reject."
          : `${table.table_id} has ${orderIds.length} separate bills. Open the table to reject the right one — rejecting the wrong guest's payment is not something to guess at.`,
      );
      return;
    }
    try {
      await rejectPayment.mutateAsync({ order_id: orderIds[0]! });
      setRejectingTableId(null);
      toast.success("Payment rejected — the bill is unpaid again");
    } catch (err) {
      toast.error(settledElsewhere(err) ? ALREADY_SETTLED : errorMessage(err, "reject the payment"));
    }
  };

  /**
   * Takes the table, not an id, because the table has two of them and only one
   * is right here.
   *
   * `table.id` is the uuid a QR code encodes and `GET /table/{id}` takes.
   * `table.table_id` is the name staff read. Body fields take the **name** —
   * this sent the uuid, so every verify 404'd and reported "that bill was
   * already settled", which is what a 404 means everywhere else on this screen.
   */
  const handleVerify = async (table: AdminTableStatus) => {
    try {
      await verifyPayment.mutateAsync({ table_id: table.table_id });
      // Without this the row just leaves the pending list, which is
      // indistinguishable from the click never registering.
      toast.success("Payment verified");
    } catch (err) {
      toast.error(settledElsewhere(err) ? ALREADY_SETTLED : errorMessage(err, "verify the payment"));
    }
  };

  /**
   * Only ever "they left without paying" now.
   *
   * The other option used to be "Paid (Cash/Transfer)", which called this with
   * `reason: "paid"`. That does settle the bill — the order moves to CONFIRMED
   * with a verified payment for the full amount — but it records **how** the
   * money arrived nowhere, and no tendered amount, so nothing can be
   * reconciled against a till afterwards.
   *
   * Taking money now always goes through the cash dialog, which posts to
   * `/admin/orders/cash`: per order, with the amount handed over, and the order
   * marked `payment_method: CASH`. Closing a table and taking payment are
   * different acts and were sharing a button.
   */
  const handleAbandon = async (table: AdminTableStatus) => {
    setClearPromptTable(null);
    try {
      // The name again, for the same reason as verify above.
      await closeTable.mutateAsync({ table_id: table.table_id, reason: "abandoned" });
      toast.success("Table cleared — recorded as unpaid");
    } catch (err) {
      toast.error(errorMessage(err, "clear the table"));
    }
  };

  const hasPending = pendingCount > 0;
  const lowStockCount = alertsQuery.data?.alerts.length ?? 0;
  const hasLowStock = lowStockCount > 0;

  return (
    <main className="p-md flex flex-col gap-l">
      {restaurantId && <SetupChecklist restaurantId={restaurantId} />}
      <header className="flex items-center justify-between">
        <h1 className="font-display text-display-h2 font-semibold text-primary-text">
          Waiter Dashboard
        </h1>
        <SecondaryButton
          size="md"
          onClick={() => tablesQuery.refetch()}
          disabled={tablesQuery.isRefetching}
        >
          <i
            className={
              tablesQuery.isRefetching
                ? "mgc_loading_line animate-spin"
                : "mgc_refresh_3_line"
            }
          />{" "}
          {tablesQuery.isRefetching ? "Refreshing…" : "Refresh"}
        </SecondaryButton>
      </header>

      <div className="flex gap-md flex-wrap">
        <div className="flex-1 min-w-[120px] bg-surface-container-low rounded-md p-md flex flex-col items-center gap-xs">
          <span className="font-display text-display-h2 font-semibold text-primary block">
            {activeTablesCount}
          </span>
          <span className="text-caption-sm font-medium text-secondary-text uppercase tracking-wider">
            Active Tables
          </span>
        </div>
        <div
          className={`flex-1 min-w-[120px] rounded-md p-md flex flex-col items-center gap-xs border ${
            hasPending
              ? "bg-warning-container border-warning"
              : "bg-surface-container-low border-transparent"
          }`}
        >
          <span
            className={`font-display text-display-h2 font-semibold block ${
              hasPending ? "text-on-warning-container" : "text-primary"
            }`}
          >
            {pendingCount}
          </span>
          <span
            className={`text-caption-sm font-medium uppercase tracking-wider ${
              hasPending ? "text-on-warning-container" : "text-secondary-text"
            }`}
          >
            Payments to Verify
          </span>
        </div>
        <Link
          to="/menu"
          className={`flex-1 min-w-[120px] rounded-md p-md flex flex-col items-center gap-xs border no-underline transition-colors ${
            hasLowStock
              ? "bg-error-container border-error hover:opacity-90"
              : "bg-surface-container-low border-transparent hover:border-outline-variant"
          }`}
        >
          <span
            className={`font-display text-display-h2 font-semibold block ${
              hasLowStock ? "text-on-error-container" : "text-primary"
            }`}
          >
            {lowStockCount}
          </span>
          <span
            className={`text-caption-sm font-medium uppercase tracking-wider ${
              hasLowStock ? "text-on-error-container" : "text-secondary-text"
            }`}
          >
            Low Stock Items
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
        {tables.map((table) => {
          const isPending = table.hasPending;
          const isUnpaid = table.hasUnpaid;
          const isEmpty = !isPending && !isUnpaid;
          const isVerifying =
            verifyPayment.isPending && verifyPayment.variables?.table_id === table.id;
          const isClosing =
            closeTable.isPending && closeTable.variables?.table_id === table.id;

          const cardCls = isPending
            ? "bg-warning-container border-warning"
            : !isEmpty
              ? "bg-surface-container-low border-outline-variant"
              : "bg-surface-container-low border-transparent";

          return (
            <div
              key={table.id}
              className={`rounded-md p-md flex flex-col gap-s border transition-colors min-h-[120px] ${cardCls}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-display-h3 font-semibold text-primary-text">
                  {table.table_id}
                </span>
                {isPending ? (
                  <span className="px-s py-xs rounded-4xl font-bold text-caption-xs uppercase tracking-wider whitespace-nowrap bg-warning text-on-warning">
                    Verification Req.
                  </span>
                ) : isUnpaid ? (
                  <span className="px-s py-xs rounded-4xl font-bold text-caption-xs uppercase tracking-wider whitespace-nowrap bg-error-container text-on-error-container">
                    Dining
                  </span>
                ) : (
                  <span className="px-s py-xs rounded-4xl font-bold text-caption-xs uppercase tracking-wider whitespace-nowrap bg-surface-container-high text-outline">
                    Empty
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-xs flex-1">
                {!isEmpty ? (
                  <>
                    {isUnpaid && (
                      <p className="text-caption-md text-secondary-text">
                        Current Bill:{" "}
                        <span className="font-bold text-primary-text">
                          {formatCurrency(table.unpaidTotal)}
                        </span>
                      </p>
                    )}
                    {isPending && (
                      <p className="text-caption-md text-on-warning-container">
                        Claimed:{" "}
                        <span className="font-bold">
                          {formatCurrency(table.pendingTotal)}
                        </span>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-caption-md text-secondary-text">No active orders</p>
                )}
              </div>

              {/* `table.id` — the uuid — is right here: the cash dialog fetches
                  GET /table/{id}, which is a path param. Verify and close take
                  the name instead. */}
              {isUnpaid && !isPending && (
                <SecondaryButton
                  className="w-full"
                  onClick={() => setCashTableId(table.id)}
                >
                  <i className="mgc_cash_line" /> Take Cash
                </SecondaryButton>
              )}

              {isPending &&
                (rejectingTableId === table.id ? (
                  <div className="flex flex-col gap-s">
                    <p className="text-caption-md text-secondary-text">
                      Reject this payment? The bill goes back to unpaid and this
                      account is marked down.
                    </p>
                    <div className="flex gap-s">
                      <SecondaryButton
                        className="flex-1"
                        onClick={() => setRejectingTableId(null)}
                      >
                        Cancel
                      </SecondaryButton>
                      <PrimaryButton
                        className="flex-1"
                        onClick={() => handleReject(table)}
                        disabled={rejectPayment.isPending}
                      >
                        {rejectPayment.isPending ? "Rejecting…" : "Confirm Reject"}
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-s">
                    <PrimaryButton
                      className="flex-1"
                      onClick={() => handleVerify(table)}
                      disabled={isVerifying}
                    >
                      {isVerifying ? "Verifying..." : "Verify Payment"}
                    </PrimaryButton>
                    <SecondaryButton
                      onClick={() => setRejectingTableId(table.id)}
                      disabled={isVerifying}
                    >
                      Reject
                    </SecondaryButton>
                  </div>
                ))}

              {!isEmpty && isClosing && (
                <div className="py-s text-center text-caption-md font-semibold text-secondary-text">
                  Clearing...
                </div>
              )}

              {!isEmpty && !isClosing && clearPromptTable !== table.id && (
                <SecondaryButton
                  size="md"
                  onClick={() => setClearPromptTable(table.id)}
                  className="w-full"
                >
                  Clear Table
                </SecondaryButton>
              )}

              {clearPromptTable === table.id && (
                <div className="flex flex-col gap-s pt-s border-t border-surface-container-high">
                  <span className="text-caption-sm font-semibold text-secondary-text text-center uppercase tracking-wider">
                    Why are you clearing?
                  </span>
                  {/* "Paid" settled the bill but recorded no method and no
                      tendered amount, so a manager could not reconcile it.
                      Taking money now goes through the cash dialog. */}
                  <button
                    type="button"
                    onClick={() => {
                      setClearPromptTable(null);
                      setCashTableId(table.id);
                    }}
                    className="flex items-center justify-center gap-s py-s rounded-lg font-bold text-caption-md bg-success text-on-success transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                    <i className="mgc_wallet_4_line" />
                    They paid — record it
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAbandon(table)}
                    className="flex items-center justify-center gap-s py-s rounded-lg font-bold text-caption-md border border-error text-error bg-transparent transition-all hover:bg-error/10 active:scale-[0.98]"
                  >
                    <i className="mgc_exit_line" />
                    Left without paying
                  </button>
                  <p className="text-caption-xs text-outline text-center">
                    Clearing as unpaid writes off {formatCurrency(table.unpaidTotal)}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setClearPromptTable(null)}
                    className="py-s text-center text-caption-sm font-medium text-outline bg-transparent border-none cursor-pointer hover:text-primary-text transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tables.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-s py-10 px-md text-center">
          <i className="mgc_table_line text-5xl text-outline-variant opacity-40" />
          <span className="font-display text-display-h4 font-semibold text-primary-text">
            No tables configured
          </span>
          <p className="text-p2 text-secondary-text">
            Add tables in your restaurant settings to get started.
          </p>
        </div>
      )}

      {cashTableId && (
        <CashPaymentDialog
          tableId={cashTableId}
          onClose={() => setCashTableId(null)}
        />
      )}
    </main>
  );
}
