import { formatCurrency } from "@oshap/shared";

/**
 * The itemised bill, shared by checkout and the pay screen.
 *
 * One implementation on purpose: these two screens show the same money to the
 * same person minutes apart, and while they were separate the checkout copy
 * quietly omitted VAT and printed a total lower than the one charged.
 */
export default function BillBreakdown({
  items,
  subtotal,
  discount,
  serviceCharge,
  vat,
  tip,
  total,
  heading = "Your order",
}: {
  items: Array<{ id: string; name: string; quantity: number; price: number }>;
  subtotal?: number;
  discount?: number;
  serviceCharge?: number;
  vat?: number;
  tip?: number;
  total: number;
  heading?: string;
}) {
  return (
    <section className="py-l px-md bg-surface-container-low border-b-[6px] border-surface-container flex flex-col gap-md">
      <h2 className="font-display text-title-medium font-semibold text-on-surface">
        {heading}
      </h2>

      {items.length > 0 && (
        <div className="flex flex-col gap-s">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-md">
              <span className="text-body-medium text-on-surface min-w-0">
                <span className="text-on-surface-variant tabular-nums">
                  {item.quantity}×{" "}
                </span>
                {item.name}
              </span>
              <span className="text-body-medium text-on-surface tabular-nums shrink-0">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col pt-s border-t border-outline-variant">
        {subtotal != null && <BillLine label="Item total" value={subtotal} />}
        {(discount ?? 0) > 0 && <BillLine label="Discount" value={-(discount ?? 0)} />}
        {(serviceCharge ?? 0) > 0 && (
          <BillLine label="Service charge" value={serviceCharge ?? 0} />
        )}
        {/* Named rather than folded into the total: a guest is entitled to see
            the tax they are paying. */}
        {(vat ?? 0) > 0 && <BillLine label="VAT" value={vat ?? 0} />}
        {(tip ?? 0) > 0 && <BillLine label="Tip" value={tip ?? 0} />}

        <div className="flex items-center justify-between gap-md pt-s mt-xs border-t border-outline-variant">
          <span className="text-title-medium font-semibold text-on-surface">Total</span>
          <span className="text-title-large font-semibold text-primary-label tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </section>
  );
}

function BillLine({ label, value }: { label: string; value: number }) {
  const isDeduction = value < 0;
  return (
    <div className="flex items-center justify-between gap-md py-xs">
      <span className="text-body-medium text-on-surface-variant">{label}</span>
      <span
        className={`text-body-medium tabular-nums ${
          isDeduction ? "text-error" : "text-on-surface"
        }`}
      >
        {isDeduction ? `− ${formatCurrency(-value)}` : formatCurrency(value)}
      </span>
    </div>
  );
}
