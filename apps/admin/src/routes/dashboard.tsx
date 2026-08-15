import { useState } from "react";
import { Link } from "react-router";
import {
  useAdminTables,
  useAdminVerifyPayment,
  useAdminRejectPayment,
  useAdminCloseTable,
  useAdminInventoryAlerts,
  formatCurrency,
} from "@oshap/shared";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";
import CashPaymentDialog from "../components/CashPaymentDialog";

export default function DashboardPage() {
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
    return <QueryError onRetry={() => tablesQuery.refetch()} />;
  }

  const tables = tablesQuery.data?.tables ?? [];
  const activeTablesCount = tables.filter((t) => t.hasPending || t.hasUnpaid).length;
  const pendingCount = tables.filter((t) => t.hasPending).length;

  const handleReject = async (tableId: string) => {
    try {
      await rejectPayment.mutateAsync({ table_id: tableId });
      setRejectingTableId(null);
      toast.success("Payment rejected — the bill is unpaid again");
    } catch {
      toast.error("Failed to reject payment. Please try again.");
    }
  };

  const handleVerify = async (tableId: string) => {
    try {
      await verifyPayment.mutateAsync({ table_id: tableId });
    } catch {
      toast.error("Failed to verify payment. Please try again.");
    }
  };

  const handleClearWithReason = async (
    tableId: string,
    reason: "paid" | "abandoned",
  ) => {
    setClearPromptTable(null);
    try {
      await closeTable.mutateAsync({ table_id: tableId, reason });
    } catch {
      toast.error("Failed to clear table. Please try again.");
    }
  };

  const hasPending = pendingCount > 0;
  const lowStockCount = alertsQuery.data?.alerts.length ?? 0;
  const hasLowStock = lowStockCount > 0;

  return (
    <main className="p-md flex flex-col gap-l">
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
                  {table.id}
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
                        onClick={() => handleReject(table.id)}
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
                      onClick={() => handleVerify(table.id)}
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
                  <button
                    type="button"
                    onClick={() => handleClearWithReason(table.id, "paid")}
                    className="flex items-center justify-center gap-s py-s rounded-lg font-bold text-caption-md bg-success text-on-success transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                    <i className="mgc_wallet_4_line" />
                    Paid (Cash/Transfer)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClearWithReason(table.id, "abandoned")}
                    className="flex items-center justify-center gap-s py-s rounded-lg font-bold text-caption-md border border-error text-error bg-transparent transition-all hover:bg-error/10 active:scale-[0.98]"
                  >
                    <i className="mgc_exit_line" />
                    Abandoned / Left
                  </button>
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
