import { useState } from "react";
import {
  formatCurrency,
  getDeviceToken,
  nairaToKobo,
  useAdminRecordCash,
  useTable,
} from "@oshap/shared";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";

interface Props {
  tableId: string;
  onClose: () => void;
}

/** Notes a cashier is likely to be handed. */
const QUICK_NOTES = [500, 1000, 2000, 5000, 10000];

/**
 * Records cash taken at the table.
 *
 * Unlike transfers there's nothing to verify — a staff member is standing there
 * with the money — so this settles the bill outright.
 *
 * The order ids come from the public table endpoint. The admin tables response
 * carries totals but not order ids, so this is one extra round-trip; adding
 * `unpaid_order_ids` to `AdminTableStatus` would remove it.
 */
export default function CashPaymentDialog({ tableId, onClose }: Props) {
  const recordCash = useAdminRecordCash();
  const tableQuery = useTable({ tableId, deviceToken: getDeviceToken() });

  const [tendered, setTendered] = useState("");

  const unpaid = tableQuery.data?.unpaid_order ?? null;
  const total = unpaid?.total ?? 0;
  const orderIds = unpaid?.combined_order_ids ?? (unpaid ? [unpaid.id] : []);

  // The endpoint accepts what was handed over, so it's recorded rather than
  // only used to work out change.
  const tenderedKobo = tendered === "" ? null : nairaToKobo(Number(tendered));
  const change =
    tenderedKobo !== null && tenderedKobo >= total ? tenderedKobo - total : null;
  const isShort = tenderedKobo !== null && tenderedKobo < total;

  const handleConfirm = () => {
    if (orderIds.length === 0) return;
    recordCash.mutate(
      {
        order_ids: orderIds,
        // Only sent when it was actually entered — a blank field is "didn't
        // record it", not "nothing was handed over".
        ...(tenderedKobo != null ? { amount: tenderedKobo } : {}),
      },
      {
        onSuccess: () => {
          toast.success(`Cash recorded for ${tableId}`);
          onClose();
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Could not record the payment",
          ),
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
        aria-label={`Record cash payment for table ${tableId}`}
        className="w-full max-w-[420px] rounded-md bg-surface-container-high p-l flex flex-col gap-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-md">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-bold text-primary-text">Take cash</h3>
            <p className="text-caption-md text-secondary-text">Table {tableId}</p>
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

        {tableQuery.isLoading ? (
          <div className="flex justify-center py-xl">
            <div className="oshap-spinner" />
          </div>
        ) : orderIds.length === 0 ? (
          <p className="text-p2 text-secondary-text py-l text-center">
            This table has no unpaid bill.
          </p>
        ) : (
          <>
            <div className="flex flex-col items-center gap-xs py-l rounded-lg bg-surface-container">
              <span className="text-caption-xs font-semibold uppercase tracking-wider text-secondary-text">
                Amount due
              </span>
              <span className="font-emphasized text-emphasized-md font-medium text-primary">
                {formatCurrency(total)}
              </span>
            </div>

            <div className="flex flex-col gap-s">
              <label
                className="text-caption-md font-semibold text-primary-text"
                htmlFor="tendered"
              >
                Cash received (optional)
              </label>
              <input
                id="tendered"
                type="number"
                inputMode="decimal"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                placeholder="Amount in ₦"
                className="w-full px-md py-s rounded-lg bg-surface-container-low border border-outline-variant text-p2 text-primary-text placeholder:text-outline outline-none focus:border-primary transition-colors"
              />
              <div className="flex flex-wrap gap-xs">
                {QUICK_NOTES.map((note) => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => setTendered(String(note))}
                    className="px-md py-xs rounded-4xl bg-surface-container text-on-surface-variant text-caption-md font-semibold hover:bg-surface-container-highest transition-colors"
                  >
                    ₦{note.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Saves the cashier doing subtraction at a busy till, which is
                where change mistakes come from. */}
            {change !== null && (
              <div className="flex items-center justify-between p-md rounded-lg bg-success-container text-on-success-container">
                <span className="text-label-l4 font-semibold">Change due</span>
                <span className="font-display text-display-h3 font-semibold tabular-nums">
                  {formatCurrency(change)}
                </span>
              </div>
            )}
            {isShort && (
              <div className="flex items-center justify-between p-md rounded-lg bg-warning-container text-on-warning-container">
                <span className="text-label-l4 font-semibold">Still owing</span>
                <span className="font-display text-display-h3 font-semibold tabular-nums">
                  {formatCurrency(total - (tenderedKobo ?? 0))}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-s pt-s">
              <SecondaryButton size="md" onClick={onClose}>
                Cancel
              </SecondaryButton>
              <PrimaryButton
                size="md"
                onClick={handleConfirm}
                disabled={recordCash.isPending}
              >
                {recordCash.isPending
                  ? "Recording…"
                  : `Mark ${formatCurrency(total)} paid`}
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
