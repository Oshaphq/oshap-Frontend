import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  formatCurrency,
  getDeviceToken,
  useClaimPayment,
  useRequestPos,
  useTable,
} from "@oshap/shared";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";
import BottomNav from "../components/BottomNav";
import CustomerHeader from "../components/CustomerHeader";
import { useSession } from "../context/SessionContext";

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



  const claimPayment = useClaimPayment();
  const requestPos = useRequestPos();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const posFlagKey = `oshap-pos-requested-${tableId}`;
  const [posRequested, setPosRequested] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(posFlagKey) === "1";
  });

  const handleRequestPos = async () => {
    if (!tableQuery.data?.unpaid_order || requestPos.isPending) return;
    try {
      await requestPos.mutateAsync({
        table_id: tableId,
        session_id: session?.id,
        device_token: deviceToken,
      });
      window.sessionStorage.setItem(posFlagKey, "1");
      setPosRequested(true);
      tableQuery.refetch();
    } catch (err) {
      console.error("POS request error:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not request POS. Please try again.",
      );
    }
  };

  // Clear the POS flag once the merchant verifies (no more pending payments).
  useEffect(() => {
    if (!tableQuery.data) return;
    if (
      posRequested &&
      !tableQuery.data.pending_payments &&
      !tableQuery.data.unpaid_order
    ) {
      window.sessionStorage.removeItem(posFlagKey);
      setPosRequested(false);
    }
  }, [tableQuery.data, posRequested, posFlagKey]);

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
        <CustomerHeader
          tableId={tableId}
          title="Pay Bill"
          leftSlot={
            <button
              type="button"
              onClick={() => navigate(`/menu?table=${tableId}`)}
              aria-label="Back"
              className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              <i className="mgc_left_line text-xl" />
            </button>
          }
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
  const bankAccount = restaurant?.bank_account ?? null;

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
      toast.error(
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
        <CustomerHeader
          tableId={tableId}
          title="Pay Bill"
          leftSlot={
            <button
              type="button"
              onClick={() => navigate(`/menu?table=${tableId}`)}
              aria-label="Back"
              className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              <i className="mgc_left_line text-xl" />
            </button>
          }
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

  // Case 2: previously claimed (bank transfer or POS) — awaiting verification
  if (!unpaidOrder && pendingPayments) {
    const isPos = posRequested;
    return (
      <div className="min-h-screen bg-surface-container-low pb-20">
        <CustomerHeader
          tableId={tableId}
          title="Pay Bill"
          subtitle={`Ref: ${pendingPayments.reference}`}
          leftSlot={
            <button
              type="button"
              onClick={() => navigate(`/menu?table=${tableId}`)}
              aria-label="Back"
              className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              <i className="mgc_left_line text-xl" />
            </button>
          }
        />
        <EmptyState
          icon={isPos ? "mgc_card_pay_line" : "mgc_time_line"}
          iconClassName={isPos ? "text-primary" : "text-outline-variant"}
          title={isPos ? "POS On The Way" : "Payment Claimed"}
          message={
            isPos
              ? `A waiter is bringing the POS to your table. They'll mark the ${formatCurrency(pendingPayments.total)} as received once your card is processed.`
              : `We've notified the restaurant. They will verify your payment of ${formatCurrency(pendingPayments.total)} shortly.`
          }
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
      <CustomerHeader
        tableId={tableId}
        title="Pay Bill"
        subtitle={reference ? `Ref: ${reference}` : undefined}
        leftSlot={
          <button
            type="button"
            onClick={() => navigate(`/menu?table=${tableId}`)}
            aria-label="Back"
            className="w-9 h-9 flex items-center justify-center rounded-4xl bg-surface-container hover:bg-surface-container-high transition-colors"
          >
            <i className="mgc_left_line text-xl" />
          </button>
        }
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
            {bankAccount
              ? "Transfer the exact amount above using the details below."
              : "This restaurant hasn't set up bank transfers yet."}
          </p>
        </div>

        <div className="flex flex-col">
          {bankAccount ? (
            <>
              <DetailRow label="Bank" value={bankAccount.bank_name} />
              <Divider />
              <DetailRow
                label="Account Number"
                value={bankAccount.account_number}
                copyable
                copied={copiedField === "account"}
                onCopy={() =>
                  copyToClipboard(bankAccount.account_number, "account")
                }
              />
              <Divider />
              <DetailRow label="Account Name" value={bankAccount.account_name} />
              <Divider />
            </>
          ) : (
            <>
              <div className="flex items-start gap-s p-md rounded-lg bg-surface-container text-on-surface-variant">
                <i className="mgc_card_pay_line text-xl shrink-0 mt-0.5" />
                <p className="text-label-l5">
                  Tap <span className="font-semibold">Request a POS</span> below and
                  a waiter will bring a card terminal to your table.
                </p>
              </div>
              <Divider />
            </>
          )}
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
        {/* Claiming a transfer makes no sense with no account to transfer to. */}
        {bankAccount && (
          <PrimaryButton
            onClick={handleClaimPayment}
            disabled={claimPayment.isPending || requestPos.isPending}
          >
            {claimPayment.isPending ? "Sending…" : "I've Sent the Money"}
          </PrimaryButton>
        )}
        {bankAccount ? (
          <SecondaryButton
            onClick={handleRequestPos}
            disabled={requestPos.isPending || claimPayment.isPending}
          >
            {requestPos.isPending ? "Requesting…" : "Request a POS"}
          </SecondaryButton>
        ) : (
          <PrimaryButton
            onClick={handleRequestPos}
            disabled={requestPos.isPending || claimPayment.isPending}
          >
            {requestPos.isPending ? "Requesting…" : "Request a POS"}
          </PrimaryButton>
        )}
      </section>

      <BottomNav tableId={tableId} />
    </div>
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
    <div className="flex flex-col items-center gap-l py-10 px-md text-center">
      <div className="flex flex-col items-center gap-s">
        <i className={`${icon} text-5xl ${iconClassName}`} />
        <span className="font-display text-display-h4 font-semibold text-primary-text">
          {title}
        </span>
        <p className="text-p2 text-secondary-text max-w-[384px]">{message}</p>
      </div>
      <PrimaryButton size="md" onClick={onCta}>
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
