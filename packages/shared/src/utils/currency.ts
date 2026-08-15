/**
 * Money handling.
 *
 * **Every money value crossing the API is an integer number of kobo**
 * (1 naira = 100 kobo). The backend stores and computes in kobo with no floats
 * anywhere, so VAT and order totals reconcile exactly. We match that: values
 * stay in kobo from the network through state and arithmetic, and convert to
 * naira only at the two edges — rendering, and reading a number a human typed.
 *
 * The trap this file exists to close: kobo and naira are both plain `number`,
 * so mixing them is silent and off by 100×. Anything that formats money goes
 * through `formatCurrency`; anything that reads a price from a form goes
 * through `nairaToKobo`. Don't do the arithmetic inline.
 */

/**
 * Two formatters rather than one with a 0–2 range: a range renders ₦187.50 as
 * "₦187.5", dropping the trailing zero, which reads wrong for money. So whole
 * naira get no decimals and anything with kobo gets exactly two.
 */
const whole = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const withKobo = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats an integer kobo amount for display.
 * `250000` → "₦2,500" · `18750` → "₦187.50"
 */
export function formatCurrency(kobo: number): string {
  // Integer test, not `Number.isInteger(kobo / 100)` — the division is the
  // thing that can go imprecise.
  return kobo % 100 === 0 ? whole.format(kobo / 100) : withKobo.format(kobo / 100);
}

/**
 * Converts a naira amount a human typed into the kobo integer the API expects.
 * Rounds, because `2500.005 * 100` is not an integer in binary floating point.
 */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Converts kobo back to naira for pre-filling an edit form. Returns a plain
 * number, so `250000` → `2500` rather than `"2500.00"`.
 */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}
