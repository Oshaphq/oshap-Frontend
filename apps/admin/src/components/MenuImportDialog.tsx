import { useRef, useState } from "react";
import { useAdminImportMenu } from "@oshap/shared/hooks";
import type { MenuImportResponse } from "@oshap/shared";
import { PrimaryButton, SecondaryButton, toast } from "@oshap/shared/ui";

interface Props {
  onClose: () => void;
}

/**
 * Two-phase import: a dry run reports what would happen, then the merchant
 * commits.
 *
 * Worth the extra step — a bad CSV against a live menu is expensive to undo by
 * hand, and the preview is where a wrong column or a mangled price gets caught.
 * The backend validates the whole file before writing any row, so a failure at
 * row 60 can't leave a half-imported menu.
 */
export default function MenuImportDialog({ onClose }: Props) {
  const importMenu = useAdminImportMenu();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<MenuImportResponse | null>(null);
  const [committed, setCommitted] = useState(false);

  const fail = (err: unknown, fallback: string) =>
    toast.error(err instanceof Error ? err.message : fallback);

  const handleFile = (next: File | null) => {
    setFile(next);
    // A new file invalidates the previous preview — committing against a stale
    // one would apply a file the merchant never reviewed.
    setPreview(null);
    setCommitted(false);
  };

  const runPreview = () => {
    if (!file) return;
    importMenu.mutate(
      { file, dryRun: true },
      {
        onSuccess: setPreview,
        onError: (err) => fail(err, "Could not read that file"),
      },
    );
  };

  const commit = () => {
    if (!file) return;
    importMenu.mutate(
      { file, dryRun: false },
      {
        onSuccess: (res) => {
          setPreview(res);
          setCommitted(true);
          toast.success(
            `Menu updated — ${res.created} added, ${res.updated} changed`,
          );
        },
        onError: (err) => fail(err, "Import failed"),
      },
    );
  };

  const hasErrors = (preview?.errors.length ?? 0) > 0;
  const willChange = (preview?.created ?? 0) + (preview?.updated ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-scrim backdrop-blur-sm p-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Import menu from CSV"
        className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-md bg-surface-container-high p-l flex flex-col gap-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-md">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-bold text-primary-text">Import menu</h3>
            <p className="text-caption-md text-secondary-text">
              Upload a CSV. Nothing is saved until you confirm.
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

        <div className="flex flex-col gap-s p-md rounded-lg bg-surface-container">
          <span className="text-caption-xs font-semibold uppercase tracking-wider text-secondary-text">
            Columns
          </span>
          <code className="text-caption-md text-secondary-text break-all">
            external_id, name, category, price, description, available, image_url,
            stock_count, low_stock_threshold
          </code>
          <p className="text-caption-md text-secondary-text">
            Only <span className="font-semibold">name</span>,{" "}
            <span className="font-semibold">category</span> and{" "}
            <span className="font-semibold">price</span> are required. Rows with an{" "}
            <span className="font-semibold">external_id</span> update an existing item;
            rows without one create a new item. Export first to get a file with the
            ids already filled in.
          </p>
          {/* The menu once imported at a hundredth of its prices, so this is
              stated at the point of upload rather than left to a doc. */}
          <p className="text-caption-md text-secondary-text">
            <span className="font-semibold">Prices are in naira.</span> Write{" "}
            <span className="font-mono">3500</span> for ₦3,500 — not the kobo figure.
          </p>
          <p className="text-caption-md text-secondary-text">
            Counting stock for the whole menu is far quicker here than item by
            item: export, fill in{" "}
            <span className="font-semibold">stock_count</span> and{" "}
            <span className="font-semibold">low_stock_threshold</span> in a
            spreadsheet, and upload it back. A blank cell leaves that value as
            it is, so you only need to fill the rows you counted.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-s p-md rounded-lg border border-dashed border-outline-variant text-left hover:border-primary transition-colors"
          >
            <i className="mgc_file_upload_line text-2xl text-secondary-text shrink-0" />
            <span className="flex flex-col min-w-0">
              <span className="text-p2 text-primary-text truncate">
                {file ? file.name : "Choose a CSV file"}
              </span>
              {file && (
                <span className="text-caption-md text-secondary-text">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              )}
            </span>
          </button>
        </div>

        {preview && (
          <div className="flex flex-col gap-s">
            <div className="grid grid-cols-3 gap-s">
              <Tally label="Created" value={preview.created} tone="ok" />
              <Tally label="Updated" value={preview.updated} tone="ok" />
              <Tally label="Skipped" value={preview.skipped} tone="muted" />
            </div>

            {hasErrors && (
              <div className="flex flex-col gap-xs">
                <span className="text-caption-xs font-semibold uppercase tracking-wider text-error">
                  {preview.errors.length} row
                  {preview.errors.length === 1 ? "" : "s"} rejected
                </span>
                {/* Row numbers matter: a bare "invalid file" is unusable
                    against an 80-row spreadsheet. */}
                <div className="max-h-40 overflow-y-auto rounded-lg bg-surface-container">
                  {preview.errors.map((err, i) => (
                    <div
                      key={`${err.row}-${err.field ?? ""}-${i}`}
                      className="flex gap-s px-md py-s border-b border-outline-variant last:border-none"
                    >
                      <span className="text-caption-md font-semibold text-primary-text shrink-0 tabular-nums">
                        Row {err.row}
                      </span>
                      <span className="text-caption-md text-secondary-text min-w-0">
                        {err.field && (
                          <span className="font-semibold">{err.field}: </span>
                        )}
                        {err.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!committed && !willChange && (
              <p className="text-caption-md text-secondary-text">
                Nothing in this file would change the menu.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-s pt-s">
          <SecondaryButton size="md" onClick={onClose}>
            {committed ? "Done" : "Cancel"}
          </SecondaryButton>
          {!committed &&
            (preview ? (
              <PrimaryButton
                size="md"
                onClick={commit}
                disabled={!willChange || importMenu.isPending}
              >
                {importMenu.isPending
                  ? "Importing…"
                  : `Import ${preview.created + preview.updated} item${
                      preview.created + preview.updated === 1 ? "" : "s"
                    }`}
              </PrimaryButton>
            ) : (
              <PrimaryButton
                size="md"
                onClick={runPreview}
                disabled={!file || importMenu.isPending}
              >
                {importMenu.isPending ? "Checking…" : "Preview"}
              </PrimaryButton>
            ))}
        </div>
      </div>
    </div>
  );
}

function Tally({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "muted";
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 p-s rounded-lg bg-surface-container">
      <span
        className={`font-display text-display-h3 font-semibold tabular-nums ${
          tone === "ok" && value > 0 ? "text-primary" : "text-secondary-text"
        }`}
      >
        {value}
      </span>
      <span className="text-caption-xs uppercase tracking-wider text-secondary-text">
        {label}
      </span>
    </div>
  );
}
