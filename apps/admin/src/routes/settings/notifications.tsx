import type { NotificationType } from "@oshap/shared";
import { NOTIFICATION_META } from "../../notificationCopy";

/**
 * Who gets told what.
 *
 * **Read-only, and deliberately so.** Routing happens server-side and is not
 * configurable: a kitchen account must not receive payment notifications and
 * then have the client hide them, because that leaks the day's takings to
 * whoever is on the pass. The list endpoint returns only what the caller's
 * role is entitled to.
 *
 * So this screen answers a question rather than offering a control — "why
 * didn't the bar see that?" is asked most Saturdays, and until now the only
 * answer was in a markdown file in the repo.
 *
 * The matrix mirrors `docs/notifications.md`. If the server's routing changes,
 * this changes with it.
 */

const ROLES = [
  "OWNER",
  "MANAGER",
  "CASHIER",
  "WAITER",
  "KITCHEN",
  "BARTENDER",
] as const;

type Role = (typeof ROLES)[number];

const ROUTING: Record<string, ReadonlyArray<Role>> = {
  waiter_called: ["OWNER", "MANAGER", "WAITER"],
  pos_requested: ["OWNER", "MANAGER", "CASHIER", "WAITER"],
  new_order: ["OWNER", "MANAGER", "KITCHEN", "BARTENDER"],
  order_ready: ["OWNER", "MANAGER", "WAITER"],
  payment_claimed: ["OWNER", "MANAGER", "CASHIER"],
  low_stock: ["OWNER", "MANAGER"],
};

/** Short enough to sit above a column on a phone. */
const ROLE_SHORT: Record<Role, string> = {
  OWNER: "Own",
  MANAGER: "Mgr",
  CASHIER: "Cash",
  WAITER: "Wait",
  KITCHEN: "Kit",
  BARTENDER: "Bar",
};

const TYPE_LABELS: Record<string, string> = {
  waiter_called: "Waiter requested",
  pos_requested: "Card machine requested",
  new_order: "New order",
  order_ready: "Ready to run",
  payment_claimed: "Payment to verify",
  low_stock: "Running low",
};

export default function NotificationSettings() {
  return (
    <div className="flex flex-col gap-md">
      <p className="text-caption-md text-secondary-text">
        Alerts are routed by role, and the routing is fixed. A kitchen account
        never receives payment alerts — hiding them in the app would still have
        sent the day&rsquo;s takings to whoever is on the pass, so the server
        simply doesn&rsquo;t send them.
      </p>

      <div className="bg-surface-container-low rounded-md overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="px-md py-s text-caption-md font-semibold text-secondary-text">
                Alert
              </th>
              {ROLES.map((role) => (
                <th
                  key={role}
                  scope="col"
                  title={role}
                  className="px-s py-s text-caption-xs font-semibold text-secondary-text text-center whitespace-nowrap"
                >
                  {ROLE_SHORT[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(ROUTING).map((type) => {
              const meta = NOTIFICATION_META[type as NotificationType];
              const goes = ROUTING[type] ?? [];
              return (
                <tr
                  key={type}
                  className="border-b border-outline-variant last:border-none"
                >
                  <th
                    scope="row"
                    className="px-md py-s font-normal text-caption-md text-primary-text whitespace-nowrap"
                  >
                    <span className="flex items-center gap-s">
                      <i
                        className={`${meta?.iconClass ?? "mgc_notification_line"} ${meta?.iconColorClass ?? "text-on-surface-variant"} text-base shrink-0`}
                        aria-hidden
                      />
                      {TYPE_LABELS[type] ?? type}
                    </span>
                  </th>
                  {ROLES.map((role) => {
                    const on = goes.includes(role);
                    return (
                      <td key={role} className="px-s py-s text-center">
                        {/* A dash, not an empty cell: an empty one reads as
                            missing data rather than as "no, on purpose". */}
                        <span
                          className={
                            on
                              ? "text-success font-bold"
                              : "text-outline"
                          }
                          aria-label={
                            on ? `${role} receives this` : `${role} does not`
                          }
                        >
                          {on ? "✓" : "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-caption-xs text-secondary-text">
        New orders reach the kitchen or the bar by the same category split the
        kitchen board uses, so a bartender isn&rsquo;t woken for a plate of rice.
      </p>
    </div>
  );
}
