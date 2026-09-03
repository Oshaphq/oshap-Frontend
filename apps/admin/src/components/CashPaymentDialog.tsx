import { useState } from "react";
import {
  cashTender,
  settlesBill,
  errorMessage,
  formatCurrency,
  nairaToKobo,
  useAdminRecordCash,
} from "@oshap/shared";
import type { PaymentMethod } from "@oshap/shared";
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

const METHODS: Array<{ value: PaymentMethod; label: string; icon: string }> = [
  { value: "CASH", label: "Cash", icon: "mgc_cash_line" },
  { value: "POS", label: "Card", icon: "mgc_card_pay_line" },
  { value: "MANUAL_TRANSFER", label: "Transfer", icon: "mgc_bank_line" },
];

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
  /**
   * Cash by default because that is what this is usually for, but a waiter who
   * carried the machine over or watched a transfer land should say so. A method
   * recorded wrongly is a reconciliation nobody can do afterwards.
   */
  const [method, setMethod] = useState<PaymentMethod>("CASH");

  // The endpoint accepts what was handed over, so it's recorded rather than
  // only used to work out change.
  const tenderedKobo = tendered === "" ? null : nairaToKobo(Number(tendered));
  const tender = cashTender(tenderedKobo, total);
  const settles = settlesBill(tender);

  const handleConfirm = () => {
    if (orderIds.length === 0) return;
    recordCash.mutate(
      {
        order_ids: orderIds,
        method,
        // Only sent when it was actually entered — a blank field is "didn't
        // record it", not "nothing was handed over".
        ...(tenderedKobo != null ? { amount: tenderedKobo } : {}),
      },
      {
        onSuccess: (result) => {
          // Report the balance the server worked out rather than our own
          // arithmetic — a second guest may have paid while this was open.
          const owing = (result.results ?? []).reduce(
            (sum, r) => sum + r.balance_due,
            0,
          );
          toast.success(
            owing > 0
              ? `Recorded. ${formatCurrency(owing)} still owing on ${tableName}`
              : `${tableName} settled`,
          );
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
        className="w-full max-w-[420px] rounded-lg bg-surface-container-high p-l flex flex-col gap-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-md">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-bold text-on-surface">Take cash</h3>
            <p className="text-body-medium text-on-surface-variant">Table {tableName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-highest transition-colors"
          >
            <i className="mgc_close_line" />
          </button>
        </div>

        {/* No spinner: the table is passed in, so there is nothing to wait for. */}
        {orderIds.length === 0 ? (
          <p className="text-body-medium text-on-surface-variant py-l text-center">
            This table has no unpaid bill.
          </p>
        ) : (
          <>
            <div className="flex flex-col items-center gap-xs py-l rounded-sm bg-surface-container">
              <span className="text-label-small font-semibold uppercase tracking-wider text-on-surface-variant">
                Amount due
              </span>
              <span className="font-display text-display-medium font-medium text-primary-label">
                {formatCurrency(total)}
              </span>
            </div>

            <div className="flex flex-col gap-xs">
              <span className="text-body-medium font-semibold text-on-surface">
                How did they pay?
              </span>
              <div className="flex gap-xs">
                {METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    aria-pressed={method === m.value}
                    className={`flex-1 flex items-center justify-center gap-xs px-s py-s rounded-sm text-body-medium font-semibold transition-colors ${
                      method === m.value
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-highest"
                    }`}
                  >
                    <i className={m.icon} aria-hidden /> {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-s">
              <label
                className="text-body-medium font-semibold text-on-surface"
                htmlFor="tendered"
              >
                Amount received (optional)
              </label>
              <input
                id="tendered"
                type="number"
                inputMode="decimal"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                placeholder="Amount in ₦"
                className="w-full px-md py-s rounded-sm bg-surface-container-low border border-outline-variant text-body-medium text-on-surface placeholder:text-on-surface-placeholder outline-none focus:border-primary transition-colors"
              />
              <div className="flex flex-wrap gap-xs">
                {QUICK_NOTES.map((note) => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => setTendered(String(note))}
                    className="px-md py-xs rounded-full bg-surface-container text-on-surface-variant text-body-medium font-semibold hover:bg-surface-container-highest transition-colors"
                  >
                    ₦{note.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Saves the cashier doing subtraction at a busy till, which is
                where change mistakes come from. */}
            {tender.kind === "change" && (
              <div className="flex items-center justify-between p-md rounded-sm bg-success-container text-on-success-container">
                <span className="text-label-large font-semibold">Change due</span>
                <span className="font-display text-title-medium font-semibold tabular-nums">
                  {formatCurrency(tender.change)}
                </span>
              </div>
            )}
            {/* A part payment is a normal thing to take now. This used to
                refuse it, because the endpoint booked the full amount either
                way and the shortfall vanished. */}
            {tender.kind === "short" && (
              <div className="flex flex-col gap-xs p-md rounded-sm bg-warning-container text-on-warning-container">
                <div className="flex items-center justify-between">
                  <span className="text-label-large font-semibold">Still owing</span>
                  <span className="font-display text-title-medium font-semibold tabular-nums">
                    {formatCurrency(tender.shortfall)}
                  </span>
                </div>
                <p className="text-body-medium">
                  Recorded as a part payment. The bill stays open for the rest,
                  and the table stays lit.
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
                disabled={recordCash.isPending}
              >
                {recordCash.isPending
                  ? "Recording…"
                  : settles
                    ? `Mark ${formatCurrency(total)} paid`
                    : // Never "paid" over an amount that leaves a balance.
                      `Take ${formatCurrency(tenderedKobo ?? 0)}`}
              </PrimaryButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
