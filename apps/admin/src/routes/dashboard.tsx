import { useState } from "react";
import { Link } from "react-router";
import {
  useAdminTables,
  useAdminVerifyPayment,
  useAdminRejectPayment,
  useAdminCloseTable,
  useAdminInventoryAlerts,
  groupBills,
  formatCurrency,
  getAdminRestaurantId,
  errorMessage,
  describeError,
} from "@oshap/shared";
import type { AdminTableStatus, Bill } from "@oshap/shared";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";
import CashPaymentDialog from "../components/CashPaymentDialog";
import TableBills from "../components/TableBills";
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
  /**
   * Keyed by **bill**, not table, so a prompt opened on one guest's row cannot
   * appear over another's. On a shared table the table id names two bills, and
   * confirming the wrong one is the mistake this whole screen exists to stop.
   */
  const [rejectingBill, setRejectingBill] = useState<string | null>(null);
  const [verifyingBill, setVerifyingBill] = useState<string | null>(null);
  const [cashTarget, setCashTarget] = useState<
    { tableName: string; orderIds: string[]; total: number } | null
  >(null);

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
   * "Reject the payment on table 4" names nothing when two guests are sitting
   * there — which is why the server asks for an `order_id`, and why every
   * rejection failed while the board could only offer a table. It rejects the
   * claims on one bill now, so the wrong guest's money is never touched.
   */
  const handleReject = async (bill: Bill) => {
    try {
      for (const orderId of bill.claimedOrderIds) {
        await rejectPayment.mutateAsync({ order_id: orderId });
      }
      setRejectingBill(null);
      toast.success("Payment rejected — the bill is unpaid again");
    } catch (err) {
      setRejectingBill(null);
      toast.error(settledElsewhere(err) ? ALREADY_SETTLED : errorMessage(err, "reject the payment"));
    }
  };

  /**
   * Settles one bill, naming the order.
   *
   * `table_id` rides along because the API still wants it, and it is the
   * **name** rather than the uuid — body fields take names throughout. Sending
   * the uuid is what made every verify 404 and report "already settled".
   *
   * Without `order_id` the server settles every claim on the table, so on a
   * shared table one guest's transfer closed the other guest's bill.
   */
  const handleVerify = async (table: AdminTableStatus, bill: Bill) => {
    try {
      for (const orderId of bill.claimedOrderIds) {
        await verifyPayment.mutateAsync({
          table_id: table.table_id,
          order_id: orderId,
        });
      }
      setVerifyingBill(null);
      // Without this the row just leaves the pending list, which is
      // indistinguishable from the click never registering.
      toast.success(
        bill.guestName ? `${bill.guestName}'s payment verified` : "Payment verified",
      );
    } catch (err) {
      // Close the prompt either way. Leaving it open under a failure toast
      // invites a second confirm, which is how one refusal becomes two
      // attempts at the same bill.
      setVerifyingBill(null);
      toast.error(settledElsewhere(err) ? ALREADY_SETTLED : errorMessage(err, "verify the payment"));
    }
  };

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
          // Empty when the deployment predates `live_orders`; the card falls
          // back to the table totals below.
          const bills = groupBills(table.live_orders);
          const isClosing =
            closeTable.isPending &&
            closeTable.variables?.table_id === table.table_id;

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
                {isEmpty ? (
                  <p className="text-caption-md text-secondary-text">No active orders</p>
                ) : bills.length > 0 ? (
                  <TableBills
                    bills={bills}
                    renderActions={(bill) => (
                      <BillActions
                        bill={bill}
                        table={table}
                        rejectingBill={rejectingBill}
                        verifyingBill={verifyingBill}
                        setRejectingBill={setRejectingBill}
                        setVerifyingBill={setVerifyingBill}
                        onTakePayment={() =>
                          setCashTarget({
                            tableName: table.table_id,
                            orderIds: bill.unpaidOrderIds,
                            // The balance, so a part paid bill asks for what is
                            // left rather than for the whole thing again.
                            total: bill.balanceDue,
                          })
                        }
                        onVerify={() => handleVerify(table, bill)}
                        onReject={() => handleReject(bill)}
                        verifyPending={verifyPayment.isPending}
                        rejectPending={rejectPayment.isPending}
                      />
                    )}
                  />
                ) : (
                  /* No `live_orders` — an older deployment. Fall back to the
                     table totals, which cannot tell two guests apart but is
                     better than an empty card. */
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
                )}
              </div>

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
                  {bills.length > 1 ? (
                    /* Two bills open, so "they paid" names nothing. Sending the
                       waiter back to the row is the point of this screen. */
                    <p className="text-caption-xs text-secondary-text text-center">
                      Taking money? Use the bill above — this table has{" "}
                      {bills.length} open.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setClearPromptTable(null);
                        setCashTarget({
                          tableName: table.table_id,
                          orderIds: bills[0]?.unpaidOrderIds ?? table.unpaid_order_ids ?? [],
                          total: bills[0]?.total ?? table.unpaidTotal,
                        });
                      }}
                      className="flex items-center justify-center gap-s py-s rounded-lg font-bold text-caption-md bg-success text-on-success transition-all hover:opacity-90 active:scale-[0.98]"
                    >
                      <i className="mgc_wallet_4_line" />
                      They paid — record it
                    </button>
                  )}
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

      {cashTarget && (
        <CashPaymentDialog
          tableName={cashTarget.tableName}
          orderIds={cashTarget.orderIds}
          total={cashTarget.total}
          onClose={() => setCashTarget(null)}
        />
      )}
    </main>
  );
}

