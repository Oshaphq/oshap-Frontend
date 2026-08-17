/**
 * The order-total formula, mirrored from the backend so the figure a guest
 * agrees to before ordering is the figure the server charges afterwards.
 *
 * Transcribed from `compute_order_totals` in the backend's
 * `app/controller/common.py`. Keep the two in step: if the server's formula
 * changes, a guest sees one number at checkout and pays another, which is the
 * worst way for this to go wrong because nothing errors.
 */

/**
 * Applies a rate given in **integer basis points** (`750` = 7.5%) with half-up
 * rounding, in pure integer arithmetic.
 *
 * The `+ 5000` before the integer division is the half-up: it is half of the
 * 10,000 divisor, so anything at or above the halfway point carries. Floats
 * would reintroduce the drift that kobo exists to avoid.
 */
export function applyRate(amount: number, basisPoints?: number | null): number {
  if (!basisPoints) return 0;
  return Math.floor((amount * basisPoints + 5000) / 10000);
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  service_charge: number;
  vat: number;
  tip: number;
  total: number;
}

export interface RateConfig {
  /** Basis points, e.g. `750` for 7.5%. */
  vat_rate?: number | null;
  service_charge_rate?: number | null;
}

/**
 * Computes what an order will cost, in kobo.
 *
 * Note that VAT applies to the subtotal *after* discount and *including* the
 * service charge — the service charge is part of the taxable amount, not an
 * addition on top of the tax. Getting that order wrong changes the total by a
 * few naira per bill, which is exactly the kind of discrepancy that surfaces
 * as an argument at the till rather than as a bug report.
 */
export function computeOrderTotals(
  subtotal: number,
  rates: RateConfig,
  { discount = 0, tip = 0 }: { discount?: number; tip?: number } = {},
): OrderTotals {
  const serviceCharge = applyRate(subtotal, rates.service_charge_rate);
  const vatBase = subtotal - discount + serviceCharge;
  const vat = applyRate(vatBase, rates.vat_rate);
  return {
    subtotal,
    discount,
    service_charge: serviceCharge,
    vat,
    tip,
    total: vatBase + vat + tip,
  };
}
