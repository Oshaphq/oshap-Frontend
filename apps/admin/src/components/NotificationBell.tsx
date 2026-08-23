import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  useMarkNotificationsRead,
  useNotificationBadge,
  useAdminNotifications,
  useResolveNotification,
} from "@oshap/shared";
import type { Notification } from "@oshap/shared";
import { toast } from "@oshap/shared/ui";
import {
  NOTIFICATION_META,
  TIME_BUCKETS,
  timeAgo,
  timeBucket,
  type TimeBucket,
} from "../notificationCopy";

/**
 * The bell, and the panel behind it.
 *
 * Before this, a realtime alert was a five-second toast held in component
 * state. A waiter call that fired while nobody was looking at the screen left
 * no trace at all, so "did anyone go to table 6?" had no answer. The toast is
 * right for the moment it happens; it was wrong as the only copy.
 *
 * The badge counts **unresolved**, not unread — it should mean "work
 * outstanding", not "things you haven't looked at". Reading a call you cannot
 * act on must not clear the badge for the person who can.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const badge = useNotificationBadge();
  const unresolved = badge.data?.unresolved ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          unresolved
            ? `Notifications, ${unresolved} needing attention`
            : "Notifications"
        }
        aria-expanded={open}
        className="relative w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 transition-colors"
      >
        <i className="mgc_notification_line text-lg" aria-hidden />
        {unresolved > 0 && (
          <span
            // Sits on the icon rather than beside it: staff read this at a
            // glance across a room, not by scanning the nav bar.
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-4xl bg-error text-on-error text-caption-xs font-bold tabular-nums"
            aria-hidden
          >
            {unresolved > 9 ? "9+" : unresolved}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </div>
  );
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { data, isLoading, isError } = useAdminNotifications({ per_page: 20 });
  // Memoised because `?? []` is a fresh array every render, which would make
  // the grouping below re-run for nothing.
  const rows = useMemo(() => data?.notifications ?? [], [data?.notifications]);

  // Escape closes, and a click anywhere else does too — this is a popover over
  // a working screen, not a modal, so it must never trap anyone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const grouped = useMemo(() => groupByTime(rows), [rows]);

  return (
    <>
      <div className="fixed inset-0 z-[70]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label="Notifications"
        className="absolute top-[calc(100%+0.5rem)] right-0 z-[71] w-[min(23rem,calc(100vw-2rem))] max-h-[min(30rem,70vh)] flex flex-col rounded-lg bg-surface-container-low border border-outline-variant shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-s px-md py-s border-b border-outline-variant shrink-0">
          <span className="text-label-l4 font-semibold font-display text-primary-text">
            Notifications
          </span>
          <Link
            to="/notifications"
            onClick={onClose}
            className="text-caption-md font-semibold text-primary no-underline hover:underline"
          >
            See all
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-s flex flex-col gap-s">
          {isLoading && (
            <p className="text-caption-md text-secondary-text px-s py-l text-center">
              Loading…
            </p>
          )}
          {isError && (
            <p className="text-caption-md text-secondary-text px-s py-l text-center">
              Couldn't load notifications.
            </p>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <p className="text-caption-md text-secondary-text px-s py-l text-center">
              Nothing yet. Calls and orders will show up here.
            </p>
          )}

          {grouped.map(([bucket, items]) => (
            <section key={bucket} className="flex flex-col gap-xs">
              <h3 className="px-s text-caption-xs font-semibold uppercase tracking-wider text-secondary-text">
                {bucket}
              </h3>
              {items.map((n) => (
                <NotificationRow key={n.id} notification={n} onNavigate={onClose} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

export function NotificationRow({
  notification: n,
  onNavigate,
}: {
  notification: Notification;
  onNavigate?: () => void;
}) {
  const meta = NOTIFICATION_META[n.type];
  const resolve = useResolveNotification();
  const ref = useMarkReadWhenSeen(n);

  if (!meta) return null;

  const claimed = Boolean(n.resolved_at);
  const canClaim = meta.claimable && !claimed;

  return (
    <div
      ref={ref}
      className={`flex items-start gap-s p-s rounded-lg transition-colors ${
        claimed ? "opacity-60" : "bg-surface-container"
      }`}
    >
      <i
        className={`${claimed ? "mgc_check_circle_line text-on-surface-variant" : `${meta.iconClass} ${meta.iconColorClass}`} text-xl shrink-0 mt-0.5`}
        aria-hidden
      />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-label-l5 font-semibold text-primary-text">
          {meta.body(n)}
        </span>
        <span className="text-caption-xs text-secondary-text">
          {timeAgo(n.created_at)}
          {claimed && n.resolved_by_name ? ` · Claimed by ${n.resolved_by_name}` : ""}
          {n.branch_name ? ` · ${n.branch_name}` : ""}
        </span>
      </div>

      {canClaim && (
        <button
          type="button"
          disabled={resolve.isPending}
          onClick={() =>
            resolve.mutate(n.id, {
              // Someone else may have got there first. The endpoint answers 200
              // with their name rather than an error, so this reads as news.
              onSuccess: (row) =>
                row.resolved_by_name &&
                toast.success(`Claimed by ${row.resolved_by_name}`),
            })
          }
          className="shrink-0 px-s py-0.5 rounded-4xl bg-primary text-on-primary text-caption-xs font-semibold hover:opacity-90 active:scale-[0.97] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 transition"
        >
          {resolve.isPending ? "…" : "I'll go"}
        </button>
      )}

      {!meta.claimable && n.table_id && (
        <Link
          to="/"
          onClick={onNavigate}
          aria-label="Open the dashboard"
          className="shrink-0 text-on-surface-variant no-underline hover:text-primary"
        >
          <i className="mgc_right_line text-lg" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/**
 * Marks a row read once it has actually been on screen for a second.
 *
 * Not on panel open: a badge that clears because you glanced at it has stopped
 * meaning anything. The delay is what separates reading from scrolling past.
 */
function useMarkReadWhenSeen(n: Notification) {
  const ref = useRef<HTMLDivElement>(null);
  const markRead = useMarkNotificationsRead();
  const fired = useRef(false);

  useEffect(() => {
    if (n.read || fired.current || !ref.current) return;
    // No IntersectionObserver (jsdom, old browsers) — leave it unread rather
    // than marking something read that may never have been seen.
    if (typeof IntersectionObserver === "undefined") return;

    let timer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          timer = window.setTimeout(() => {
            if (fired.current) return;
            fired.current = true;
            markRead.mutate({ ids: [n.id] });
          }, 1000);
        } else if (timer) {
          window.clearTimeout(timer);
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
    // `markRead` is a stable mutation handle; re-running on it would restart
    // the timer on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n.id, n.read]);

  return ref;
}

export function groupByTime(
  rows: Notification[],
  now: number = Date.now(),
): Array<[TimeBucket, Notification[]]> {
  const buckets = new Map<TimeBucket, Notification[]>();
  for (const n of rows) {
    const key = timeBucket(n.created_at, now);
    const list = buckets.get(key);
    if (list) list.push(n);
    else buckets.set(key, [n]);
  }
  // Fixed order, so a bucket never jumps position as rows arrive.
  return TIME_BUCKETS.filter((b) => buckets.has(b)).map((b) => [b, buckets.get(b)!]);
}
