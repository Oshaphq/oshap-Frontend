import type { ReactNode } from "react";

/**
 * A table of records.
 *
 * Five of these were hand-rolled and they drifted on every axis that does not
 * show up in a screenshot: the header row was `surface-container-high` four
 * times and a bare bottom rule once; `<th>` was `text-label-large` four times
 * and `text-body-medium` once; padding was written `py-s px-md` in some cells
 * and `px-md py-s` in others; two body rows had a hover tint and a
 * `last:border-none`, the rest had neither. Three different scroll wrappers.
 *
 * The semantics were worse:
 *
 * - 2 of 17 `<th>` carried `scope`, and both of those are in the one table
 *   that is a matrix rather than a list. In the four record tables no cell
 *   was tied to its heading.
 * - 0 of 5 had a `<caption>` or a name of any kind, so a screen reader
 *   announced "table" and nothing else
 *
 * A caption is therefore required, not optional. It is visually hidden by
 * default because every one of these tables already has a heading above it —
 * the caption exists so the table itself is identifiable when a screen reader
 * lists the tables on the page.
 *
 * The matrix is not one of these. `settings/notifications.tsx` has headings on
 * both axes — `scope="col"` for the roles, `scope="row"` for each alert — and
 * is left alone: a component that only knows column headings would take
 * semantics away from the one table that already had them.
 *
 * Columns are data. That is what makes a responsive column (`hideBelow`) or a
 * right-aligned figure a property of the column rather than a class repeated
 * in a header cell and again in every body cell, which is how the alignment
 * drifted out of step in the first place.
 */

const ALIGN = {
  left: "text-left",
  right: "text-right",
} as const;

const HIDE_BELOW = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
} as const;

export interface Column<T> {
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  /** `right` for figures. Applies to the heading and the cells together. */
  align?: keyof typeof ALIGN;
  /** Drop the column on narrow screens rather than letting the table scroll. */
  hideBelow?: keyof typeof HIDE_BELOW;
  /** Extra classes for the body cells only. */
  cellClassName?: string;
}

export interface DataTableProps<T> {
  /**
   * The table's accessible name. Required — none of the five had one.
   * Hidden visually unless `showCaption`, since a heading usually sits above.
   */
  caption: string;
  showCaption?: boolean;
  columns: Array<Column<T>>;
  rows: readonly T[];
  rowKey: (row: T, index: number) => string;
  /** Force a horizontal scroll below this width rather than crushing columns. */
  minWidth?: string;
  /** Shown in place of the table body when there are no rows. */
  empty?: ReactNode;
  className?: string;
}

export default function DataTable<T>({
  caption,
  showCaption = false,
  columns,
  rows,
  rowKey,
  minWidth,
  empty,
  className = "",
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div
      className={`bg-surface-container-low rounded-lg overflow-x-auto ${className}`}
    >
      <table
        className={`w-full text-left border-collapse ${minWidth ?? ""}`}
      >
        <caption
          className={
            showCaption
              ? "px-md py-s text-left text-body-medium text-on-surface-variant"
              : "sr-only"
          }
        >
          {caption}
        </caption>
        <thead>
          <tr className="bg-surface-container-high border-b border-surface-container-highest">
            {columns.map((c, i) => (
              <th
                key={i}
                scope="col"
                className={`py-s px-md text-label-large font-semibold text-on-surface-variant ${
                  ALIGN[c.align ?? "left"]
                } ${c.hideBelow ? HIDE_BELOW[c.hideBelow] : ""}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              className="border-b border-surface-container-highest last:border-none hover:bg-surface-container transition-colors"
            >
              {columns.map((c, i) => (
                <td
                  key={i}
                  className={`py-s px-md ${ALIGN[c.align ?? "left"]} ${
                    c.hideBelow ? HIDE_BELOW[c.hideBelow] : ""
                  } ${c.cellClassName ?? ""}`}
                >
                  {c.cell(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
