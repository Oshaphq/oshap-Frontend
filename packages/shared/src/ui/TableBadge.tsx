/**
 * A table's identity, as the customer header already draws it: an outlined
 * primary chip, not a filled one, so it reads as a label on the bar rather
 * than a button a guest might tap.
 *
 * Shaped from the shipping control rather than from the M3 default, which is
 * the same call made for Chip, Fab and StatusBadge — the product's version is
 * the real specification.
 *
 * `id` is the restaurant's own name for the table. The settings screen offers
 * "T14, VIP 1, Bar 2" as its examples, so the chip shows exactly what they
 * typed while `aria-label` supplies the word "Table" — otherwise a screen
 * reader hears "Table T14", which says it twice, or the visible text has to
 * read "Table VIP 1", which is not what anyone calls it.
 *
 * Not for admin's prose. Four admin screens write "Table {x}" inside a
 * sentence or a dialog subtitle. That is text doing a text job; a primary
 * outlined chip in a subtitle competes with the title above it.
 *
 * Not for the dashboard's table cards either, where the id is the card's
 * heading — demoting a heading to a chip would flatten the one screen where a
 * waiter finds a table by scanning.
 */

export interface TableBadgeProps {
  /** The restaurant's own name for the table. Undefined while it loads. */
  id?: string;
  className?: string;
}

export default function TableBadge({ id, className = "" }: TableBadgeProps) {
  return (
    <span
      aria-label={id ? `Table ${id}` : "Loading table"}
      className={`inline-flex items-center px-s py-xs rounded-full border border-primary text-primary-label text-body-medium font-semibold whitespace-nowrap ${className}`}
    >
      <span aria-hidden="true">Table {id ?? "…"}</span>
    </span>
  );
}
