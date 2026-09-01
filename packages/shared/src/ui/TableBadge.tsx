interface TableBadgeProps {
  tableId: string;
  variant?: "filled" | "outlined";
  className?: string;
}

/**
 * Both variants are pills, per the shape scale — `full` covers pills, chips and
 * the FAB.
 *
 * The outlined label is `primary-label` #9b3d00 rather than the brand #f56500.
 * A 2px brand border is a graphical object and clears WCAG's 3:1 non-text bar,
 * but the label beside it is 12px text held to 4.5:1, and the brand does not
 * reach that on any surface step.
 */
export default function TableBadge({
  tableId,
  variant = "filled",
  className = "",
}: TableBadgeProps) {
  if (variant === "outlined") {
    return (
      <span
        className={`inline-flex items-center rounded-full border-2 border-primary px-md py-xs text-label-medium text-primary-label ${className}`}
      >
        Table: {tableId}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-primary-container px-2.5 py-xs text-label-medium text-on-primary-container ${className}`}
    >
      Table: {tableId}
    </span>
  );
}
