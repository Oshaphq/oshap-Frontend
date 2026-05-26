import { useState } from "react";
import {
  useAdminTables,
  useAdminVerifyPayment,
  useAdminCloseTable,
  formatCurrency,
} from "@oshap/shared";

export default function DashboardPage() {
  const tablesQuery = useAdminTables(5000);
  const verifyPayment = useAdminVerifyPayment();
  const closeTable = useAdminCloseTable();

  const [clearPromptTable, setClearPromptTable] = useState<string | null>(null);

  if (tablesQuery.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-md text-secondary-text">
        <div className="oshap-spinner" />
        <p>Loading tables...</p>
      </div>
    );
  }

  const tables = tablesQuery.data?.tables ?? [];
  const activeTablesCount = tables.filter((t) => t.hasPending || t.hasUnpaid).length;
  const pendingCount = tables.filter((t) => t.hasPending).length;

  const handleVerify = async (tableId: string) => {
    try {
      await verifyPayment.mutateAsync({ table_id: tableId });
    } catch {
      alert("Failed to verify payment. Please try again.");
    }
  };

  const handleClearWithReason = async (tableId: string, reason: "paid" | "abandoned") => {
    setClearPromptTable(null);
    try {
      await closeTable.mutateAsync({ table_id: tableId, reason });
    } catch {
      alert("Failed to clear table. Please try again.");
    }
  };

  return (
    <main className="p-md">
      <header className="flex items-center justify-between mb-lg">
        <h1 className="text-display-h1 font-bold text-primary-text">
          Waiter Dashboard
        </h1>
        <div className="flex items-center gap-s">
          <button
            className="flex items-center gap-1 px-md py-s rounded-xl bg-surface-container-high text-label-l5 font-semibold text-primary-text hover:bg-surface-container-highest transition-colors"
            onClick={() => tablesQuery.refetch()}
          >
            <i className="mgc_refresh_3_line" />
            Refresh
          </button>
        </div>
      </header>

      <div className="flex gap-md mb-lg">
        <div className="flex-1 bg-surface-container-low rounded-2xl p-lg">
          <span className="text-display-h2 font-bold text-primary-text block">
            {activeTablesCount}
          </span>
          <span className="text-label-l5 text-secondary-text">Active Tables</span>
        </div>
        <div
          className="flex-1 rounded-2xl p-lg"
          style={{
            backgroundColor:
              pendingCount > 0 ? "rgba(255,153,0,0.1)" : "var(--color-surface-container-low)",
          }}
        >
          <span
            className="text-display-h2 font-bold block"
            style={{ color: pendingCount > 0 ? "#ff9900" : "var(--color-primary-text)" }}
          >
            {pendingCount}
          </span>
          <span className="text-label-l5 text-secondary-text">Payments to Verify</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
        {tables.map((table) => {
          const isPending = table.hasPending;
          const isUnpaid = table.hasUnpaid;
          const isEmpty = !isPending && !isUnpaid;
          const isVerifying = verifyPayment.isPending && verifyPayment.variables?.table_id === table.id;
          const isClosing = closeTable.isPending && closeTable.variables?.table_id === table.id;

          return (
            <div
              key={table.id}
              className={`rounded-2xl border p-lg transition-colors ${
                isPending
                  ? "bg-warning/10 border-warning/30"
                  : !isEmpty
                    ? "bg-surface-container-low border-primary/30"
                    : "bg-surface-container-low border-outline-variant"
              }`}
            >
              <div className="flex items-center justify-between mb-md">
                <span className="text-label-l4 font-bold text-primary-text">
                  {table.id}
                </span>
                {isPending ? (
                  <span className="px-s py-0.5 rounded-lg bg-warning/20 text-warning text-caption font-semibold">
                    Verification Req.
                  </span>
                ) : isUnpaid ? (
                  <span className="px-s py-0.5 rounded-lg bg-primary-container text-on-primary-container text-caption font-semibold">
                    Dining
                  </span>
                ) : (
                  <span className="px-s py-0.5 rounded-lg bg-surface-container-high text-secondary-text text-caption font-semibold">
                    Empty
                  </span>
                )}
              </div>

              <div className="mb-md">
                {!isEmpty ? (
                  <>
                    {isUnpaid && (
                      <p className="text-label-l5 text-secondary-text">
                        Current Bill:{" "}
                        <span className="font-semibold text-primary-text">
                          {formatCurrency(table.unpaidTotal)}
                        </span>
                      </p>
                    )}
                    {isPending && (
                      <p className="text-label-l5" style={{ color: "#ff9900" }}>
                        Claimed:{" "}
                        <span className="font-semibold" style={{ color: "#ff9900" }}>
                          {formatCurrency(table.pendingTotal)}
                        </span>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-label-l5 text-secondary-text">No active orders</p>
                )}
              </div>

              {isPending && (
                <button
                  className="w-full py-s rounded-xl bg-primary text-on-primary text-label-l5 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                  onClick={() => handleVerify(table.id)}
                  disabled={isVerifying}
                >
                  {isVerifying ? "Verifying..." : "Verify Payment"}
                </button>
              )}

              {!isEmpty && isClosing && (
                <div className="py-s text-center text-caption text-secondary-text">
                  Clearing...
                </div>
              )}

              {!isEmpty && !isClosing && clearPromptTable !== table.id && (
                <button
                  className="w-full py-s rounded-xl border border-outline-variant text-label-l5 font-semibold text-secondary-text hover:bg-surface-container-high transition-colors"
                  onClick={() => setClearPromptTable(table.id)}
                >
                  Clear Table
                </button>
              )}

              {clearPromptTable === table.id && (
                <div className="mt-s p-md rounded-xl bg-surface-container-high">
                  <span className="block text-caption font-semibold text-secondary-text mb-s">
                    Why are you clearing?
                  </span>
                  <div className="flex flex-col gap-s">
                    <button
                      className="flex items-center gap-s py-s px-md rounded-xl bg-success/10 text-success text-label-l5 font-semibold hover:opacity-80 transition-opacity"
                      onClick={() => handleClearWithReason(table.id, "paid")}
                    >
                      <i className="mgc_wallet_4_line" /> Paid (Cash/Transfer)
                    </button>
                    <button
                      className="flex items-center gap-s py-s px-md rounded-xl bg-error/10 text-error text-label-l5 font-semibold hover:opacity-80 transition-opacity"
                      onClick={() => handleClearWithReason(table.id, "abandoned")}
                    >
                      <i className="mgc_exit_line" /> Abandoned / Left
                    </button>
                    <button
                      className="py-s px-md rounded-xl border border-outline-variant text-label-l5 text-secondary-text hover:bg-surface-container-highest transition-colors"
                      onClick={() => setClearPromptTable(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tables.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-md text-secondary-text">
          <i className="mgc_table_line text-5xl opacity-30" />
          <p className="text-label-l4">No tables configured</p>
        </div>
      )}
    </main>
  );
}
