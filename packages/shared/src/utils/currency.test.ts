import { describe, it, expect } from "vitest";
import { formatCurrency, koboToNaira, nairaToKobo } from "./currency";

// Every amount here is deliberately written as kobo with the naira value in the
// test name. The whole class of bug this guards against is someone passing
// naira into a kobo function, which is silent and off by 100x.

describe("formatCurrency", () => {
  it("renders 250000 kobo as ₦2,500", () => {
    const out = formatCurrency(250_000);
    expect(out).toMatch(/2,500/);
    expect(out).not.toContain(".");
  });

  it("shows decimals only when the amount has kobo — 18750 → ₦187.50", () => {
    expect(formatCurrency(18_750)).toMatch(/187\.50/);
  });

  it("formats zero without decimals", () => {
    const out = formatCurrency(0);
    expect(out).toMatch(/\b0\b/);
    expect(out).not.toContain(".");
  });

  it("formats large amounts with thousands separators", () => {
    expect(formatCurrency(123_456_700)).toMatch(/1,234,567/);
  });

  it("renders a single kobo rather than rounding it away", () => {
    expect(formatCurrency(1)).toMatch(/0\.01/);
  });
});

describe("nairaToKobo", () => {
  it("converts whole naira", () => {
    expect(nairaToKobo(2500)).toBe(250_000);
  });

  it("converts naira with kobo", () => {
    expect(nairaToKobo(187.5)).toBe(18_750);
  });

  // 187.55 * 100 is 18754.999... in binary floating point. Truncating would
  // silently lose a kobo on every such price.
  it("rounds rather than truncates float artefacts", () => {
    expect(nairaToKobo(187.55)).toBe(18_755);
    expect(Number.isInteger(nairaToKobo(0.07))).toBe(true);
  });

  it("handles zero", () => {
    expect(nairaToKobo(0)).toBe(0);
  });
});

describe("koboToNaira", () => {
  it("round-trips through nairaToKobo", () => {
    for (const naira of [0, 500, 2500, 187.5, 0.01]) {
      expect(koboToNaira(nairaToKobo(naira))).toBe(naira);
    }
  });
});
