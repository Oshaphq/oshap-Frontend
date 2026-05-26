import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  formatCurrency,
  getDeviceToken,
  useClaimPayment,
  useTable,
} from "@oshap/shared";
import BottomNav from "../components/BottomNav";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import TableBadge from "../components/TableBadge";
import { useSession } from "../context/SessionContext";

const DEFAULT_BANK = {
  bankName: "Access Bank",
  accountNumber: "0123456789",
  accountName: "Aji's Kitchen Ltd",
};

export default function PayPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tableId = params.get("table") ?? "T1";
  const refParam = params.get("ref");
  const { session } = useSession();
  const deviceToken = getDeviceToken();

  const tableQuery = useTable({
    tableId,
    deviceToken,
    sessionId: session?.id,
  });

  // Poll every 5s so a merchant verification is reflected without a manual refresh.
  useEffect(() => {
    const id = setInterval(() => tableQuery.refetch(), 5000);
    return () => clearInterval(id);
  }, [tableQuery.refetch]);

  const claimPayment = useClaimPayment();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard unavailable
    }
  }, []);

  if (tableQuery.isLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low pb-20">
        <PayHeader
          tableId={tableId}
          reference=""
          onBack={() => navigate(`/menu?table=${tableId}`)}
        />
        <div className="flex flex-col items-center gap-s py-10 px-md">
          <div className="oshap-spinner" />
          <p className="text-p2 text-secondary-text">Loading payment details…</p>
        </div>
        <BottomNav tableId={tableId} />
      </div>
    );
  }

  const restaurant = tableQuery.data?.restaurant;
  const bank = restaurant
    ? {
        bankName: restaurant.bank_name ?? DEFAULT_BANK.bankName,
        accountNumber: restaurant.account_number ?? DEFAULT_BANK.accountNumber,
        accountName: restaurant.account_name ?? DEFAULT_BANK.accountName,
      }
    : DEFAULT_BANK;

  const unpaidOrder = tableQuery.data?.unpaid_order ?? null;
  const pendingPayments = tableQuery.data?.pending_payments ?? null;
  const reference = refParam ?? unpaidOrder?.reference ?? "";

  const handleClaimPayment = async () => {
    if (!unpaidOrder) return;
    try {
      await claimPayment.mutateAsync({
        order_id: unpaidOrder.id,
        combined_order_ids: unpaidOrder.combined_order_ids,
      });
    } catch (err) {
      console.error("Payment confirmation error:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Failed to confirm payment. Please try again.",
      );
    }
  };

  // Case 1: clean slate
  if (!unpaidOrder && !pendingPayments && !refParam) {
    return (
      <div className="min-h-screen bg-surface-container-low pb-20">
        <PayHeader
          tableId={tableId}
          reference=""
          onBack={() => navigate(`/menu?table=${tableId}`)}
        />
        <EmptyState
          icon="mgc_check_double_fill"
          iconClassName="text-success"
          title="All Settled"
          message="You have no pending bills. Ready for more?"
          cta="Browse Menu"
          onCta={() => navigate(`/menu?table=${tableId}`)}
        />
        <BottomNav tableId={tableId} />
      </div>
    );
  }

  // Case 2: previously claimed, awaiting verification
  if (!unpaidOrder && pendingPayments) {
    return (
      <div className="min-h-screen bg-surface-container-low pb-20">
        <PayHeader
          tableId={tableId}
          reference={pendingPayments.reference}
          onBack={() => navigate(`/menu?table=${tableId}`)}
        />
        <EmptyState
          icon="mgc_time_line"
          iconClassName="text-outline-variant"
          title="Payment Claimed"
          message={`We've notified the restaurant. They will verify your payment of ${formatCurrency(pendingPayments.total)} shortly.`}
          cta="Order More"
          onCta={() => navigate(`/menu?table=${tableId}`)}
        />
        <BottomNav tableId={tableId} />
      </div>
    );
  }

  // Case 3: unpaid bill — show amount + bank details + CTAs
  const total = unpaidOrder?.total ?? 0;

  return (
    <div className="min-h-screen bg-surface-container-low pb-20">
      <PayHeader
        tableId={tableId}
        reference={reference}
        onBack={() => navigate(`/menu?table=${tableId}`)}
      />

      {pendingPayments && (
        <section className="py-l px-md bg-surface-container-low border-b-[6px] border-surface-container">
          <div className="flex items-start gap-s p-md rounded-lg bg-warning-container text-on-warning-container">
            <i className="mgc_information_line text-xl shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-label-l4 font-semibold font-display">
                Previous payment pending
              </span>
              <p className="text-label-l5">
                {formatCurrency(pendingPayments.total)} is awaiting
                verification. The bill below is only for your new items.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="py-2xl px-md bg-surface-container-low border-b-[6px] border-surface-container flex flex-col items-center gap-s">
        <span className="text-label-l5 font-semibold uppercase tracking-wider text-secondary-text">
          Amount Due
        </span>
        <span className="font-emphasized text-emphasized-md font-medium text-primary">
          {formatCurrency(total)}
        </span>
      </section>

      <section className="py-l px-md bg-surface-container-low border-b-[6px] border-surface-container flex flex-col gap-md">
        <div className="flex flex-col gap-xs">
          <h2 className="font-display text-display-h3 font-semibold text-primary-text">
            Bank Transfer
          </h2>
          <p className="text-p2 text-secondary-text">
            Transfer the exact amount above using the details below.
          </p>
        </div>

        <div className="flex flex-col">
          <DetailRow label="Bank" value={bank.bankName} />
          <Divider />
          <DetailRow
            label="Account Number"
            value={bank.accountNumber}
            copyable
            copied={copiedField === "account"}
            onCopy={() => copyToClipboard(bank.accountNumber, "account")}
          />
          <Divider />
          <DetailRow label="Account Name" value={bank.accountName} />
          <Divider />
          <DetailRow
            label="Reference"
            value={reference}
            copyable
            copied={copiedField === "ref"}
            onCopy={() => copyToClipboard(reference, "ref")}
            mono
          />
        </div>
      </section>

      <section className="py-l px-md bg-surface-container-low flex flex-col gap-md">
        <PrimaryButton
          onClick={handleClaimPayment}
          disabled={claimPayment.isPending}
        >
          {claimPayment.isPending ? "Sending…" : "I've Sent the Money"}
        </PrimaryButton>
        <SecondaryButton onClick={() => navigate(`/menu?table=${tableId}`)}>
          Order More
        </SecondaryButton>
      </section>

      <BottomNav tableId={tableId} />
    </div>
  );
}

function PayHeader({
  tableId,
  reference,
  onBack,
}: {
  tableId: string;
  reference: string;
  onBack: () => void;
}) {
  return (
    <header className="flex items-center justify-between pt-md px-md pb-s bg-surface-container-low">
      <div className="flex items-center gap-s">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container hover:bg-surface-container-high transition-colors"
        >
          <i className="mgc_left_line text-xl" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-display-h2 font-semibold text-primary-text">
            Pay Bill
          </h1>
          {reference && (
            <span className="text-label-l5 text-secondary-text">
              Ref: {reference}
            </span>
          )}
        </div>
      </div>
      <TableBadge tableId={tableId} variant="outlined" />
    </header>
  );
}

function EmptyState({
  icon,
  iconClassName = "text-outline-variant",
  title,
  message,
  cta,
  onCta,
}: {
  icon: string;
  iconClassName?: string;
  title: string;
  message: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-s py-10 px-md text-center">
      <i className={`${icon} text-5xl ${iconClassName}`} />
      <span className="font-display text-display-h4 font-semibold text-primary-text">
        {title}
      </span>
      <p className="text-p2 text-secondary-text max-w-sm">{message}</p>
      <PrimaryButton onClick={onCta} className="mt-md">
        {cta}
      </PrimaryButton>
    </div>
  );
}

function DetailRow({
  label,
  value,
  copyable,
  copied,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  copied?: boolean;
  onCopy?: () => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-md py-s">
      <span className="text-label-l5 text-secondary-text">{label}</span>
      <div className="flex items-center gap-s min-w-0">
        <span
          className={`text-label-l3 font-semibold text-primary-text truncate ${
            mono ? "tracking-wider" : ""
          }`}
        >
          {value}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Copy ${label}`}
            className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-4xl transition-colors ${
              copied
                ? "bg-success-container text-on-success-container"
                : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
            }`}
          >
            <i className={copied ? "mgc_check_line" : "mgc_clipboard_line"} />
          </button>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-outline-variant" />;
}
