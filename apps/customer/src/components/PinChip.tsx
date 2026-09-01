interface PinChipProps {
  pin: string;
  className?: string;
}

export default function PinChip({ pin, className = "" }: PinChipProps) {
  return (
    <span
      className={`inline-flex items-center py-s px-md rounded-sm border-2 border-success text-title-medium font-semibold text-success w-fit ${className}`}
    >
      Table PIN : {pin}
    </span>
  );
}
