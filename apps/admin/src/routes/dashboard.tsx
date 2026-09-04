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
import {
  Button,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  Spinner,
  Page,
  toast,
} from "@oshap/shared/ui";
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
  const [cashTarget, setCashTarget] = useState<{
    tableName: string;
    orderIds: string[];
    total: number;
  } | null>(null);

  if (tablesQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-on-surface-variant">
        <Spinner />
        <p>Loading tables...</p>
      </div>
    );
  }

  if (tablesQuery.isError) {
    return (
      <QueryError
        error={tablesQuery.error}
        action="load the tables"
        onRetry={() => tablesQuery.refetch()}
      />
    );
  }

  const tables = tablesQuery.data?.tables ?? [];
  const activeTablesCount = tables.filter((t) => tableState(t).busy).length;
  const pendingCount = tables.filter((t) => tableState(t).claimed).length;

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
      toast.error(
        settledElsewhere(err)
          ? ALREADY_SETTLED
          : errorMessage(err, "reject the payment"),
      );
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
        bill.guestName
          ? `${bill.guestName}'s payment verified`
          : "Payment verified",
      );
    } catch (err) {
      // Close the prompt either way. Leaving it open under a failure toast
      // invites a second confirm, which is how one refusal becomes two
      // attempts at the same bill.
      setVerifyingBill(null);
      toast.error(
        settledElsewhere(err)
          ? ALREADY_SETTLED
          : errorMessage(err, "verify the payment"),
      );
    }
  };

  const handleAbandon = async (table: AdminTableStatus) => {
    setClearPromptTable(null);
    try {
      // The name again, for the same reason as verify above.
      await closeTable.mutateAsync({
        table_id: table.table_id,
        reason: "abandoned",
      });
      toast.success("Table cleared — recorded as unpaid");
    } catch (err) {
      toast.error(errorMessage(err, "clear the table"));
    }
  };

  const hasPending = pendingCount > 0;
  const lowStockCount = alertsQuery.data?.alerts.length ?? 0;
  const hasLowStock = lowStockCount > 0;

  return (
    <Page width="wide" gap="l">
      {restaurantId && <SetupChecklist restaurantId={restaurantId} />}
      <header className="flex items-center justify-between">
        <h1 className="font-display text-title-large font-semibold text-on-surface">
          Waiter Dashboard
        </h1>
        <Button
          variant="text"
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
        </Button>
      </header>

      {/* Stat cards, per the Figma extract of this screen.
          Three things it specifies that the code did not do:
          the label carries a **designed** line break rather than wrapping
          wherever it lands, it is centred, and it takes the card's own
          foreground colour instead of a flat secondary grey. Together those
          keep the three cards the same height and stop the ragged wrap that
          made "PAYMENTS TO VERIFY" look broken on a phone. */}
      <div className="flex gap-s sm:gap-md flex-wrap">
        <StatCard
          value={activeTablesCount}
          label={["ACTIVE", "TABLES"]}
          tone="plain"
        />
        <StatCard
          value={pendingCount}
          label={["PAYMENTS TO", "VERIFY"]}
          tone={hasPending ? "warning" : "plain"}
        />
        <StatCard
          value={lowStockCount}
          label={["LOW STOCK", "ITEMS"]}
          tone={hasLowStock ? "error" : "plain"}
          to="/menu"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
        {tables.map((table) => {
          const bills = groupBills(table.live_orders);
          const { busy: isUnpaid, claimed: isPending } = tableState(table);
          const isEmpty = !isUnpaid;
          const isClosing =
            closeTable.isPending &&
            closeTable.variables?.table_id === table.table_id;

          const cardCls = isPending
            ? "bg-warning-container border-warning"
            : !isEmpty
              ? "bg-surface-container-low border-outline-variant"
              : /* A faint border rather than none. A transparent one made an
                   empty table a floating block with no edge, so a row of them
                   ran together — the extract draws the outline either way and
                   only changes its weight. */
                "bg-surface-container-low border-surface-container";

          return (
            <div
              key={table.id}
              className={`rounded-lg p-md flex flex-col gap-s border transition-colors min-h-[120px] ${cardCls}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-title-medium font-semibold text-on-surface">
                  {table.table_id}
                </span>
                {isPending ? (
                  <StatusBadge tone="warning">Verification Req.</StatusBadge>
                ) : isUnpaid ? (
                  <StatusBadge tone="error">Dining</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Empty</StatusBadge>
                )}
              </div>

              <div className="flex flex-col gap-xs flex-1">
                {isEmpty ? (
                  <p className="text-body-medium text-on-surface-variant">
                    No active orders
                  </p>
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
                      <p className="text-body-medium text-on-surface-variant">
                        Current Bill:{" "}
                        <span className="font-bold text-on-surface">
                          {formatCurrency(table.unpaidTotal)}
                        </span>
                      </p>
                    )}
                    {isPending && (
                      <p className="text-body-medium text-on-warning-container">
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
                <div className="py-s text-center text-body-medium font-semibold text-on-surface-variant">
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
                  <span className="text-body-small font-semibold text-on-surface-variant text-center uppercase tracking-wider">
                    Why are you clearing?
                  </span>
                  {/* "Paid" settled the bill but recorded no method and no
                      tendered amount, so a manager could not reconcile it.
                      Taking money now goes through the cash dialog. */}
                  {bills.length > 1 ? (
                    /* Two bills open, so "they paid" names nothing. Sending the
                       waiter back to the row is the point of this screen. */
                    <p className="text-label-small text-on-surface-variant text-center">
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
                          orderIds:
                            bills[0]?.unpaidOrderIds ??
                            table.unpaid_order_ids ??
                            [],
                          total: bills[0]?.total ?? table.unpaidTotal,
                        });
                      }}
                      className="flex items-center justify-center gap-s py-s rounded-sm font-bold text-body-medium bg-success text-on-success transition-all hover:opacity-90 active:scale-[0.98]"
                    >
                      <i className="mgc_wallet_4_line" />
                      They paid — record it
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAbandon(table)}
                    className="flex items-center justify-center gap-s py-s rounded-sm font-bold text-body-medium border border-error text-error bg-transparent transition-all hover:bg-error/10 active:scale-[0.98]"
                  >
                    <i className="mgc_exit_line" />
                    Left without paying
                  </button>
                  {/* Money already taken against an open bill is the case
                      that bites: writing it off as abandoned cancels the order
                      and the payment stays on the books with nothing to match
                      it. Two orders at Jobiz went this way. */}
                  {bills.some((b) => b.amountPaid > 0 && b.balanceDue > 0) ? (
                    <p className="text-label-small text-on-warning-container bg-warning-container rounded-sm p-s text-center">
                      Careful — money has already been taken on this table.
                      Clearing as unpaid cancels the order and leaves that
                      payment with nothing to match it. Take the rest instead.
                    </p>
                  ) : (
                    <p className="text-label-small text-outline text-center">
                      Clearing as unpaid writes off{" "}
                      {formatCurrency(
                        bills.length > 0
                          ? bills.reduce((sum, b) => sum + b.balanceDue, 0)
                          : (table.outstanding_total ?? table.unpaidTotal),
                      )}
                      .
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setClearPromptTable(null)}
                    className="py-s text-center text-body-small font-medium text-outline bg-transparent border-none cursor-pointer hover:text-on-surface transition-colors"
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
        <EmptyState
          icon="mgc_table_line"
          title="No tables configured"
          message="Add tables in your restaurant settings to get started."
        />
      )}

      {cashTarget && (
        <CashPaymentDialog
          tableName={cashTarget.tableName}
          orderIds={cashTarget.orderIds}
          total={cashTarget.total}
          onClose={() => setCashTarget(null)}
        />
      )}
    </Page>
  );
}

/**
 * One figure on the dashboard, at a glance.
 *
 * `label` arrives as one string per line, because the break is a design
 * decision rather than a consequence of the width — all three cards stay the
 * same height and the wrap never lands mid-phrase. Passing the lines beats a
 * `
` in a string: it survives formatting, and it reads as the intent.
 *
 * The label takes the card's foreground rather than a flat grey, so a lit card
 * reads as one block of colour instead of a bright number over dim text.
 */
function StatCard({
  value,
  label,
  tone,
  to,
}: {
  value: number;
  /** One entry per line. The break is designed, not a consequence of width. */
  label: readonly string[];
  tone: "plain" | "warning" | "error";
  to?: string;
}) {
  const surface =
    tone === "warning"
      ? "bg-warning-container border-warning"
      : tone === "error"
        ? "bg-error-container border-error"
        : "bg-surface-container-low border-transparent";
  const ink =
    tone === "warning"
      ? "text-on-warning-container"
      : tone === "error"
        ? "text-on-error-container"
        : "text-primary-label";

  const inner = (
    <>
      <span className={`font-display text-headline-small font-semibold ${ink}`}>
        {value}
      </span>
      <span
        className={`text-label-small font-semibold uppercase tracking-wider text-center ${ink}`}
      >
        {label.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
    </>
  );

  const shared =
    "flex-1 min-w-0 sm:min-w-[120px] rounded-lg px-s py-md flex flex-col items-center gap-xs border";

  if (to) {
    return (
      <Link
        to={to}
        className={`${shared} no-underline transition-colors hover:opacity-90 ${surface}`}
      >
        {inner}
      </Link>
    );
  }
  return <div className={`${shared} ${surface}`}>{inner}</div>;
}

/**
 * Whether a table still needs somebody, and whether anyone has claimed to pay.
 *
 * **The bills decide this, not `hasUnpaid`.** That flag goes false the moment
 * an order is served, even with the money still owed. Measured against the live
 * API, one order, served without payment:
 *
 *     hasUnpaid          false
 *     unpaidTotal        0
 *     outstanding_total  564375
 *     live_orders        [ SERVED, balance_due 564375 ]
 *
 * Trusting the flag printed "No active orders" over a table that owed
 * ₦26,638.50 while the guest's own phone still showed the bill. The flags are
 * the older, coarser view of a table; `live_orders` is the real one.
 *
 * Falls back to the flags only where `live_orders` is absent, which means a
 * deployment that predates it.
 */
function tableState(table: AdminTableStatus): {
  busy: boolean;
  claimed: boolean;
} {
  const bills = groupBills(table.live_orders);
  if (bills.length === 0) {
    return {
      busy: table.hasUnpaid || table.hasPending,
      claimed: table.hasPending,
    };
  }
  return {
    busy: bills.some((b) => b.state !== "settled"),
    claimed: bills.some((b) => b.state === "claimed"),
  };
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
        <p className="text-label-small text-on-surface-variant">
          Reject {bill.guestName ? `${bill.guestName}'s` : "this"} payment? The
          bill goes back to unpaid and this account is marked down.
        </p>
        <div className="flex gap-s">
          <SecondaryButton
            className="flex-1"
            onClick={() => setRejectingBill(null)}
          >
            Cancel
          </SecondaryButton>
          {/* Rejecting tells a guest their payment claim was not believed.
              It carries error, not the brand. */}
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onReject}
            disabled={rejectPending}
          >
            {rejectPending ? "Rejecting…" : "Confirm Reject"}
          </Button>
        </div>
      </div>
    );
  }

  if (verifyingBill === bill.key) {
    return (
      <div className="flex flex-col gap-s">
        <p className="text-label-small text-on-surface-variant">
          {isCard ? (
            <>
              Confirm{" "}
              <span className="font-bold text-on-surface">
                {formatCurrency(bill.balanceDue)}
              </span>{" "}
              went through on the machine for {bill.guestName ?? "this guest"}.
            </>
          ) : (
            <>
              Confirm{" "}
              <span className="font-bold text-on-surface">
                {formatCurrency(bill.balanceDue)}
              </span>{" "}
              from {bill.guestName ?? "this guest"} has landed in the account.
            </>
          )}{" "}
          This settles their bill and cannot be undone from here.
        </p>
        <div className="flex gap-s">
          <SecondaryButton
            className="flex-1"
            onClick={() => setVerifyingBill(null)}
          >
            Cancel
          </SecondaryButton>
          <PrimaryButton
            className="flex-1"
            onClick={onVerify}
            disabled={verifyPending}
          >
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
