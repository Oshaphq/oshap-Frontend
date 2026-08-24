/**
 * What a cashier's tendered amount means for the bill in front of them.
 *
 * A short tender used to be blocked outright, because `POST /admin/orders/cash`
 * marked every order it was given CONFIRMED for the full amount — so ₦40,000
 * against a ₦41,086.50 bill booked the whole ₦41,086.50 and the shortfall left
 * no trace. Refusing the money was the lesser wrong, but it still turned a
 * paying guest away.
 *
 * The endpoint takes part payments now and answers with a balance, so a short
 * tender is a normal thing to record rather than a mistake to stop. What is
 * left here is telling the cashier which of the three it is, and what will
 * still be owed afterwards.
 */
export type CashTender =
  | { kind: "unrecorded" }
  | { kind: "exact" }
  | { kind: "change"; change: number }
  /** Recorded as a part payment; `shortfall` stays owing on the bill. */
  | { kind: "short"; shortfall: number };

export function cashTender(tenderedKobo: number | null, totalKobo: number): CashTender {
  if (tenderedKobo === null) return { kind: "unrecorded" };
  if (tenderedKobo < totalKobo) return { kind: "short", shortfall: totalKobo - tenderedKobo };
  if (tenderedKobo === totalKobo) return { kind: "exact" };
  return { kind: "change", change: tenderedKobo - totalKobo };
}

/**
 * Whether taking this money closes the bill.
 *
 * A short tender is now recordable but does **not** settle — the difference
 * matters to the wording on the button, which should not say "paid" over an
 * amount that leaves a balance.
 */
export function settlesBill(tender: CashTender): boolean {
  return tender.kind !== "short";
}
