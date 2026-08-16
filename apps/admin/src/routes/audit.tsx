import { useState } from "react";
import { Link } from "react-router";
import { AUDIT_ACTIONS, formatCurrency, useAdminAuditLogs } from "@oshap/shared";
import type { AuditLogEntry } from "@oshap/shared";
import { SecondaryButton } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";

/**
 * Actions worth filtering by. Deliberately a fixed list rather than derived
 * from the visible page — otherwise the filter options change as you page
 * through, which makes it useless for finding something.
 */
const ACTIONS = [
  { value: "", label: "Everything" },
  { value: AUDIT_ACTIONS.cashPaid, label: "Cash taken" },
  { value: "payment.verify", label: "Payments verified" },
  { value: "payment.reject", label: "Payments rejected" },
  { value: AUDIT_ACTIONS.discount, label: "Discounts" },
  { value: AUDIT_ACTIONS.refund, label: "Refunds" },
  { value: AUDIT_ACTIONS.tip, label: "Tips" },
  { value: AUDIT_ACTIONS.itemVoid, label: "Items voided" },
  { value: AUDIT_ACTIONS.itemComp, label: "Items comped" },
  { value: AUDIT_ACTIONS.itemUpdate, label: "Items edited" },
] as const;

/** Actions that move money away from the restaurant get visual weight. */
const REDUCING_ACTIONS = new Set<string>([
  AUDIT_ACTIONS.discount,
  AUDIT_ACTIONS.refund,
  AUDIT_ACTIONS.itemVoid,
  AUDIT_ACTIONS.itemComp,
  "payment.reject",
]);

/** Fallback wording, used when `details` carries nothing readable. */
const ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTIONS.discount]: "Discount applied",
  [AUDIT_ACTIONS.tip]: "Tip added",
  [AUDIT_ACTIONS.refund]: "Order refunded",
  [AUDIT_ACTIONS.cashPaid]: "Cash taken",
  [AUDIT_ACTIONS.itemUpdate]: "Item edited",
  [AUDIT_ACTIONS.itemVoid]: "Item voided",
  [AUDIT_ACTIONS.itemComp]: "Item comped",
  "payment.verify": "Payment verified",
  "payment.reject": "Payment rejected",
};

/**
 * The server records what changed as structured data rather than a sentence,
 * so the wording is ours. Pulls out the keys worth reading and leaves the rest
 * alone — inventing prose for an unknown action would be worse than the raw
 * action name.
 */
function describe(entry: AuditLogEntry): string {
  const base = ACTION_LABELS[entry.action] ?? entry.action;
  const details = entry.details ?? {};
  const parts: string[] = [];

  if (typeof details.item === "string") parts.push(details.item);
  if (typeof details.reference === "string") parts.push(details.reference);
  if (typeof details.reason === "string" && details.reason) parts.push(`“${details.reason}”`);

  return parts.length > 0 ? `${base} · ${parts.join(" · ")}` : base;
}

/** Money moved by an action, where the action moved any. */
function amountOf(entry: AuditLogEntry): number | null {
  const amount = entry.details?.amount;
  return typeof amount === "number" ? amount : null;
}

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

  const entries = logs.data?.logs ?? [];
  // No page count is returned, so derive it.
  const perPage = logs.data?.per_page ?? 25;
  const totalPages = logs.data ? Math.max(1, Math.ceil(logs.data.total / perPage)) : 1;

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
            const amount = amountOf(entry);
            const orderId = entry.target_type === "order" ? entry.target_id : null;
            const reference =
              typeof entry.details?.reference === "string" ? entry.details.reference : null;
            return (
              <div
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-md gap-y-xs px-md py-s border-b border-outline-variant last:border-none"
              >
                <span className="text-caption-md text-secondary-text tabular-nums shrink-0">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
                <span className="text-p2 text-primary-text min-w-0 flex-1">
                  {describe(entry)}
                </span>
                {orderId && (
                  <Link
                    to={`/orders/${orderId}`}
                    className="text-caption-md font-mono text-secondary-text hover:text-primary transition-colors no-underline shrink-0"
                  >
                    {reference ?? "Open bill"}
                  </Link>
                )}
                {entry.actor_name && (
                  <span className="text-caption-md text-secondary-text shrink-0">
                    {entry.actor_name}
                  </span>
                )}
                {amount != null && (
                  <span
                    className={`text-label-l4 font-semibold tabular-nums shrink-0 ${
                      reduces ? "text-error" : "text-primary-text"
                    }`}
                  >
                    {reduces ? "− " : ""}
                    {formatCurrency(amount)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-md">
          <SecondaryButton
            size="md"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </SecondaryButton>
          <span className="text-caption-md text-secondary-text tabular-nums">
            Page {page} of {totalPages}
          </span>
          <SecondaryButton
            size="md"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
          >
            Next
          </SecondaryButton>
        </div>
      )}
    </main>
  );
}
