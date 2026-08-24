import { describe, it, expect } from "vitest";
import { paymentMethodPhrase } from "./pay";

/**
 * Guests paying cash at the table only started seeing this receipt once it
 * stopped tracking the order by claim alone — so the wording now has to cope
 * with methods it never used to meet.
 */
describe("how the money arrived, in words", () => {
  it.each([
    ["CASH", " in cash"],
    ["POS", " by card"],
    ["MANUAL_TRANSFER", " by transfer"],
  ])("%s reads as %o", (method, expected) => {
    expect(paymentMethodPhrase(method)).toBe(expected);
  });

  it.each([[null], [undefined], ["SOMETHING_NEW"], [""]])(
    "says nothing rather than guessing for %o",
    (method) => {
      // This used to fall through to "by transfer", which is a guess dressed as
      // a fact on a document a guest may keep. Naming no method is honest;
      // naming the wrong one is not.
      expect(paymentMethodPhrase(method)).toBe("");
    },
  );

  it("reads as a sentence when appended to an amount", () => {
    expect(`₦12,400 received${paymentMethodPhrase("CASH")}`).toBe(
      "₦12,400 received in cash",
    );
    expect(`₦12,400 received${paymentMethodPhrase(null)}`).toBe("₦12,400 received");
  });
});
