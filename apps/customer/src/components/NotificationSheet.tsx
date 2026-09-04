import { Button, EmptyState, Sheet } from "@oshap/shared/ui";
import { useNotifications } from "../context/NotificationContext";

/**
 * The guest's notification list.
 *
 * The shell became `Sheet`; the contents had not caught up and were still
 * hand-rolled against the design system rather than with it:
 *
 * - the two footer actions were bare `<button>`s labelled `text-title-large`,
 *   a 22px display role used as a button label — three steps above the
 *   `label-large` every other button in the product uses
 * - the rows were `rounded-2xl`, which in this scale is 32px: the pill radius,
 *   on a rectangular list row
 * - they sat on `bg-surface`, the PAGE tone, inside a `surface-container-low`
 *   sheet — so a nested block was lighter than the thing containing it, which
 *   inverts the elevation ladder
 * - read rows were dimmed with `opacity-75`, which composites the text back
 *   down instead of choosing a quieter role
 * - the empty state was hand-drawn next to a shared `EmptyState`
 *
 * And one real defect: each row was a `<div onClick>`. Not focusable, no role,
 * no keyboard. It is a `<button>` now, disabled once read, because a read
 * notification has nothing left to do and should not be a tab stop.
 */
export default function NotificationSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { notifications, markAsRead, markAllAsRead, clearAll } =
    useNotifications();

  if (!isOpen) return null;

  return (
    <Sheet
      onClose={onClose}
      title="Notifications"
      bodyClassName="flex flex-col gap-s"
      footer={
        notifications.length > 0 ? (
          <div className="flex justify-between gap-s">
            <Button variant="text" destructive onClick={clearAll}>
              Clear all
            </Button>
            <Button variant="text" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          </div>
        ) : undefined
      }
    >
      {notifications.length === 0 ? (
        <EmptyState
          icon="mgc_notification_off_line"
          title="Nothing yet"
          message="Updates about your order will show up here."
          card={false}
        />
      ) : (
        notifications.map((n) => (
          <button
            key={n.id}
            type="button"
            disabled={n.read}
            onClick={() => markAsRead(n.id)}
            className={`flex items-start gap-s p-md rounded-sm border text-left transition-colors ${
              n.read
                ? "bg-surface-container border-transparent"
                : "bg-surface-container border-primary hover:bg-surface-container-high"
            }`}
          >
            <span
              aria-hidden="true"
              className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${
                n.read ? "bg-transparent" : "bg-primary"
              }`}
            />
            <span className="flex flex-col gap-0.5 min-w-0">
              <span
                className={`text-body-medium ${
                  n.read
                    ? "text-on-surface-variant"
                    : "text-on-surface font-medium"
                }`}
              >
                {n.message}
              </span>
              <span className="text-body-small text-on-surface-variant tabular-nums">
                {new Date(n.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </span>
          </button>
        ))
      )}
    </Sheet>
  );
}
