import { useState } from "react";
import { Link } from "react-router";
import { formatCurrency, useAdminZReport } from "@oshap/shared";
import type { PaymentMethod } from "@oshap/shared";
import { SecondaryButton } from "@oshap/shared/ui";
import QueryError from "../components/QueryError";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  MANUAL_TRANSFER: "Bank transfer",
  POS: "Card / POS",
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * End-of-day close.
 *
 * Laid out as a reconciliation, not a dashboard: the manager reads it top to
 * bottom against the till, so every line the total is built from is shown and
 * the arithmetic is visible rather than summarised. The per-method split is the
 * part that gets checked against the drawer, so it sits closest to the total.
 */
export default function ZReportPage() {
  const [date, setDate] = useState(today());
  const report = useAdminZReport(date);

  const handlePrint = () => window.print();

  if (report.isError) {
    return (
      <QueryError
        error={report.error}
        action="load the report"
        onRetry={() => report.refetch()}
      />
    );
  }

  const data = report.data;
  const hasTakings = (data?.order_count ?? 0) > 0;

  return (
    <main className="p-md flex flex-col gap-l max-w-[42rem]">
      <header className="flex flex-wrap items-center justify-between gap-md">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-title-large font-semibold text-on-surface">
            Daily close
          </h1>
          <p className="text-body-medium text-on-surface-variant">
            Settled orders only — an unpaid bill isn&rsquo;t takings.
          </p>
        </div>
        <div className="flex items-center gap-s oshap-print-hide">
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Report date"
            className="px-md py-s rounded-sm bg-surface-container-low border border-outline-variant text-body-medium text-on-surface outline-none focus:border-primary transition-colors"
          />
          <SecondaryButton
            size="md"
            onClick={handlePrint}
            disabled={!hasTakings}
          >
            <i className="mgc_print_line" /> Print
          </SecondaryButton>
        </div>
      </header>

      {report.isLoading ? (
        <div className="flex justify-center py-xl">
          <div className="oshap-spinner" />
        </div>
      ) : !hasTakings ? (
        <div className="flex flex-col items-center gap-xs py-10 px-md text-center rounded-lg bg-surface-container-low">
          <i className="mgc_bill_line text-5xl text-outline-variant opacity-40" />
          <span className="font-display text-title-medium font-semibold text-on-surface">
            Nothing settled on this date
          </span>
          <p className="text-body-medium text-on-surface-variant">
            Orders appear here once they&rsquo;re paid for.
          </p>
        </div>
      ) : (
        data && (
          <>
            <section className="bg-surface-container-low rounded-lg p-l flex flex-col gap-md">
              <h2 className="text-title-large font-semibold text-on-surface">
                Takings by method
              </h2>
              {/* The three lines that get checked against the drawer, so they
                  sit closest to the total and always show — a method with no
                  takings is itself worth seeing. */}
              <div className="flex flex-col">
                {/* The methods are their own group so that `last:border-none`
                    lands on the last of them. It was reaching for the total
                    row instead, which draws its own rule — so Card / POS kept
                    a border and the two sat 8px apart as a double line. */}
                <div className="flex flex-col">
                  <Line label={METHOD_LABELS.CASH} value={data.cash_total} />
                  <Line
                    label={METHOD_LABELS.MANUAL_TRANSFER}
                    value={data.transfer_total}
                  />
                  <Line label={METHOD_LABELS.POS} value={data.pos_total} />
                </div>
                <div className="flex items-center justify-between gap-md pt-md border-t-2 border-ink">
                  <span className="text-title-large font-semibold text-on-surface">
                    Total takings
                  </span>
                  <span className="font-display text-title-large font-semibold text-primary-label tabular-nums">
                    {formatCurrency(data.total_sales)}
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-low rounded-lg p-l flex flex-col gap-md">
              <h2 className="text-title-large font-semibold text-on-surface">
                Included in the day
              </h2>
              {/* Reported figures, not an equation. The server sends no
                  "sales before adjustments", so presenting these as arithmetic
                  that resolves to the total would be inventing a sum. */}
              <div className="flex flex-col">
                <Line label="VAT collected" value={data.vat_collected} />
                <Line
                  label="Service charge collected"
                  value={data.service_charge_collected}
                />
                <Line label="Discounts given" value={data.discount_total} />
                <Line label="Tips" value={data.tip_total} />
                <Line label="Refunded" value={data.refund_total} isDeduction />
              </div>
              <p className="text-body-medium text-on-surface-variant">
                {data.order_count} settled order
                {data.order_count === 1 ? "" : "s"} on {data.date}
              </p>
              <Link
                to="/audit"
                className="text-body-medium font-semibold text-primary-label hover:underline no-underline oshap-print-hide"
              >
                Not adding up? See what changed →
              </Link>
            </section>
          </>
        )
      )}
    </main>
  );
}

/** `isDeduction` marks money that left, which the server reports as a positive. */
function Line({
  label,
  value,
  isDeduction: forceDeduction = false,
}: {
  label: string;
  value: number;
  isDeduction?: boolean;
}) {
  const isDeduction = forceDeduction ? value > 0 : value < 0;
  return (
    <div className="flex items-center justify-between gap-md py-s border-b border-outline-variant last:border-none">
      <span className="text-body-medium text-on-surface-variant">{label}</span>
      <span
        className={`text-title-medium font-semibold tabular-nums ${
          isDeduction ? "text-error" : "text-on-surface"
        }`}
      >
        {isDeduction
          ? `− ${formatCurrency(Math.abs(value))}`
          : formatCurrency(value)}
      </span>
    </div>
  );
}
