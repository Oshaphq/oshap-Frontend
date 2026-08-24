import { useState } from "react";
import { errorMessage, formatCurrency, useAdminServeOrder } from "@oshap/shared";
import type { ServeOrderRequest } from "@oshap/shared";
import { SecondaryButton, toast } from "@oshap/shared/ui";

/**
 * Marking food delivered, and saying how it was paid for in the same tap.
 *
 * Two things happen at a table at once — the plate lands and the money changes
 * hands — and until now the system recorded neither. An order could sit in
 * READY for an hour with no way to tell a plate going cold on the pass from a
 * waiter who forgot to tap.
 *
 * **Nothing is assumed paid.** An earlier version of this had serving settle
 * the bill silently. The waiter says how the money arrived at the moment it
 * arrives instead, so there is no inferred payment anywhere in the flow — and
 * no way for a guest to be charged twice for the same meal.
 *
 * *Not yet* — served, still owed — is the branch this was built around, and it
 * is withdrawn for now: the endpoint cancels the order and clears the table
 * when no method is given, which loses the bill. Until that is fixed, food can
 * only be marked served together with payment, and an unpaid table is settled
 * from the board instead.
 */

type Method = NonNullable<ServeOrderRequest["method"]>;

const METHODS: Array<{ value: Method; label: string; icon: string }> = [
  { value: "CASH", label: "Cash", icon: "mgc_cash_line" },
  { value: "MANUAL_TRANSFER", label: "Transfer", icon: "mgc_bank_line" },
];

interface Props {
  orderId: string;
  /** The name staff read, for the heading. */
  tableName: string;
  /** What the bill comes to, in kobo. */
  total: number;
  onClose: () => void;
}

export default function ServeDialog({ orderId, tableName, total, onClose }: Props) {
  const serve = useAdminServeOrder();
  const [choice, setChoice] = useState<Method | null>(null);

  const confirm = (method: Method) => {
    serve.mutate(
      { orderId, method },
      {
        onSuccess: (result) => {
          toast.success(
            result.settled
              ? `${tableName} served and settled`
              : `${tableName} served — ${formatCurrency(result.balance_due)} still owing`,
          );
          onClose();
        },
        onError: (err) => toast.error(errorMessage(err, "mark it served")),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-sm p-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Mark table ${tableName} served`}
        className="w-full max-w-[420px] rounded-md bg-surface-container-high p-l flex flex-col gap-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-md">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-bold text-primary-text">Food delivered</h3>
            <p className="text-caption-md text-secondary-text">Table {tableName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-4xl bg-surface-container text-on-surface-variant hover:bg-surface-container-highest transition-colors"
          >
            <i className="mgc_close_line" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-xs py-l rounded-lg bg-surface-container">
          <span className="text-caption-xs font-semibold uppercase tracking-wider text-secondary-text">
            Bill
          </span>
          <span className="font-emphasized text-emphasized-md font-medium text-primary">
            {formatCurrency(total)}
          </span>
        </div>

        <span className="text-caption-md font-semibold text-primary-text">
          How did they pay?
        </span>

        <div className="flex flex-col gap-s">
          {METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              disabled={serve.isPending}
              onClick={() => {
                setChoice(m.value);
                confirm(m.value);
              }}
              className="flex items-center justify-between gap-s px-md py-s rounded-lg bg-surface-container text-primary-text text-label-l5 font-semibold hover:bg-surface-container-highest active:scale-[0.99] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 transition"
            >
              <span className="flex items-center gap-s">
                <i className={`${m.icon} text-xl text-primary`} aria-hidden />
                {m.label}
              </span>
              <span className="text-caption-md text-secondary-text">
                {serve.isPending && choice === m.value
                  ? "Recording…"
                  : `Settles ${formatCurrency(total)}`}
              </span>
            </button>
          ))}

          {/* "Not yet" is missing on purpose, and it is the branch this whole
              flow was built around.

              Serving without a method is what the endpoint is for — food out,
              bill still open — and in service it cancelled the order and
              cleared the table, taking a ₦26,638.50 bill with it. A button that
              destroys a bill is worse than no button, so it is gone until the
              server keeps the bill open. `ServeOrderRequest.method` is required
              in the meantime, so nothing can reach that path by accident. */}
        </div>

        <p className="text-caption-xs text-outline">
          Not paying yet, or paying by card? Leave this and take it from the
          table board instead — marking food served without payment is
          temporarily unavailable.
        </p>

        <div className="flex justify-end">
          <SecondaryButton size="md" onClick={onClose} disabled={serve.isPending}>
            Cancel
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
