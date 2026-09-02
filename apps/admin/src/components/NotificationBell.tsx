import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  useAdminTables,
  useMarkNotificationsRead,
  useNotificationCount,
  useNotificationBadge,
  useAdminNotifications,
  useResolveNotification,
} from "@oshap/shared";
import type { Notification, NotificationType } from "@oshap/shared";
import { toast } from "@oshap/shared/ui";
import {
  NOTIFICATION_META,
  notificationFacts,
  type NotificationMeta,
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
        className="relative w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 transition-colors"
      >
        <i className="mgc_notification_line text-lg" aria-hidden />
        {unresolved > 0 && (
          <span
            // Sits on the icon rather than beside it: staff read this at a
            // glance across a room, not by scanning the nav bar.
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-error text-on-error text-label-small font-bold tabular-nums"
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
  const markRead = useMarkNotificationsRead();
  const unreadCount = useNotificationCount("unread").data ?? 0;

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
        /* A sheet on a phone, a dropdown from tablet up.
           A 23rem panel hung off an icon near the right edge has nowhere
           to go on a 390px screen — it ran past the left edge and cut the
           heading in half. Pinned to both edges instead, so its width is
           whatever the screen allows rather than a number that happens to
           fit some phones. */
        className="fixed left-md right-md top-[3.75rem] z-[71] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[23rem] max-h-[min(30rem,70vh)] flex flex-col rounded-sm bg-surface-container-low border border-outline-variant shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-s px-md py-s border-b border-outline-variant shrink-0">
          <span className="text-label-large font-semibold font-display text-on-surface">
            Notifications
          </span>
          <div className="flex items-center gap-md">
            {/* Clearing the lot is the commonest thing to want from a glance at
                the bell, and it used to mean opening the full page first. */}
            <button
              type="button"
              disabled={markRead.isPending || unreadCount === 0}
              onClick={() => markRead.mutate({ all: true })}
              className="text-body-medium font-semibold text-primary-label bg-transparent border-none cursor-pointer p-0 hover:underline disabled:text-outline disabled:cursor-default disabled:no-underline"
            >
              {markRead.isPending ? "Marking…" : "Mark all read"}
            </button>
            <Link
              to="/notifications"
              onClick={onClose}
              className="text-body-medium font-semibold text-primary-label no-underline hover:underline"
            >
              See all
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-s flex flex-col gap-s">
          {isLoading && (
            <p className="text-body-medium text-on-surface-variant px-s py-l text-center">
              Loading…
            </p>
          )}
          {isError && (
            <p className="text-body-medium text-on-surface-variant px-s py-l text-center">
              Couldn't load notifications.
            </p>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <p className="text-body-medium text-on-surface-variant px-s py-l text-center">
              Nothing yet. Calls and orders will show up here.
            </p>
          )}

          {grouped.map(([bucket, items]) => (
            <section key={bucket} className="flex flex-col gap-xs">
              <h3 className="text-label-small font-semibold uppercase tracking-widest text-on-surface-variant">
                {bucket}
              </h3>
              {items.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onNavigate={onClose}
                />
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
  const meta = NOTIFICATION_META[n.type as NotificationType] as
    NotificationMeta | undefined;
  const resolve = useResolveNotification();
  const ref = useMarkReadWhenSeen(n);
  const tableName = useResolvedTableName(n);

  const claimed = Boolean(n.resolved_at);
  const canClaim = Boolean(meta?.claimable) && !claimed;

  return (
    /* A claimed row keeps its surface and its icon. It used to fade to 60%
       and swap to a generic tick, which turned a Saturday's history into a
       column of ghosts and threw away the one thing that makes it scannable:
       the icon says what kind of thing happened, not whether it is finished.
       Whether it is finished is what the line underneath is for. */
    <div
      ref={ref}
      className="flex items-center gap-s p-s rounded-sm bg-surface-container transition-colors"
    >
      <i
        className={`${meta?.iconClass ?? "mgc_notification_line"} ${meta?.iconColorClass ?? "text-on-surface-variant"} text-lg shrink-0`}
        aria-hidden
      />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-label-medium font-semibold text-on-surface">
          {/* Our own wording for a type we know; the server's for one we do
              not, so a newly added event still says something. */}
          {meta
            ? meta.body({ ...notificationFacts(n), table_name: tableName })
            : n.message || n.title || "Something needs attention"}
        </span>
        <span className="text-label-small text-on-surface-variant">
          {n.created_at ? timeAgo(n.created_at) : ""}
          {/* Naming who went is the point: it is what stops a second waiter
              walking over to a table somebody is already at. */}
          {claimed
            ? n.resolved_by_name
              ? ` · ${n.resolved_by_name} went`
              : " · Claimed"
            : ""}
        </span>
      </div>

      {canClaim && (
        <button
          type="button"
          disabled={resolve.isPending}
          onClick={() =>
            resolve.mutate(n.id, {
              // Someone else may already have gone. The endpoint answers 200
              // with the existing record rather than an error, so the name that
              // comes back is whoever actually claimed it — not necessarily
              // the person who just tapped.
              onSuccess: (row) =>
                toast.success(
                  row.resolved_by_name
                    ? `${row.resolved_by_name} is going`
                    : "Yours — on your way",
                ),
            })
          }
          className="shrink-0 px-s py-1 rounded-full bg-primary text-on-primary text-label-small font-semibold hover:opacity-90 active:scale-[0.97] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 transition"
        >
          {resolve.isPending ? "…" : "I'll go"}
        </button>
      )}

      {!meta?.claimable && n.table_id && (
        <Link
          to="/"
          onClick={onNavigate}
          aria-label="Open the dashboard"
          className="shrink-0 text-on-surface-variant no-underline hover:text-primary-label"
        >
          <i className="mgc_right_line text-lg" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/**
 * The table's name, falling back to the board when the row does not carry one.
 *
 * `table_name` is meant to be resolved server-side when the row is written, and
 * today it comes back null on every notification — so every row read "A table
 * needs attention", which tells a waiter to check the whole room.
 *
 * This is a stopgap, and a worse one than the server doing it: the tables list
 * only covers the active branch and only holds tables that still exist, so a
 * row from another venue or from a since-deleted table still cannot be named.
 * That is exactly why the spec asks for the name to be stamped at write time.
 * Remove this when the backend sends it.
 */
function useResolvedTableName(n: Notification): string | null {
  const { data } = useAdminTables();
  if (n.table_name) return n.table_name;
  if (!n.table_id) return null;
  return data?.tables.find((t) => t.id === n.table_id)?.table_id ?? null;
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
    if (!n.is_unread || fired.current || !ref.current) return;
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
  }, [n.id, n.is_unread]);

  return ref;
}

export function groupByTime(
  rows: Notification[],
  now: number = Date.now(),
): Array<[TimeBucket, Notification[]]> {
  const buckets = new Map<TimeBucket, Notification[]>();
  for (const n of rows) {
    // `created_at` is nullable on the API. A row with no time is still real
    // work, so it sits in Older rather than being dropped.
    const key = n.created_at ? timeBucket(n.created_at, now) : "Older";
    const list = buckets.get(key);
    if (list) list.push(n);
    else buckets.set(key, [n]);
  }
  // Fixed order, so a bucket never jumps position as rows arrive.
  return TIME_BUCKETS.filter((b) => buckets.has(b)).map((b) => [
    b,
    buckets.get(b)!,
  ]);
}
