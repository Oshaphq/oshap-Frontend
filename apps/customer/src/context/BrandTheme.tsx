import { useEffect, useMemo, type ReactNode } from "react";
import { brandCssVars, deriveBrandPalette, type BrandPalette } from "@oshap/shared";

/**
 * Paints the guest's app in the restaurant's colour.
 *
 * `bg-primary` resolves through `--color-primary` to `--ds-brand-primary`, so setting
 * that group on one wrapper rebrands every utility at once — no rebuild, no
 * inline styles on components, no markup changes anywhere else.
 *
 * Customer app only. The admin deliberately stays Oshap orange: a group owner
 * switches branches from its top nav, and a tool that changes colour mid-shift
 * is disorienting rather than personal. Error, warning and success stay
 * semantic everywhere — a restaurant's brand must never become the colour of a
 * failed payment.
 */

const cacheKey = (tableId: string) => `oshap-brand-${tableId}`;

/**
 * The colour arrives with the table fetch, so a first scan paints Oshap orange
 * for a beat. Caching the *resolved* palette — not the seed — means the second
 * scan onward, which after the first is every scan, applies it before paint
 * without re-deriving.
 */
function readCache(tableId: string): BrandPalette | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(cacheKey(tableId));
    return raw ? (JSON.parse(raw) as BrandPalette) : null;
  } catch {
    return null;
  }
}

function writeCache(tableId: string, palette: BrandPalette | null) {
  if (typeof window === "undefined") return;
  try {
    if (palette) {
      window.sessionStorage.setItem(cacheKey(tableId), JSON.stringify(palette));
    } else {
      window.sessionStorage.removeItem(cacheKey(tableId));
    }
  } catch {
    // A full or disabled store is not a reason to fail to render a menu.
  }
}

export function BrandTheme({
  tableId,
  primaryColor,
  children,
}: {
  tableId: string;
  /** Undefined while the table is still loading; null when the restaurant has none. */
  primaryColor?: string | null;
  children: ReactNode;
}) {
  const palette = useMemo(() => {
    // Still loading — show the last known brand rather than flashing to default
    // and back, which reads as a glitch rather than a load.
    if (primaryColor === undefined) return readCache(tableId);
    return deriveBrandPalette(primaryColor);
  }, [tableId, primaryColor]);

  useEffect(() => {
    if (primaryColor === undefined) return;
    writeCache(tableId, palette);
  }, [tableId, primaryColor, palette]);

  /**
   * Both modes are emitted, and the theme attribute picks between them. The
   * alternative — reading the current theme in JS — would need this to
   * re-render on every toggle, and would flash the wrong container colour on
   * the way through.
   */
  const css = useMemo(() => {
    if (!palette) return null;
    const decl = (vars: Record<string, string>) =>
      Object.entries(vars)
        .map(([k, v]) => `${k}:${v}`)
        .join(";");
    const light = decl(brandCssVars(palette.light));
    const dark = decl(brandCssVars(palette.dark));
    /**
     * Keyed on `data-theme` alone, deliberately.
     *
     * There used to be a `prefers-color-scheme` block guarded on
     * `:not([data-theme="light"])`, which assumed light mode sets that
     * attribute. It does not — `setTheme` **removes** the attribute for light.
     * So a guest on a dark phone who switched the app to light got dark brand
     * colours painted over light surfaces, which is exactly the contrast
     * failure the palette derivation exists to prevent.
     *
     * Nothing is lost by dropping it: the boot script already reads the OS
     * preference and sets `data-theme` from it, so the attribute is the single
     * source of truth its own comment claims it is.
     */
    return `[data-brand]{${light}}` + `[data-theme="dark"] [data-brand]{${dark}}`;
  }, [palette]);

  return (
    <>
      {css && <style>{css}</style>}
      <div data-brand={palette ? "" : undefined} className="contents">
        {children}
      </div>
    </>
  );
}
