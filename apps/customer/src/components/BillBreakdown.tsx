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
      <h2 className="font-display text-display-h3 font-semibold text-primary-text">
        {heading}
      </h2>

      {items.length > 0 && (
        <div className="flex flex-col gap-s">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-md">
              <span className="text-p2 text-primary-text min-w-0">
                <span className="text-secondary-text tabular-nums">
                  {item.quantity}×{" "}
                </span>
                {item.name}
              </span>
              <span className="text-p2 text-primary-text tabular-nums shrink-0">
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
          <span className="text-label-l3 font-semibold text-primary-text">Total</span>
          <span className="text-label-l2 font-semibold text-primary tabular-nums">
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
      <span className="text-p2 text-secondary-text">{label}</span>
      <span
        className={`text-p2 tabular-nums ${
          isDeduction ? "text-error" : "text-primary-text"
        }`}
      >
        {isDeduction ? `− ${formatCurrency(-value)}` : formatCurrency(value)}
      </span>
    </div>
  );
}
