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
    return <QueryError onRetry={() => report.refetch()} />;
  }

  const data = report.data;
  const hasTakings = (data?.order_count ?? 0) > 0;

  return (
    <main className="p-md flex flex-col gap-l max-w-[42rem]">
      <header className="flex flex-wrap items-center justify-between gap-md">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-display-h2 font-semibold text-primary-text">
            Daily close
          </h1>
          <p className="text-caption-md text-secondary-text">
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
            className="px-md py-s rounded-lg bg-surface-container-low border border-outline-variant text-p2 text-primary-text outline-none focus:border-primary transition-colors"
          />
          <SecondaryButton size="md" onClick={handlePrint} disabled={!hasTakings}>
            <i className="mgc_print_line" /> Print
          </SecondaryButton>
        </div>
      </header>

      {report.isLoading ? (
        <div className="flex justify-center py-xl">
          <div className="oshap-spinner" />
        </div>
      ) : !hasTakings ? (
        <div className="flex flex-col items-center gap-xs py-10 px-md text-center rounded-md bg-surface-container-low">
          <i className="mgc_receipt_line text-5xl text-outline-variant opacity-40" />
          <span className="font-display text-display-h4 font-semibold text-primary-text">
            Nothing settled on this date
          </span>
          <p className="text-p2 text-secondary-text">
            Orders appear here once they&rsquo;re paid for.
          </p>
        </div>
      ) : (
        data && (
          <>
            <section className="bg-surface-container-low rounded-md p-l flex flex-col gap-md">
              <h2 className="text-label-l2 font-semibold text-primary-text">
                Takings by method
              </h2>
              <div className="flex flex-col">
                {data.by_method.map((line) => (
                  <div
                    key={line.method}
                    className="flex items-center justify-between gap-md py-s border-b border-outline-variant last:border-none"
                  >
                    <span className="text-p2 text-primary-text">
                      {METHOD_LABELS[line.method] ?? line.method}
                      <span className="text-secondary-text">
                        {" "}
                        · {line.count} order{line.count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="text-label-l3 font-semibold text-primary-text tabular-nums">
                      {formatCurrency(line.total)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-surface-container-low rounded-md p-l flex flex-col gap-md">
              <h2 className="text-label-l2 font-semibold text-primary-text">
                Breakdown
              </h2>
              <div className="flex flex-col">
                <Line label="Gross sales" value={data.gross_sales} />
                <Line label="Discounts" value={-data.discounts} />
                <Line label="Service charge" value={data.service_charge} />
                <Line label="VAT" value={data.vat} />
                <Line label="Tips" value={data.tips} />
                <Line label="Refunds" value={-data.refunds} />
                <div className="flex items-center justify-between gap-md pt-md mt-s border-t-2 border-ink">
                  <span className="text-label-l2 font-semibold text-primary-text">
                    Net takings
                  </span>
                  <span className="font-display text-display-h2 font-semibold text-primary tabular-nums">
                    {formatCurrency(data.net_sales)}
                  </span>
                </div>
              </div>
              <p className="text-caption-md text-secondary-text">
                {data.order_count} settled order
                {data.order_count === 1 ? "" : "s"} on {data.date}
              </p>
              <Link
                to="/audit"
                className="text-caption-md font-semibold text-primary hover:underline no-underline oshap-print-hide"
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

/** A signed line — negatives are shown as deductions rather than raw minus figures. */
function Line({ label, value }: { label: string; value: number }) {
  const isDeduction = value < 0;
  return (
    <div className="flex items-center justify-between gap-md py-s border-b border-outline-variant last:border-none">
      <span className="text-p2 text-secondary-text">{label}</span>
      <span
        className={`text-label-l3 font-semibold tabular-nums ${
          isDeduction ? "text-error" : "text-primary-text"
        }`}
      >
        {isDeduction ? `− ${formatCurrency(-value)}` : formatCurrency(value)}
      </span>
    </div>
  );
}
