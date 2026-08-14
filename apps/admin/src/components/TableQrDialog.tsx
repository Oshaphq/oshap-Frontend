import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";
import {
  buildTableUrl,
  downloadDataUrl,
  isLocalOrigin,
  qrFileName,
  renderQrPngDataUrl,
} from "../utils/qr";

interface Props {
  tableId: string;
  onClose: () => void;
  onPrint: () => void;
}

/** Preview one table's QR code, download it as PNG, or send it to the printer. */
export default function TableQrDialog({ tableId, onClose, onPrint }: Props) {
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const url = buildTableUrl(tableId);

  useEffect(() => {
    let cancelled = false;
    renderQrPngDataUrl(url)
      .then((dataUrl) => {
        if (!cancelled) setPngDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleDownload = () => {
    if (!pngDataUrl) return;
    downloadDataUrl(pngDataUrl, `${qrFileName(tableId)}.png`);
    toast.success(`QR code for "${tableId}" downloaded`);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-sm p-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`QR code for table ${tableId}`}
        className="w-full max-w-[400px] rounded-md bg-surface-container-high p-l flex flex-col gap-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-md">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-bold text-primary-text">Table {tableId}</h3>
            <p className="text-caption-md text-secondary-text">
              Guests scan this to open your menu.
            </p>
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

        {/* White plate regardless of theme — a QR code on a dark surface won't scan. */}
        <div className="flex items-center justify-center p-md rounded-lg bg-white">
          {failed ? (
            <p className="text-p2 text-error py-xl">Could not generate the QR code.</p>
          ) : pngDataUrl ? (
            <img
              src={pngDataUrl}
              alt={`QR code linking to the menu for table ${tableId}`}
              className="w-full max-w-[240px] aspect-square"
            />
          ) : (
            <div className="py-xl">
              <div className="oshap-spinner" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <span className="text-caption-xs font-semibold uppercase tracking-wider text-secondary-text">
            Links to
          </span>
          <code className="text-caption-md text-secondary-text break-all">{url}</code>
        </div>

        {isLocalOrigin() && (
          <div className="flex items-start gap-s p-md rounded-lg bg-warning-container text-on-warning-container">
            <i className="mgc_alert_line text-lg shrink-0 mt-0.5" />
            <p className="text-caption-md">
              This points at <span className="font-semibold">localhost</span>, which
              a guest&apos;s phone can&apos;t reach. Set{" "}
              <span className="font-semibold">VITE_CUSTOMER_APP_URL</span> before
              printing these for real.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-s pt-s">
          <SecondaryButton size="md" onClick={handleDownload} disabled={!pngDataUrl}>
            <i className="mgc_download_2_line" /> PNG
          </SecondaryButton>
          <PrimaryButton size="md" onClick={onPrint} disabled={!pngDataUrl}>
            <i className="mgc_print_line" /> Print
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
