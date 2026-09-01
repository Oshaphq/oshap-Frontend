import { formatCurrency } from "@oshap/shared";
import type { Bill, BillState } from "@oshap/shared";

/**
 * A table's open bills, one row each.
 *
 * A table is not a bill. Two friends who order separately owe separately, and
 * the board could not say so — it showed one total and one set of buttons, so
 * verifying one guest's transfer settled a bill and left the table lit for the
 * other's. That read as a broken button rather than as the correct answer.
 *
 * The label says **bills**, never guests. One person ordering for a table of
 * four is one bill and four people; tables carry no seat count, so "2 guests"
 * would be a guess where "2 bills" is a fact.
 */

const STATE_META: Record<BillState, { label: string; cls: string }> = {
  claimed: {
    label: "Says paid",
    cls: "bg-warning text-on-warning",
  },
  part: {
    label: "Part paid",
    cls: "bg-warning-container text-on-warning-container",
  },
  unpaid: {
    label: "Owes",
    cls: "bg-error-container text-on-error-container",
  },
  settled: {
    label: "Paid",
    cls: "bg-success-container text-on-success-container",
  },
  unknown: {
    label: "Unclear",
    cls: "bg-surface-container-high text-on-surface-variant",
  },
};

/**
 * Named only where it changes what staff do.
 *
 * A card request means carry the machine over; a transfer means check the
 * account and verify. Cash needs no label — it is the default and saying so
 * adds noise to every row.
 *
 * It gets its own line rather than trailing the order count. Appended, it read
 * as one long grey string that a waiter had to parse to the end; on its own it
 * is the instruction, and it is what they are looking for.
 */
function methodLabel(method: string | null): string | null {
  if (method === "POS") return "Card machine";
  if (method === "MANUAL_TRANSFER") return "Transfer";
  return null;
}

interface Props {
  bills: Bill[];
  /** Renders under the bill it belongs to, so an action names its own row. */
  renderActions?: (bill: Bill) => React.ReactNode;
}

export default function TableBills({ bills, renderActions }: Props) {
  if (bills.length === 0) return null;

  return (
    <div className="flex flex-col gap-xs">
      {bills.length > 1 && (
        <span className="text-label-small font-semibold uppercase tracking-wider text-on-surface-variant">
          {bills.length} bills open
        </span>
      )}
      {bills.map((bill) => {
        const meta = STATE_META[bill.state];
        const detail =
          bill.state === "part"
            ? `${formatCurrency(bill.amountPaid)} of ${formatCurrency(bill.total)} paid`
            : bill.orders.length > 1
              ? `${bill.orders.length} orders`
              : null;
        const method = methodLabel(bill.paymentMethod);
        return (
          <div
            key={bill.key}
            className="flex flex-col gap-xs p-s rounded-sm bg-surface-container"
          >
            <div className="flex items-center justify-between gap-s">
              <div className="flex flex-col min-w-0">
                <span className="text-label-medium font-semibold text-on-surface truncate">
                  {bill.guestName ?? "Guest"}
                </span>
                {detail && (
                  <span className="text-label-small text-on-surface-variant">
                    {detail}
                  </span>
                )}
                {method && (
                  <span className="text-label-small text-on-surface-variant">
                    {method}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-s shrink-0">
                <span className="text-label-medium font-semibold tabular-nums text-on-surface">
                  {/* The balance, not the total. A waiter collecting on a part
                      paid bill needs the number they are about to ask for. */}
                  {formatCurrency(
                    bill.state === "settled" ? bill.total : bill.balanceDue,
                  )}
                </span>
                <span
                  className={`px-s py-0.5 rounded-full font-bold text-label-small uppercase tracking-wider whitespace-nowrap ${meta.cls}`}
                >
                  {meta.label}
                </span>
              </div>
            </div>

            {bill.state === "unknown" && (
              /* Deliberately no money button. `payment_state` is an untyped
                 string, so a value we cannot read might mean already paid —
                 and offering Take Cash there charges a guest twice. */
              <p className="text-label-small text-on-surface-variant">
                We can't tell whether this is paid. Check the order before
                taking money.
              </p>
            )}

            {renderActions?.(bill)}
          </div>
        );
      })}
    </div>
  );
}
