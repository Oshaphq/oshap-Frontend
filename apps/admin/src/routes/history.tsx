import { useState, useCallback } from "react";
import { useAdminHistory, formatCurrency } from "@oshap/shared";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [tableFilter, setTableFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const historyQuery = useAdminHistory({
    page,
    per_page: 20,
    table: tableFilter || undefined,
    date: dateFilter || undefined,
  });

  const fetchPage = useCallback(
    (newPage: number) => {
      setPage(newPage);
    },
    [],
  );

  const data = historyQuery.data;
  const orders = data?.orders ?? [];
  const pagination = data?.pagination ?? { page: 1, per_page: 20, total: 0, total_pages: 0 };
  const summary = data?.summary ?? { confirmed_count: 0, cancelled_count: 0, page_revenue: 0 };

  return (
    <main className="p-md">
      <header className="flex items-center justify-between mb-lg">
        <h1 className="text-display-h1 font-bold text-primary-text">
          Transaction History
        </h1>
        <button
          className="flex items-center gap-1 px-md py-s rounded-xl bg-surface-container-high text-label-l5 font-semibold text-primary-text hover:bg-surface-container-highest transition-colors"
          onClick={() => historyQuery.refetch()}
        >
          <i className="mgc_refresh_3_line" />
          Refresh
        </button>
      </header>

      <div className="flex gap-md mb-lg">
        <input
          className="flex-1 px-lg py-md rounded-xl bg-surface-container-low border border-outline-variant text-p text-primary-text placeholder:text-secondary-text outline-none focus:border-primary transition-colors"
          type="text"
          placeholder="Filter by table (e.g. T1)"
          value={tableFilter}
          onChange={(e) => {
            setTableFilter(e.target.value.toUpperCase());
            setPage(1);
          }}
        />
        <input
          className="flex-1 px-lg py-md rounded-xl bg-surface-container-low border border-outline-variant text-p text-primary-text placeholder:text-secondary-text outline-none focus:border-primary transition-colors"
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="flex gap-md mb-lg">
        <div className="flex-1 bg-surface-container-low rounded-2xl p-lg">
          <span className="text-display-h2 font-bold text-primary-text block">
            {pagination.total}
          </span>
          <span className="text-label-l5 text-secondary-text">Total Orders</span>
        </div>
        <div className="flex-1 bg-surface-container-low rounded-2xl p-lg">
          <span className="text-display-h2 font-bold text-success block">
            {summary.confirmed_count}
          </span>
          <span className="text-label-l5 text-secondary-text">Confirmed</span>
        </div>
        <div className="flex-1 bg-surface-container-low rounded-2xl p-lg">
          <span className="text-display-h2 font-bold text-error block">
            {summary.cancelled_count}
          </span>
          <span className="text-label-l5 text-secondary-text">Cancelled</span>
        </div>
      </div>

      {historyQuery.isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-md text-secondary-text">
          <div className="oshap-spinner" />
          <p>Loading history...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-md text-secondary-text">
          <i className="mgc_history_line text-5xl opacity-30" />
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-s">
          {orders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            const payment = order.payments?.[0];

            return (
              <div
                key={order.id}
                className={`rounded-2xl border p-lg cursor-pointer transition-colors hover:bg-surface-container-low ${
                  order.status === "CANCELLED"
                    ? "bg-error/5 border-error/20"
                    : "bg-surface-container-low border-outline-variant"
                }`}
                onClick={() =>
                  setExpandedOrder(isExpanded ? null : order.id)
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-label-l4 font-semibold text-primary-text">
                      {order.reference}
                    </span>
                    <span className="text-caption text-secondary-text">
                      {order.table_id}
                      {order.customer_name && (
                        <> · {order.customer_name}</>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-label-l4 font-semibold text-primary-text">
                      {formatCurrency(order.total)}
                    </span>
                    <span
                      className={`text-caption font-semibold px-s py-0.5 rounded-lg ${
                        order.status === "CONFIRMED"
                          ? "bg-success/10 text-success"
                          : "bg-error/10 text-error"
                      }`}
                    >
                      {order.status === "CONFIRMED" ? "Paid" : "Cancelled"}
                    </span>
                  </div>
                </div>

                {isExpanded && order.order_items?.length > 0 && (
                  <div className="mt-md pt-md border-t border-outline-variant flex flex-col gap-s">
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between"
                      >
                        <span className="text-label-l5 text-primary-text">
                          <span className="font-semibold text-primary mr-1">
                            {item.quantity}×
                          </span>
                          {item.name}
                        </span>
                        <span className="text-label-l5 text-secondary-text">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-md pt-s border-t border-outline-variant/50">
                  <span className="text-caption text-secondary-text">
                    {formatDate(order.created_at)} · {formatTime(order.created_at)}
                  </span>
                  {payment && (
                    <span
                      className={`text-caption font-semibold px-s py-0.5 rounded-lg ${
                        payment.status === "VERIFIED"
                          ? "bg-success/10 text-success"
                          : "bg-surface-container-high text-secondary-text"
                      }`}
                    >
                      {payment.status === "VERIFIED"
                        ? "Verified"
                        : payment.status === "CLAIMED"
                          ? "Claimed"
                          : "No Payment"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-md mt-lg">
          <button
            className="px-lg py-s rounded-xl border border-outline-variant text-label-l5 font-semibold text-primary-text hover:bg-surface-container-high transition-colors disabled:opacity-30"
            disabled={pagination.page <= 1}
            onClick={() => fetchPage(pagination.page - 1)}
          >
            Prev
          </button>
          <span className="text-label-l5 text-secondary-text">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <button
            className="px-lg py-s rounded-xl border border-outline-variant text-label-l5 font-semibold text-primary-text hover:bg-surface-container-high transition-colors disabled:opacity-30"
            disabled={pagination.page >= pagination.total_pages}
            onClick={() => fetchPage(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}
