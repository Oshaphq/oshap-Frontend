import { describe, it, expect } from "vitest";
import { formatCurrency } from "./currency";

describe("formatCurrency", () => {
  it("formats whole naira with thousands separators and no decimals", () => {
    const out = formatCurrency(2500);
    expect(out).toMatch(/2,500/);
    expect(out).not.toContain(".");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toMatch(/\b0\b/);
  });

  it("formats large amounts", () => {
    expect(formatCurrency(1234567)).toMatch(/1,234,567/);
  });
});
