import { useState } from "react";
import { useAdminHistory, formatCurrency } from "@oshap/shared";
import { SecondaryButton } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";

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

  const data = historyQuery.data;
  const orders = data?.orders ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
  };
  const summary = data?.summary ?? {
    confirmed_count: 0,
    cancelled_count: 0,
    page_revenue: 0,
  };

  return (
    <main className="p-md flex flex-col gap-l">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-display-h2 font-semibold text-primary-text">
          Transaction History
        </h1>
        <SecondaryButton
          size="md"
          onClick={() => historyQuery.refetch()}
          disabled={historyQuery.isRefetching}
        >
          <i
            className={
              historyQuery.isRefetching
                ? "mgc_loading_line animate-spin"
                : "mgc_refresh_3_line"
            }
          />{" "}
          {historyQuery.isRefetching ? "Refreshing…" : "Refresh"}
        </SecondaryButton>
      </header>

      <div className="flex flex-col sm:flex-row gap-md">
        <input
          type="text"
          placeholder="Filter by table (e.g. T1)"
          value={tableFilter}
          onChange={(e) => {
            setTableFilter(e.target.value.toUpperCase());
            setPage(1);
          }}
          className="flex-1 px-md py-md rounded-lg bg-surface-container border border-outline-variant text-caption-md text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-md py-md rounded-lg bg-surface-container border border-outline-variant text-caption-md text-primary-text outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="flex gap-s">
        <SummaryCard label="Total Orders" value={pagination.total} />
        <SummaryCard
          label="Confirmed"
          value={summary.confirmed_count}
          tone="success"
        />
        <SummaryCard
          label="Cancelled"
          value={summary.cancelled_count}
          tone="error"
        />
      </div>

      {historyQuery.isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-md text-secondary-text">
          <div className="oshap-spinner" />
          <p>Loading history...</p>
        </div>
      ) : historyQuery.isError ? (
        <QueryError onRetry={() => historyQuery.refetch()} />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-s py-10 px-md text-center">
          <i className="mgc_history_line text-5xl text-outline-variant opacity-40" />
          <span className="font-display text-display-h4 font-semibold text-primary-text">
            No transactions found
          </span>
          <p className="text-p2 text-secondary-text">
            Try a different filter or date range.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {orders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            const payment = order.payments?.[0];

            return (
              <button
                key={order.id}
                type="button"
                onClick={() =>
                  setExpandedOrder(isExpanded ? null : order.id)
                }
                className={`text-left rounded-md p-md flex flex-col gap-md bg-surface-container border border-transparent transition-colors hover:border-outline-variant cursor-pointer ${
                  order.status === "CANCELLED" ? "opacity-55" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-md">
                  <div className="flex flex-col gap-xs min-w-0">
                    <span className="text-caption-md font-bold text-primary-text font-mono">
                      {order.reference}
                    </span>
                    <span className="text-caption-sm text-secondary-text">
                      {order.table_id}
                      {order.customer_name && (
                        <span className="text-primary font-medium"> · {order.customer_name}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-xs shrink-0">
                    <span className="text-p font-semibold text-primary-text">
                      {formatCurrency(order.total)}
                    </span>
                    <span
                      className={`text-caption-xs font-bold uppercase tracking-wider px-s py-xs rounded-4xl whitespace-nowrap ${
                        order.status === "CONFIRMED"
                          ? "bg-success-container text-on-success-container"
                          : "bg-error-container text-on-error-container"
                      }`}
                    >
                      {order.status === "CONFIRMED" ? "Paid" : "Cancelled"}
                    </span>
                  </div>
                </div>

                {isExpanded && order.order_items?.length > 0 && (
                  <div className="flex flex-col gap-s py-s border-t border-surface-container-high">
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-caption-md"
                      >
                        <span className="text-secondary-text flex gap-s">
                          <span className="text-primary font-bold min-w-6 shrink-0">
                            {item.quantity}×
                          </span>
                          <span className="min-w-0">{item.name}</span>
                        </span>
                        <span className="text-primary-text font-semibold shrink-0">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-s border-t border-surface-container-high">
                  <span className="text-caption-sm text-outline">
                    {formatDate(order.created_at)} · {formatTime(order.created_at)}
                  </span>
                  {payment && (
                    <span
                      className={`text-caption-xs font-bold uppercase tracking-wider px-s py-xs rounded-4xl whitespace-nowrap ${
                        payment.status === "VERIFIED"
                          ? "bg-success-container text-on-success-container"
                          : "bg-surface-container-high text-outline"
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
              </button>
            );
          })}
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-md">
          <SecondaryButton
            size="md"
            onClick={() => setPage(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            Prev
          </SecondaryButton>
          <span className="text-caption-md font-medium text-secondary-text">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <SecondaryButton
            size="md"
            onClick={() => setPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.total_pages}
          >
            Next
          </SecondaryButton>
        </div>
      )}
    </main>
  );
}

const SUMMARY_TONE_CLS = {
  neutral: "text-primary",
  success: "text-success",
  error: "text-error",
} as const;

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: keyof typeof SUMMARY_TONE_CLS;
}) {
  return (
    <div className="flex-1 bg-surface-container rounded-md px-s py-md flex flex-col items-center gap-xs">
      <span
        className={`font-display text-display-h2 font-semibold block ${SUMMARY_TONE_CLS[tone]}`}
      >
        {value}
      </span>
      <span className="text-caption-sm font-medium text-secondary-text uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
