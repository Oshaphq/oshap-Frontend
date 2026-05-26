interface TableBadgeProps {
  tableId: string;
  variant?: "filled" | "outlined";
  className?: string;
}

export default function TableBadge({
  tableId,
  variant = "filled",
  className = "",
}: TableBadgeProps) {
  if (variant === "outlined") {
    return (
      <span
        className={`inline-flex items-center px-md py-3 rounded-4xl border-2 border-primary text-label-l5 font-semibold text-primary ${className}`}
      >
        Table: {tableId}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-s py-s rounded-lg bg-primary-container text-on-primary-container text-label-l5 font-semibold ${className}`}
    >
      Table: {tableId}
    </span>
  );
}
