import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * One rule above the total, not two.
 *
 * `Line` draws a bottom border and drops it with `last:border-none` — but in
 * the takings card the last child was the total row, which draws its own rule.
 * So Card / POS kept a border and the two sat 8px apart as a double line.
 */
const src = readFileSync(
  resolve(process.cwd(), "apps/admin/src/routes/z-report.tsx"),
  "utf8",
).replace(/\r/g, "");

const takings = src.slice(
  src.indexOf("Takings by method"),
  src.indexOf("Included in the day"),
);

describe("the takings card", () => {
  it("groups the methods so the last one drops its border", () => {
    const methods = takings.slice(
      takings.indexOf("METHOD_LABELS.CASH"),
      takings.indexOf("Total takings"),
    );
    // The three Lines and their wrapper close before the total row opens.
    expect(methods).toMatch(/<\/div>\s*<div className="flex items-center/);
  });

  it("draws exactly one rule above the total", () => {
    expect(takings.match(/border-t-2/g)).toHaveLength(1);
  });

  it("no longer pads the total away from a border that is not there", () => {
    expect(takings).not.toContain("pt-md mt-s border-t-2");
  });

  it("leaves the deductions list alone, where last:border-none already works", () => {
    const included = src.slice(src.indexOf("Included in the day"));
    expect(included).toContain('label="Refunded"');
    expect(included).not.toContain("border-t-2");
  });
});
