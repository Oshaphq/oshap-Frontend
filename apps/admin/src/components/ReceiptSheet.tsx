import { useEffect } from "react";
import { createPortal } from "react-dom";
import { formatCurrency, useAdminReceipt } from "@oshap/shared";
import type { PaymentMethod } from "@oshap/shared";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  MANUAL_TRANSFER: "Bank transfer",
  POS: "Card / POS",
};

interface Props {
  orderId: string;
  onDone: () => void;
}

/**
 * Prints a receipt.
 *
 * Composed from the server's receipt endpoint rather than the live order,
 * because a receipt must reflect the sale as it happened — renaming the
 * restaurant or changing the VAT rate afterwards must not rewrite a receipt
 * already handed to a customer.
 *
 * Rendered into the print portal and styled for 80mm thermal paper, the width
 * of the receipt printers restaurants actually own. Literal colors rather than
 * theme tokens: paper is white, and a dark-theme admin should not print an
 * ink-soaked page.
 */
export default function ReceiptSheet({ orderId, onDone }: Props) {
  const receipt = useAdminReceipt(orderId);
  const data = receipt.data;

  useEffect(() => {
    if (!data) return;

    const handleAfterPrint = () => onDone();
    window.addEventListener("afterprint", handleAfterPrint);
    const frame = requestAnimationFrame(() => window.print());

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [data, onDone]);

  if (!data) return null;

  const line = (label: string, value: number, bold = false) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "4mm",
        fontWeight: bold ? 700 : 400,
      }}
    >
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );

  return createPortal(
    <div
      id="oshap-print-root"
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        width: "72mm",
        margin: "0 auto",
        fontSize: "9pt",
        lineHeight: 1.45,
        color: "#000000",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "3mm" }}>
        {data.restaurant.logo_url && (
          <img
            src={data.restaurant.logo_url}
            alt=""
            style={{ height: "12mm", objectFit: "contain", marginBottom: "2mm" }}
          />
        )}
        <div style={{ fontSize: "12pt", fontWeight: 700 }}>{data.restaurant.name}</div>
        {data.restaurant.address && (
          <div style={{ fontSize: "8pt" }}>{data.restaurant.address}</div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt" }}>
        <span>{data.reference}</span>
        <span>Table {data.table_id}</span>
      </div>
      <div style={{ fontSize: "8pt" }}>
        {new Date(data.issued_at).toLocaleString()}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "1mm" }}>
        {data.items.map((item) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: "4mm" }}>
            <span>
              {item.quantity}× {item.name}
            </span>
            <span>{formatCurrency(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "2mm 0" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "1mm" }}>
        {line("Subtotal", data.subtotal)}
        {data.discount > 0 && line("Discount", -data.discount)}
        {data.service_charge > 0 && line("Service charge", data.service_charge)}
        {/* VAT is itemised because a customer is entitled to see the tax they
            paid, and a business customer needs it to reclaim. */}
        {data.vat > 0 && line("VAT", data.vat)}
        {data.tip > 0 && line("Tip", data.tip)}
      </div>

      <div style={{ borderTop: "1px solid #000", margin: "2mm 0" }} />

      <div style={{ fontSize: "11pt" }}>{line("TOTAL", data.total, true)}</div>

      {data.payment_method && (
        <div style={{ fontSize: "8pt", marginTop: "2mm" }}>
          Paid by {METHOD_LABELS[data.payment_method] ?? data.payment_method}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "4mm", fontSize: "8pt" }}>
        Thank you
      </div>
    </div>,
    document.body,
  );
}
