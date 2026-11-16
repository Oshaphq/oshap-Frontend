import type { HTMLAttributes } from "react";

/**
 * A card: the surface a block of content sits on.
 *
 * `bg-surface-container-low rounded-lg` appeared about fifty times across the
 * three apps, in roughly twenty different class strings. Most of the variation
 * is not a decision — it is padding written `p-l` in one file and `p-xl` in
 * the next for blocks doing the same job, and a `flex flex-col gap-*` tail
 * that shifted between `xs`, `s` and `md` with nothing distinguishing them.
 *
 * Unlike Dialog, Sheet and DataTable, this one fixes no defect. A card has no
 * behaviour and no semantics to get wrong. What it buys is a single place that
 * says what a card is, so the tone and the radius answer to
 * `docs/color-usage.md` rather than to fifty copies — and so the next card
 * does not invent a twenty-first spelling.
 *
 * Padding was left open when this component landed. The golden spacing scale
 * settles it — see PADDING below.
 */

/**
 * Two paddings, and the job decides which: `l` (17) for a tile or list item,
 * `xl` (27) for a section card, an empty state or an auth panel. The 4pt grid
 * offered 16, 24 and 32 with nothing choosing between them.
 */
const PADDING = {
  none: "",
  l: "p-l",
  xl: "p-xl",
} as const;

const GAP = {
  none: "",
  xs: "flex flex-col gap-xs",
  s: "flex flex-col gap-s",
  l: "flex flex-col gap-l",
} as const;

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: keyof typeof PADDING;
  /** A column with this gap. `none` leaves layout to the caller. */
  gap?: keyof typeof GAP;
  /**
   * `section` where the card is a landmark region of the page — which is what
   * several of these already were, and the reason a div-only component would
   * have quietly demoted them.
   */
  as?: "div" | "section" | "article";
}

export default function Card({
  padding = "l",
  gap = "none",
  as: Tag = "div",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      {...rest}
      className={`bg-surface-container-low rounded-lg ${PADDING[padding]} ${GAP[gap]} ${className}`}
    >
      {children}
    </Tag>
  );
}
