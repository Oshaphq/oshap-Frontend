import type { SelectHTMLAttributes } from "react";

/**
 * A `<select>` with a chevron we draw ourselves.
 *
 * The native chevron is painted by the UA at the inside edge of the border and
 * ignores `padding-right` entirely. So a select styled `px-md` gets 16px of
 * inset on the left and none on the right — the arrow sits flush against the
 * border while the text does not. It reads as a rendering bug because it is
 * asymmetric, and no amount of padding fixes it.
 *
 * `appearance-none` removes it, and the icon is positioned at the same inset as
 * the text: `pl-md` pairs with `right-md`, `pl-s` with `right-s`. The `pr-*`
 * value only has to be large enough that a long option label never slides
 * under the icon — it is clearance, not the visual gap.
 *
 * This existed correctly in two files and natively in four others. It is here
 * so there is one of it.
 */

const BASE =
  "appearance-none w-full rounded-sm bg-surface-container-low border border-outline text-on-surface outline-none focus:border-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Left inset and chevron inset are the same value in every density — that
 * symmetry is the whole point, so it is expressed as a pair rather than as
 * loose utilities at the call site.
 */
const DENSITY = {
  md: {
    // `h-10` to match Button `md` and TextField `md`. A select beside a button
    // used to be 38 against 40, which reads as a rendering fault in a toolbar.
    field: "h-10 pl-md pr-10 text-body-medium",
    icon: "right-md",
  },
  sm: {
    field: "h-8 pl-s pr-xl text-body-medium",
    icon: "right-s text-sm",
  },
} as const;

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * `md` for form fields and dialogs, `sm` for compact toolbar chips.
   * Both keep left inset equal to chevron inset.
   */
  density?: keyof typeof DENSITY;
  /**
   * Layout for the wrapper — width, flex, max-width. Put sizing here rather
   * than in `className`: the wrapper is what the parent lays out, and the
   * select fills it.
   */
  wrapperClassName?: string;
}

export default function Select({
  density = "md",
  wrapperClassName = "",
  className = "",
  children,
  ...props
}: SelectProps) {
  const { field, icon } = DENSITY[density];

  return (
    <div className={`relative inline-block ${wrapperClassName}`}>
      <select {...props} className={`${BASE} ${field} ${className}`}>
        {children}
      </select>
      <i
        className={`mgc_down_line absolute ${icon} top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none`}
        aria-hidden
      />
    </div>
  );
}
