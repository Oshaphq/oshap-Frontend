import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { buildTableUrl, renderQrSvg } from "../utils/qr";

export interface QrPrintRequest {
  tableIds: string[];
  restaurantName: string;
  logoUrl?: string | null;
}

interface Props {
  request: QrPrintRequest | null;
  onDone: () => void;
}

/**
 * Renders table QR codes into a hidden portal and triggers the browser print
 * dialog. Hidden on screen (see #oshap-print-root in index.css) — the dialog's
 * own preview is the preview, and "Save as PDF" there covers PDF export
 * without pulling in a PDF library.
 *
 * Styling is inline and literal rather than Tailwind tokens: this is paper,
 * not a themed surface, and the utility classes would resolve against the
 * admin's current theme.
 */
export default function QrPrintSheet({ request, onDone }: Props) {
  const [codes, setCodes] = useState<Array<{ tableId: string; svg: string }>>([]);

  useEffect(() => {
    if (!request) {
      setCodes([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const generated = await Promise.all(
        request.tableIds.map(async (tableId) => ({
          tableId,
          svg: await renderQrSvg(buildTableUrl(tableId)),
        })),
      );
      if (!cancelled) setCodes(generated);
    })();

    return () => {
      cancelled = true;
    };
  }, [request]);

  // Print only once the codes are actually in the DOM — printing early gives
  // a sheet of empty boxes.
  useEffect(() => {
    if (!request || codes.length !== request.tableIds.length || codes.length === 0) {
      return;
    }

    const handleAfterPrint = () => onDone();
    window.addEventListener("afterprint", handleAfterPrint);

    // One frame for layout to settle before the dialog snapshots the page.
    const frame = requestAnimationFrame(() => window.print());

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [request, codes, onDone]);

  if (!request || codes.length === 0) return null;

  return createPortal(
    <div
      id="oshap-print-root"
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "8mm",
      }}
    >
      {codes.map(({ tableId, svg }) => (
        <div
          key={tableId}
          className="oshap-qr-card"
          style={{
            border: "1.5px solid #111111",
            borderRadius: "4mm",
            padding: "8mm 6mm",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4mm",
            textAlign: "center",
          }}
        >
          {request.logoUrl && (
            <img
              src={request.logoUrl}
              alt=""
              style={{ height: "14mm", objectFit: "contain" }}
            />
          )}

          <div
            style={{ fontSize: "12pt", fontWeight: 700, letterSpacing: "0.01em" }}
          >
            {request.restaurantName}
          </div>

          <div
            style={{
              width: "52mm",
              height: "52mm",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            // qrcode emits a self-contained <svg>; the input is our own
            // origin + table id, never user-authored markup.
            dangerouslySetInnerHTML={{ __html: svg }}
          />

          <div style={{ fontSize: "28pt", fontWeight: 800, lineHeight: 1 }}>
            {tableId}
          </div>

          <div style={{ fontSize: "11pt", fontWeight: 600 }}>Scan to order</div>
          <div style={{ fontSize: "8pt", color: "#555555" }}>
            Point your phone camera at the code
          </div>
        </div>
      ))}
    </div>,
    document.body,
  );
}
