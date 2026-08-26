import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Two layout facts about the kitchen board, guarded at source.
 *
 * Both are things a render test in jsdom cannot see — jsdom applies no CSS, so
 * a stacked header and a flat card look identical to it. The class list is
 * where the behaviour lives, so the class list is what gets checked.
 */
const src = readFileSync(
  resolve(process.cwd(), "apps/admin/src/routes/kitchen.tsx"),
  "utf8",
);

const header = src.slice(src.indexOf("<header"), src.indexOf("</header>"));

describe("the kitchen header stacks on a phone", () => {
  it("is a column by default and a row from sm up", () => {
    // Side by side, the title shrank to make room for three count pills.
    expect(header).toContain("flex flex-col");
    expect(header).toContain("sm:flex-row");
  });

  it("does not force a row at every width", () => {
    expect(header).not.toMatch(/className="[^"]*\bflex items-center justify-between/);
  });

  it("lets the counts wrap rather than run off the screen", () => {
    expect(header).toContain("flex-wrap");
  });
});

describe("kitchen tickets have no accent bar", () => {
  it("no card carries a left border", () => {
    // The column heading above it already carries the colour.
    expect(src).not.toContain("border-l");
  });

  it("the accent map no longer offers one", () => {
    expect(src).not.toContain("cardBorder");
  });

  it("but the header rule and the quantity keep the colour", () => {
    expect(src).toContain("border-b-primary");
    expect(src).toContain("border-b-warning");
    expect(src).toContain("border-b-success");
    expect(src).toContain("text-primary");
  });
});
