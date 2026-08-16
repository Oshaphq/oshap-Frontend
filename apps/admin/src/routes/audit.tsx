import { useState } from "react";
import { Link } from "react-router";
import { formatCurrency, useAdminAuditLogs } from "@oshap/shared";
import { SecondaryButton } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";

/**
 * Actions worth filtering by. Deliberately a fixed list rather than derived
 * from the visible page — otherwise the filter options change as you page
 * through, which makes it useless for finding something.
 */
const ACTIONS = [
  { value: "", label: "Everything" },
  { value: "payment.cash", label: "Cash taken" },
  { value: "payment.verify", label: "Payments verified" },
  { value: "payment.reject", label: "Payments rejected" },
  { value: "order.discount", label: "Discounts" },
  { value: "order.refund", label: "Refunds" },
  { value: "order.tip", label: "Tips" },
  { value: "item.void", label: "Items voided" },
  { value: "item.comp", label: "Items comped" },
  { value: "item.edit", label: "Items edited" },
] as const;

/** Actions that move money away from the restaurant get visual weight. */
const REDUCING_ACTIONS = new Set([
  "order.discount",
  "order.refund",
  "item.void",
  "item.comp",
  "payment.reject",
]);

/**
 * Who did what to a bill.
 *
 * This is the screen you open when the daily close doesn't reconcile, so it's
 * ordered newest-first and filterable by the kinds of action that move money —
 * discounts, comps, voids and refunds are what a manager is usually looking for.
 */
export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const logs = useAdminAuditLogs({ page, action: action || undefined });

  const setFilter = (next: string) => {
    setAction(next);
    // Page 3 of one filter is meaningless under another.
    setPage(1);
  };

  if (logs.isError) return <QueryError onRetry={() => logs.refetch()} />;

  const entries = logs.data?.entries ?? [];
  const pagination = logs.data?.pagination;

  return (
    <main className="p-md flex flex-col gap-l max-w-[52rem]">
      <header className="flex flex-wrap items-center justify-between gap-md">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-display-h2 font-semibold text-primary-text">
            Audit trail
          </h1>
          <p className="text-caption-md text-secondary-text">
            Every change to a bill, newest first.
          </p>
        </div>
        <select
          value={action}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by action"
          className="px-md py-s rounded-lg bg-surface-container-low border border-outline-variant text-p2 text-primary-text outline-none focus:border-primary transition-colors"
        >
          {ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </header>

      {logs.isLoading ? (
        <div className="flex justify-center py-xl">
          <div className="oshap-spinner" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-xs py-10 px-md text-center rounded-md bg-surface-container-low">
          <i className="mgc_history_line text-5xl text-outline-variant opacity-40" />
          <span className="font-display text-display-h4 font-semibold text-primary-text">
            Nothing recorded
          </span>
          <p className="text-p2 text-secondary-text">
            {action
              ? "No entries of this kind yet."
              : "Adjustments and payments will appear here as they happen."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-low rounded-md overflow-hidden">
          {entries.map((entry) => {
            const reduces = REDUCING_ACTIONS.has(entry.action);
            return (
              <div
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-md gap-y-xs px-md py-s border-b border-outline-variant last:border-none"
              >
                <span className="text-caption-md text-secondary-text tabular-nums shrink-0">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
                <span className="text-p2 text-primary-text min-w-0 flex-1">
                  {entry.detail ?? entry.action}
                </span>
                {entry.order_id && entry.order_reference && (
                  <Link
                    to={`/orders/${entry.order_id}`}
                    className="text-caption-md font-mono text-secondary-text hover:text-primary transition-colors no-underline shrink-0"
                  >
                    {entry.order_reference}
                  </Link>
                )}
                {entry.actor_name && (
                  <span className="text-caption-md text-secondary-text shrink-0">
                    {entry.actor_name}
                  </span>
                )}
                {entry.amount != null && (
                  <span
                    className={`text-label-l4 font-semibold tabular-nums shrink-0 ${
                      reduces ? "text-error" : "text-primary-text"
                    }`}
                  >
                    {reduces ? "− " : ""}
                    {formatCurrency(entry.amount)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between gap-md">
          <SecondaryButton
            size="md"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </SecondaryButton>
          <span className="text-caption-md text-secondary-text tabular-nums">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <SecondaryButton
            size="md"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pagination.total_pages}
          >
            Next
          </SecondaryButton>
        </div>
      )}
    </main>
  );
}
