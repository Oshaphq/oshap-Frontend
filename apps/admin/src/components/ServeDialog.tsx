import { useState } from "react";
import { errorMessage, formatCurrency, useAdminServeOrder } from "@oshap/shared";
import type { ServeOrderRequest } from "@oshap/shared";
import {
  Dialog,
  SecondaryButton,
  toast,
} from "@oshap/shared/ui";

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
 * *Not yet* is a real answer, not an omission. The food is out, the bill stays
 * open, the table stays lit, and the guest's own pay screen keeps working so
 * they can settle after eating.
 */

type Method = NonNullable<ServeOrderRequest["method"]>;

const METHODS: Array<{ value: Method; label: string; icon: string }> = [
  { value: "CASH", label: "Cash", icon: "mgc_cash_line" },
  // The commonest way a card gets paid is a waiter walking the machine over,
  // often on the same trip as the food.
  { value: "POS", label: "Card machine", icon: "mgc_card_pay_line" },
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
  const [choice, setChoice] = useState<Method | "later" | null>(null);

  const confirm = (method?: Method) => {
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
    <Dialog
      onClose={onClose}
      title="Food delivered"
      subtitle={<>Table {tableName}</>}
    >
      <div className="flex flex-col items-center gap-xs py-l rounded-sm bg-surface-container">
        <span className="text-label-small font-semibold uppercase tracking-wider text-on-surface-variant">
          Bill
        </span>
        <span className="font-display text-display-medium font-medium text-primary-label">
          {formatCurrency(total)}
        </span>
      </div>

      <span className="text-body-medium font-semibold text-on-surface">
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
            className="flex items-center justify-between gap-s px-md py-s rounded-sm bg-surface-container text-on-surface text-label-medium font-semibold hover:bg-surface-container-highest active:scale-[0.99] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 transition"
          >
            <span className="flex items-center gap-s">
              <i className={`${m.icon} text-xl text-primary-label`} aria-hidden />
              {m.label}
            </span>
            <span className="text-body-medium text-on-surface-variant">
              {serve.isPending && choice === m.value
                ? "Recording…"
                : `Settles ${formatCurrency(total)}`}
            </span>
          </button>
        ))}

        {/* Not a lesser option. A guest paying after their meal is ordinary,
            and recording it honestly is what keeps the bill collectable. */}
        <button
          type="button"
          disabled={serve.isPending}
          onClick={() => {
            setChoice("later");
            confirm();
          }}
          className="flex items-center justify-between gap-s px-md py-s rounded-sm border border-outline-variant text-on-surface text-label-medium font-semibold hover:bg-surface-container active:scale-[0.99] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 transition"
        >
          <span className="flex items-center gap-s">
            <i className="mgc_time_line text-xl text-on-surface-variant" aria-hidden />
            Not yet
          </span>
          <span className="text-body-medium text-on-surface-variant">
            {serve.isPending && choice === "later"
              ? "Recording…"
              : "Bill stays open"}
          </span>
        </button>
      </div>

      <div className="flex justify-end">
        <SecondaryButton size="md" onClick={onClose} disabled={serve.isPending}>
          Cancel
        </SecondaryButton>
      </div>
    </Dialog>
  );
}
