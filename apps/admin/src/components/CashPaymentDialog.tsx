import { useState } from "react";
import {
  canSettleCash,
  cashTender,
  errorMessage,
  formatCurrency,
  nairaToKobo,
  useAdminRecordCash,
} from "@oshap/shared";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";

interface Props {
  /** The name staff read, for the heading. */
  tableName: string;
  /**
   * The orders this payment settles.
   *
   * Scoped by the caller, because a table can hold two guests' bills and
   * taking cash from one of them must not settle the other's. The dashboard
   * passes one bill's orders; there is no table-wide default here on purpose.
   */
  orderIds: string[];
  /** What those orders come to, in kobo. */
  total: number;
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
 * Takes the orders it is given rather than fetching anything. It used to call
 * `GET /table/{id}`, which is the **guest's** endpoint: it scopes the bill to
 * the device asking. The admin browser has never ordered anything, so every
 * table came back empty and the dialog said "This table has no unpaid bill"
 * over a card reading ₦75,061.88.
 *
 * Now scoped to one bill, because a table can hold two of them and cash from
 * one guest must not settle the other's.
 */
export default function CashPaymentDialog({
  tableName,
  orderIds,
  total,
  onClose,
}: Props) {
  const recordCash = useAdminRecordCash();

  const [tendered, setTendered] = useState("");

  // The endpoint accepts what was handed over, so it's recorded rather than
  // only used to work out change.
  const tenderedKobo = tendered === "" ? null : nairaToKobo(Number(tendered));
  const tender = cashTender(tenderedKobo, total);
  const canSettle = canSettleCash(tender);

  const handleConfirm = () => {
    if (orderIds.length === 0 || !canSettle) return;
    recordCash.mutate(
      {
        order_ids: orderIds,
        // Only sent when it was actually entered — a blank field is "didn't
        // record it", not "nothing was handed over".
        ...(tenderedKobo != null ? { amount: tenderedKobo } : {}),
      },
      {
        onSuccess: () => {
          toast.success(`Cash recorded for ${tableName}`);
          onClose();
        },
        onError: (err) =>
          toast.error(
            errorMessage(err, "record the payment"),
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
        aria-label={`Record cash payment for table ${tableName}`}
        className="w-full max-w-[420px] rounded-md bg-surface-container-high p-l flex flex-col gap-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-md">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-bold text-primary-text">Take cash</h3>
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

        {/* No spinner: the table is passed in, so there is nothing to wait for. */}
        {orderIds.length === 0 ? (
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
            {tender.kind === "change" && (
              <div className="flex items-center justify-between p-md rounded-lg bg-success-container text-on-success-container">
                <span className="text-label-l4 font-semibold">Change due</span>
                <span className="font-display text-display-h3 font-semibold tabular-nums">
                  {formatCurrency(tender.change)}
                </span>
              </div>
            )}
            {/* Blocks rather than warns. This used to show the shortfall and
                settle the full bill anyway, so the missing money left no
                trace. */}
            {tender.kind === "short" && (
              <div className="flex flex-col gap-xs p-md rounded-lg bg-warning-container text-on-warning-container">
                <div className="flex items-center justify-between">
                  <span className="text-label-l4 font-semibold">Short by</span>
                  <span className="font-display text-display-h3 font-semibold tabular-nums">
                    {formatCurrency(tender.shortfall)}
                  </span>
                </div>
                <p className="text-caption-md">
                  Cash settles the whole bill — there's no part payment. Take the
                  rest, or clear the box to settle without recording a figure.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-s pt-s">
              <SecondaryButton size="md" onClick={onClose}>
                Cancel
              </SecondaryButton>
              <PrimaryButton
                size="md"
                onClick={handleConfirm}
                disabled={recordCash.isPending || !canSettle}
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
