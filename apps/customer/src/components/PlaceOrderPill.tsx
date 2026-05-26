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
      className={`inline-flex items-center py-1 px-2 rounded-xs bg-primary text-on-primary text-caption-c2 font-medium ${className}`}
    >
      {label}
    </span>
  );
}
