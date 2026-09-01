import { useMemo } from "react";
import { brandCssVars, deriveBrandPalette } from "@oshap/shared";

/**
 * Picking the restaurant's brand colour, with a preview of what a guest gets.
 *
 * The preview is the point. A hex field on its own asks a restaurant owner to
 * imagine a colour they have never seen applied, and the answer arrives on a
 * customer's phone. What they choose here repaints the guest's app — never the
 * admin, which stays Oshap orange so a manager working two branches does not
 * get a different-coloured tool each time they switch.
 *
 * No contrast warning is shown because none is possible: the palette derives
 * its own text colour and cannot produce an unreadable pair. See
 * `docs/branding.md`.
 */
export default function BrandColourField({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const palette = useMemo(() => deriveBrandPalette(value), [value]);

  // Empty is a legitimate answer — it means "use Oshap's". Only a value that
  // was typed and cannot be used is worth saying anything about.
  const unusable = value.trim() !== "" && palette === null;

  return (
    <div className="flex flex-col gap-s">
      <label
        htmlFor="primary_color"
        className="text-body-medium font-semibold text-on-surface"
      >
        Brand colour
      </label>
      <p className="text-label-small text-on-surface-variant">
        Used on your guests&rsquo; menu — buttons, the header, highlights. Your
        staff screens stay the same.
      </p>

      <div className="flex items-center gap-s">
        <input
          type="color"
          aria-label="Pick a brand colour"
          value={palette?.light.primary ?? "#f56500"}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 shrink-0 rounded-sm bg-surface-container-low border border-outline-variant cursor-pointer"
        />
        <input
          id="primary_color"
          name="primary_color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#F56500"
          spellCheck={false}
          className="flex-1 px-md py-s rounded-sm bg-surface-container-low border border-outline-variant text-body-medium text-on-surface placeholder:text-outline outline-none focus:border-primary transition-colors font-mono"
        />
      </div>

      {unusable && (
        <p className="text-label-small text-warning">
          That isn&rsquo;t a colour we can read — guests will see the default
          until it&rsquo;s a hex like <span className="font-mono">#F56500</span>.
        </p>
      )}

      <span className="text-label-small font-semibold text-on-surface-variant uppercase tracking-wider mt-xs">
        What your guests see
      </span>
      <div className="grid grid-cols-2 gap-s">
        {(["light", "dark"] as const).map((mode) => (
          <BrandPreview
            key={mode}
            mode={mode}
            vars={palette ? brandCssVars(palette[mode]) : null}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Both modes are shown side by side, because guests will be in both and a
 * colour that works in one can look wrong in the other.
 *
 * `data-theme` is set on the preview itself so it renders the opposite mode to
 * whatever the admin is currently using, rather than only ever showing the one
 * the person choosing happens to be in.
 */
function BrandPreview({
  mode,
  vars,
}: {
  mode: "light" | "dark";
  vars: Record<string, string> | null;
}) {
  return (
    <div
      data-theme={mode}
      style={vars ?? undefined}
      className="rounded-sm border border-outline-variant bg-surface p-md flex flex-col gap-s"
    >
      <span className="text-label-small text-on-surface-variant capitalize">{mode}</span>
      <div className="rounded-lg bg-primary-action text-on-primary px-md py-s text-center text-body-medium font-semibold font-display">
        Place order
      </div>
      <div className="rounded-lg bg-primary-container text-on-primary-container px-md py-xs text-label-small">
        Jollof rice &middot; ₦3,500
      </div>
    </div>
  );
}
