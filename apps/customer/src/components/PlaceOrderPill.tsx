interface PlaceOrderPillProps {
  label?: string;
  className?: string;
}

export default function PlaceOrderPill({
  label = "Place Order",
  className = "",
}: PlaceOrderPillProps) {
  return (
    <span
      className={`inline-flex items-center py-xs px-s rounded-xs bg-primary-container text-on-primary-container text-label-small font-medium ${className}`}
    >
      {label}
    </span>
  );
}
