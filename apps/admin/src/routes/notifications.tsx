import { useMemo, useState } from "react";
import {
  useAdminNotifications,
  useMarkNotificationsRead,
  useNotificationCount,
  useResolveAllNotifications,
} from "@oshap/shared";
import type { NotificationType } from "@oshap/shared";
import { errorMessage } from "@oshap/shared";
import { Button, PrimaryButton, SecondaryButton, Select, toast } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";
import { NotificationRow, groupByTime } from "../components/NotificationBell";
import { NOTIFICATION_META } from "../notificationCopy";

/**
 * The history the panel is the wrong shape for.
 *
 * A panel answers "what needs me right now". This answers "what happened during
 * Saturday service" — which is the question asked on Sunday morning, when the
 * toast that fired at 20:14 is long gone and somebody wants to know whether
 * table 6 ever got a waiter.
 */

const PER_PAGE = 25;

const TYPE_OPTIONS: Array<{ value: NotificationType | ""; label: string }> = [
  { value: "", label: "Everything" },
  { value: "waiter_called", label: "Waiter requested" },
  { value: "pos_requested", label: "POS requested" },
  { value: "payment_claimed", label: "Payment to verify" },
  { value: "new_order", label: "New orders" },
  { value: "order_ready", label: "Ready to run" },
  { value: "low_stock", label: "Running low" },
];

export default function Notifications() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<NotificationType | "">("");
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);

  const query = useAdminNotifications({
    page,
    per_page: PER_PAGE,
    type: type || undefined,
    unresolved_only: unresolvedOnly || undefined,
  });
  const markRead = useMarkNotificationsRead();
  // Its own query. Reading a count off the loaded page would disable the
  // button whenever page 1 happened to be read, while page 3 was not.
  const unread = useNotificationCount("unread");

  /**
   * The rows still outstanding, so they can be cleared in one go.
   *
   * Derived notifications close themselves only from the moment that was wired
   * up on the backend. Anything created before it stays open for good — the
   * order it describes moved on days ago — which left the bell reading 9+ with
   * no way for anyone to bring it down.
   */
  const outstanding = useAdminNotifications({
    per_page: 100,
    unresolved_only: true,
  });
  const outstandingIds = useMemo(
    () => (outstanding.data?.notifications ?? []).map((n) => n.id),
    [outstanding.data?.notifications],
  );
  const resolveAll = useResolveAllNotifications();
  const [confirmClear, setConfirmClear] = useState(false);

  const clearAll = () => {
    resolveAll.mutate(outstandingIds, {
      onSuccess: ({ cleared, failed }) => {
        setConfirmClear(false);
        if (failed.length === 0) {
          toast.success(cleared === 1 ? "Cleared" : `Cleared ${cleared}`);
          return;
        }
        toast.error(
          `Cleared ${cleared}. ${failed.length} would not clear — they may need someone to act on them.`,
        );
      },
      onError: (err) => {
        setConfirmClear(false);
        toast.error(errorMessage(err, "clear the notifications"));
      },
    });
  };

  const rows = useMemo(
    () => query.data?.notifications ?? [],
    [query.data?.notifications],
  );
  const total = query.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const grouped = useMemo(() => groupByTime(rows), [rows]);

  const change =
    <T,>(set: (v: T) => void) =>
    (value: T) => {
      set(value);
      // Any filter change invalidates the page number — page 4 of "everything"
      // is not page 4 of "waiter requested".
      setPage(1);
    };

  return (
    <div className="p-md sm:p-l flex flex-col gap-md max-w-[52rem] mx-auto w-full">
      <div className="flex items-start justify-between gap-md flex-wrap">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-headline-large font-semibold font-display text-on-surface">
            Notifications
          </h1>
          <p className="text-body-medium text-on-surface-variant">
            {total > 0
              ? `${total} in the last 30 days`
              : "Calls, orders and payments as they happen"}
          </p>
        </div>
        <div className="flex items-center gap-s">
          <SecondaryButton
            size="md"
            // `unread_total` was on the agreed contract and never shipped, so
            // this read `undefined`, fell back to 0, and disabled the button
            // permanently — a dead control that looked deliberate.
            disabled={markRead.isPending || (unread.data ?? 0) === 0}
            onClick={() => markRead.mutate({ all: true })}
          >
            {markRead.isPending ? "Marking…" : "Mark all read"}
          </SecondaryButton>
          {/* Separate from Mark all read on purpose. Reading is about one
              person's attention; clearing says the work is done, and the bell
              counts the second. */}
          <PrimaryButton
            size="md"
            disabled={resolveAll.isPending || outstandingIds.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            {resolveAll.isPending
              ? "Clearing…"
              : `Clear ${outstandingIds.length || ""}`.trim()}
          </PrimaryButton>
        </div>
      </div>

      {confirmClear && (
        <div className="flex flex-col gap-s p-md rounded-sm bg-surface-container-high border border-outline-variant">
          <p className="text-body-medium text-on-surface-variant">
            Clear{" "}
            <span className="font-semibold text-on-surface">
              {outstandingIds.length}
            </span>{" "}
            still needing attention? This marks the work done and empties the
            bell. Anything genuinely waiting on someone — a waiter call nobody
            has answered — goes with it.
          </p>
          <div className="flex gap-s justify-end">
            <SecondaryButton size="md" onClick={() => setConfirmClear(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              size="md"
              disabled={resolveAll.isPending}
              onClick={clearAll}
            >
              {resolveAll.isPending ? "Clearing…" : "Yes, clear them"}
            </PrimaryButton>
          </div>
        </div>
      )}

      <div className="flex items-center gap-s flex-wrap">
        <Select
          aria-label="Filter by type"
          density="sm"
          value={type}
          onChange={(e) =>
            change(setType)(e.target.value as NotificationType | "")
          }
          wrapperClassName="max-w-[220px]"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-xs text-body-medium text-on-surface-variant cursor-pointer select-none">
          <input
            type="checkbox"
            checked={unresolvedOnly}
            onChange={(e) => change(setUnresolvedOnly)(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          Still needing attention
        </label>
      </div>

      {query.isError ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <p className="text-body-medium text-on-surface-variant py-2xl text-center">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-body-medium text-on-surface-variant py-2xl text-center">
          {type || unresolvedOnly
            ? "Nothing matches that filter."
            : "Nothing yet. Calls and orders will show up here."}
        </p>
      ) : (
        <div className="flex flex-col gap-l">
          {grouped.map(([bucket, items]) => (
            <section key={bucket} className="flex flex-col gap-xs">
              <h2 className="text-label-small font-semibold uppercase tracking-widest text-on-surface-variant">
                {bucket}
              </h2>
              <div className="rounded-lg bg-surface-container-low p-s flex flex-col gap-s">
                {items.map((n) => (
                  <NotificationRow key={n.id} notification={n} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between gap-md">
          <Button
            variant="outlined"
            size="md"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-body-medium text-on-surface-variant tabular-nums">
            Page {page} of {lastPage}
          </span>
          <Button
            variant="outlined"
            size="md"
            disabled={page >= lastPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

/** Re-exported so the nav can label a filter without importing the copy map. */
export { NOTIFICATION_META };
