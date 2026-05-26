interface PinChipProps {
  pin: string;
  className?: string;
}

export default function PinChip({ pin, className = "" }: PinChipProps) {
  return (
    <span
      className={`inline-flex items-center py-2 px-md rounded-lg border-2 border-success text-label-l3 font-semibold text-success w-fit ${className}`}
    >
      Table PIN : {pin}
    </span>
  );
}
