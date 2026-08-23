/**
 * What a cashier's tendered amount means for the bill in front of them.
 *
 * `POST /admin/orders/cash` has no part-payment concept: it marks every order
 * it is given CONFIRMED, for the full amount. So a tender that does not cover
 * the bill cannot be recorded as one — passing ₦40,000 against ₦41,086.50 does
 * not leave ₦1,086.50 owing, it books the whole ₦41,086.50 as taken and the
 * shortfall disappears from the books.
 *
 * The amount itself is optional. A blank box means "settling it, didn't count
 * it", which stays allowed — the block is only for an amount that was entered
 * and is too small, where the two numbers plainly disagree.
 */
export type CashTender =
  | { kind: "unrecorded" }
  | { kind: "exact" }
  | { kind: "change"; change: number }
  | { kind: "short"; shortfall: number };

export function cashTender(tenderedKobo: number | null, totalKobo: number): CashTender {
  if (tenderedKobo === null) return { kind: "unrecorded" };
  if (tenderedKobo < totalKobo) return { kind: "short", shortfall: totalKobo - tenderedKobo };
  if (tenderedKobo === totalKobo) return { kind: "exact" };
  return { kind: "change", change: tenderedKobo - totalKobo };
}

/** Whether the bill can be settled with what has been entered. */
export function canSettleCash(tender: CashTender): boolean {
  return tender.kind !== "short";
}
