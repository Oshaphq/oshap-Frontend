import QRCode from "qrcode";

/**
 * Table QR codes get printed, laminated and stuck to furniture. Once that
 * happens the encoded URL is effectively permanent, so everything here favours
 * being obviously correct over being clever.
 */

const DEFAULT_CUSTOMER_ORIGIN = "http://localhost:5173";

/**
 * Error correction level M tolerates ~15% damage. Worth the slightly denser
 * code: these live on tables and pick up grease, scratches and coffee rings.
 */
const ERROR_CORRECTION = "M" as const;

/**
 * The configured origin, with a missing scheme repaired.
 *
 * `VITE_CUSTOMER_APP_URL=oshap.useshappay.com` — no scheme — was set in
 * production, and every printed code encoded `oshap.useshappay.com/menu?...`.
 * That is not a URL, it is text: a phone camera may guess at it, may offer to
 * search for it, or may do nothing, and which of those you get depends on the
 * handset. Codes were already on tables before anyone noticed.
 *
 * So repair it rather than propagate it. A code that works is worth more than
 * a principled refusal once the laminator has been involved — and
 * `isOriginUnusable` below still reports it, so the config gets fixed too.
 */
export function getCustomerOrigin(): string {
  const configured = import.meta.env.VITE_CUSTOMER_APP_URL;
  const raw = (configured || DEFAULT_CUSTOMER_ORIGIN).trim().replace(/\/+$/, "");
  if (!raw) return DEFAULT_CUSTOMER_ORIGIN;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** True when the origin points somewhere no guest's phone can reach. */
export function isLocalOrigin(origin = getCustomerOrigin()): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(
    origin,
  );
}

/** True when the *configured* value was not a usable absolute URL. */
export function isSchemeless(): boolean {
  const configured = import.meta.env.VITE_CUSTOMER_APP_URL;
  return Boolean(configured) && !/^https?:\/\//i.test(String(configured).trim());
}

/**
 * The single question the QR screens should ask: would printing this be a
 * mistake?
 *
 * `isLocalOrigin` alone was too narrow. It caught localhost and nothing else,
 * so a scheme-less domain sailed past the one guard built to prevent exactly
 * this, and the warning never appeared.
 */
export function isOriginUnusable(): boolean {
  return isLocalOrigin() || isSchemeless();
}

/**
 * The URL a guest lands on after scanning. Mirrors the customer app's routing
 * (`?table=` on /menu) — see apps/customer/src/App.tsx.
 *
 * Takes the table's **unique id**, never its name. Every restaurant names its
 * tables T1, T2, T3, so a code encoding the name resolves to whichever table
 * the server happens to find first — potentially another restaurant's, with
 * their bank details attached. `GET /table/{id}` now requires the uuid, so a
 * name here produces a 422 on every scan.
 */
export function buildTableUrl(tableUuid: string, origin = getCustomerOrigin()): string {
  return `${origin}/menu?table=${encodeURIComponent(tableUuid)}`;
}

/**
 * SVG rather than canvas: these are printed, and vector stays sharp at any
 * DPI. `margin: 0` because the sheet layout supplies its own quiet zone.
 */
export function renderQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: ERROR_CORRECTION,
    margin: 0,
  });
}

/** PNG data URL, for the "download" action. 1024px survives most print sizes. */
export function renderQrPngDataUrl(text: string, width = 1024): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: ERROR_CORRECTION,
    margin: 1,
    width,
  });
}

/** Filesystem-safe filename for a downloaded code, e.g. "VIP 1" -> "table-vip-1". */
export function qrFileName(tableId: string): string {
  const slug =
    tableId
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "table";
  return `table-${slug}`;
}

export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
