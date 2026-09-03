import { useEffect, useState } from "react";
import { Button, PrimaryButton, toast } from "@oshap/shared/ui";
import {
  buildTableUrl,
  downloadDataUrl,
  isOriginUnusable,
  isLocalOrigin,
  qrFileName,
  renderQrPngDataUrl,
} from "../utils/qr";

interface Props {
  /** The table's unique id — what the QR encodes and the API resolves. */
  tableUuid: string;
  /** The name staff read, for the filename and the on-screen copy. */
  tableName: string;
  onClose: () => void;
  onPrint: () => void;
}

/** Preview one table's QR code, download it as PNG, or send it to the printer. */
export default function TableQrDialog({
  tableUuid,
  tableName,
  onClose,
  onPrint,
}: Props) {
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const url = buildTableUrl(tableUuid);

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
    downloadDataUrl(pngDataUrl, `${qrFileName(tableName)}.png`);
    toast.success(`QR code for "${tableName}" downloaded`);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-sm p-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`QR code for table ${tableName}`}
        className="w-full max-w-[400px] rounded-xl bg-surface-container-high p-l flex flex-col gap-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-md">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-bold text-on-surface">Table {tableName}</h3>
            <p className="text-body-medium text-on-surface-variant">
              Guests scan this to open your menu.
            </p>
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

        {/* White plate regardless of theme — a QR code on a dark surface won't scan. */}
        <div className="flex items-center justify-center p-md rounded-sm bg-white">
          {failed ? (
            <p className="text-body-medium text-error py-xl">Could not generate the QR code.</p>
          ) : pngDataUrl ? (
            <img
              src={pngDataUrl}
              alt={`QR code linking to the menu for table ${tableName}`}
              className="w-full max-w-[240px] aspect-square"
            />
          ) : (
            <div className="py-xl">
              <div className="oshap-spinner" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <span className="text-label-small font-semibold uppercase tracking-wider text-on-surface-variant">
            Links to
          </span>
          <code className="text-body-medium text-on-surface-variant break-all">{url}</code>
        </div>

        {isOriginUnusable() && (
          <div className="flex items-start gap-s p-md rounded-sm bg-warning-container text-on-warning-container">
            <i className="mgc_alert_line text-lg shrink-0 mt-0.5" />
            <p className="text-body-medium">
              {isLocalOrigin() ? (
                <>
                  This points at <span className="font-semibold">localhost</span>,
                  which a guest&apos;s phone can&apos;t reach.
                </>
              ) : (
                <>
                  <span className="font-semibold">VITE_CUSTOMER_APP_URL</span> has no{" "}
                  <span className="font-semibold">https://</span>. We&apos;ve added it
                  so this code works, but fix the setting — a bare domain is text, not
                  a link, and phones disagree about what to do with it.
                </>
              )}{" "}
              Don&apos;t print these until it&apos;s corrected.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-s pt-s">
          <Button variant="text" size="md" onClick={handleDownload} disabled={!pngDataUrl}>
            <i className="mgc_download_2_line" /> PNG
          </Button>
          <PrimaryButton size="md" onClick={onPrint} disabled={!pngDataUrl}>
            <i className="mgc_print_line" /> Print
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
