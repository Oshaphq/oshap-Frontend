import { useState } from "react";
import { Link } from "react-router";
import {
  useAdminHistory,
  formatCurrency,
  formatApiDate,
  formatApiTime,
} from "@oshap/shared";
import { SecondaryButton } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";

/**
 * What an order's status should read as in history.
 *
 * This was `status === "CONFIRMED" ? "Paid" : "Cancelled"` — so **everything
 * that was not paid was labelled cancelled**, including orders still being
 * cooked and, once the Served flow shipped, every delivered-but-unpaid bill.
 *
 * A guest at T4 could see their order as SERVED on their phone while this
 * screen called the same order CANCELLED, which is the kind of disagreement
 * that gets a restaurant accused of losing a bill.
 */
function statusChip(status: string): { label: string; cls: string } {
  const settled = "bg-success-container text-on-success-container";
  const gone = "bg-error-container text-on-error-container";
  const working = "bg-warning-container text-on-warning-container";
  const quiet = "bg-surface-container-high text-on-surface-variant";

  switch (status) {
    case "CONFIRMED":
      return { label: "Paid", cls: settled };
    case "CANCELLED":
      return { label: "Cancelled", cls: gone };
    case "REFUNDED":
      return { label: "Refunded", cls: quiet };
    case "SERVED":
      // Food delivered, money not in. The one that was being mislabelled.
      return { label: "Served · unpaid", cls: working };
    case "PAYMENT_PENDING":
      return { label: "Says paid", cls: working };
    case "CREATED":
      return { label: "New", cls: quiet };
    case "PREPARING":
      return { label: "Preparing", cls: working };
    case "READY":
      return { label: "Ready", cls: working };
    default:
      // Never guess. A status we do not know is not automatically a bad one.
      return { label: status.toLowerCase().replace(/_/g, " "), cls: quiet };
  }
}

// Both read the API's zoneless timestamps as local time, which in Lagos put
// every order an hour early — and pushed a late-evening one onto the previous
// day, the same way the Z-report buckets it wrong.
const formatDate = formatApiDate;
const formatTime = formatApiTime;

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
          className="flex-1 px-md py-md rounded-lg bg-surface-container-low border border-outline-variant text-caption-md text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors"
        />
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-md py-md rounded-lg bg-surface-container-low border border-outline-variant text-caption-md text-primary-text outline-none focus:border-primary transition-colors"
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
        <QueryError error={historyQuery.error} action="load the history" onRetry={() => historyQuery.refetch()} />
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
                className={`text-left rounded-md p-md flex flex-col gap-md bg-surface-container-low border border-transparent transition-colors hover:border-outline-variant cursor-pointer ${
                  order.status === "CANCELLED" || order.status === "REFUNDED"
                    ? "opacity-55"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-md">
                  <div className="flex flex-col gap-xs min-w-0">
                    <Link
                      to={`/orders/${order.id}`}
                      title="Open the bill"
                      className="text-caption-md font-bold text-primary-text font-mono hover:text-primary transition-colors no-underline"
                    >
                      {order.reference}
                    </Link>
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
                      className={`text-caption-xs font-bold uppercase tracking-wider px-s py-xs rounded-4xl whitespace-nowrap ${statusChip(order.status).cls}`}
                    >
                      {statusChip(order.status).label}
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
    <div className="flex-1 bg-surface-container-low rounded-md px-s py-md flex flex-col items-center gap-xs">
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