/**
 * The one action a bill is ready for, and the confirmation in front of it.
 *
 * Both confirmations are keyed by bill rather than table, so a prompt cannot
 * open over somebody else's row. Verify asks about the **amount** rather than
 * the action — "are you sure?" invites a reflex yes, while a figure asks the
 * only question that matters: is that what landed in the account.
 */
function BillActions({
  bill,
  table,
  rejectingBill,
  verifyingBill,
  setRejectingBill,
  setVerifyingBill,
  onTakePayment,
  onVerify,
  onReject,
  verifyPending,
  rejectPending,
}: {
  bill: Bill;
  table: AdminTableStatus;
  rejectingBill: string | null;
  verifyingBill: string | null;
  setRejectingBill: (key: string | null) => void;
  setVerifyingBill: (key: string | null) => void;
  onTakePayment: () => void;
  onVerify: () => void;
  onReject: () => void;
  verifyPending: boolean;
  rejectPending: boolean;
}) {
  if (bill.state === "settled" || bill.state === "unknown") return null;

  if (bill.state === "unpaid" || bill.state === "part") {
    return (
      <SecondaryButton size="md" className="w-full" onClick={onTakePayment}>
        <i className="mgc_cash_line" />{" "}
        {bill.state === "part" ? "Take the rest" : "Take payment"}
      </SecondaryButton>
    );
  }

  /**
   * A card request and a bank transfer need opposite things from staff, and
   * used to show the same tag and the same button. A waiter who guessed wrong
   * either walked a POS to a table that never asked for one, or left somebody
   * standing with a card in their hand.
   */
  const isCard = bill.paymentMethod === "POS";

  if (rejectingBill === bill.key) {
    return (
      <div className="flex flex-col gap-s">
        <p className="text-caption-xs text-secondary-text">
          Reject {bill.guestName ? `${bill.guestName}'s` : "this"} payment? The
          bill goes back to unpaid and this account is marked down.
        </p>
        <div className="flex gap-s">
          <SecondaryButton className="flex-1" onClick={() => setRejectingBill(null)}>
            Cancel
          </SecondaryButton>
          <PrimaryButton className="flex-1" onClick={onReject} disabled={rejectPending}>
            {rejectPending ? "Rejecting…" : "Confirm Reject"}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  if (verifyingBill === bill.key) {
    return (
      <div className="flex flex-col gap-s">
        <p className="text-caption-xs text-secondary-text">
          {isCard ? (
            <>
              Confirm{" "}
              <span className="font-bold text-primary-text">
                {formatCurrency(bill.balanceDue)}
              </span>{" "}
              went through on the machine for{" "}
              {bill.guestName ?? "this guest"}.
            </>
          ) : (
            <>
              Confirm{" "}
              <span className="font-bold text-primary-text">
                {formatCurrency(bill.balanceDue)}
              </span>{" "}
              from {bill.guestName ?? "this guest"} has landed in the account.
            </>
          )}{" "}
          This settles their bill and cannot be undone from here.
        </p>
        <div className="flex gap-s">
          <SecondaryButton className="flex-1" onClick={() => setVerifyingBill(null)}>
            Cancel
          </SecondaryButton>
          <PrimaryButton className="flex-1" onClick={onVerify} disabled={verifyPending}>
            {verifyPending ? "Verifying…" : "Yes, it's in"}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-s">
      <PrimaryButton
        className="flex-1"
        onClick={() => setVerifyingBill(bill.key)}
        disabled={verifyPending}
      >
        <i className={isCard ? "mgc_card_pay_line" : "mgc_bank_line"} />{" "}
        {isCard ? "POS paid" : "Verify"}
      </PrimaryButton>
      <SecondaryButton
        onClick={() => setRejectingBill(bill.key)}
        disabled={verifyPending}
        aria-label={`Reject ${bill.guestName ?? "this guest"}'s payment on ${table.table_id}`}
      >
        Reject
      </SecondaryButton>
    </div>
  );
}
