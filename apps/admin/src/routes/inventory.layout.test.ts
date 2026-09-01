import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Layout facts from the Figma extract, guarded at source.
 *
 * jsdom applies no CSS, so a stacked card and a table row look identical to a
 * render test — and the whole point here is which one a phone gets.
 */
const src = readFileSync(
  resolve(process.cwd(), "apps/admin/src/routes/inventory.tsx"),
  "utf8",
);
const header = src.slice(src.indexOf("<header"), src.indexOf("</header>"));

describe("the inventory header stacks", () => {
  it("the title block sits above the actions", () => {
    expect(header).toContain("flex flex-col");
    expect(header).not.toContain("justify-between");
  });

  it("the strapline breaks where it was written to break", () => {
    // Two things to know. Run together, the second read as a qualification of
    // the first.
    expect(src).toContain(">What your dishes are made of.<");
    expect(src).toContain(">Plate counts live on the menu screen.<");
  });
});

describe("an ingredient row is a card on a phone and a row in a table", () => {
  it("the phone layout exists and is hidden from sm up", () => {
    expect(src).toContain("flex flex-col gap-s sm:hidden");
  });

  it("the table cells are hidden below sm", () => {
    // Four cells plus the action column.
    expect(src.match(/hidden sm:block/g)?.length).toBe(4);
    expect(src).toContain("hidden sm:flex");
  });

  it("no longer collapses to two unlabelled columns", () => {
    expect(src).not.toContain("grid grid-cols-2 sm:grid-cols-subgrid");
  });

  it("keeps the shared subgrid that aligns the columns", () => {
    // The tracks are shared with the header rather than merely matching it.
    expect(src).toContain("sm:grid-cols-subgrid");
    expect(src).toContain("sm:col-span-5");
  });

  it("names the threshold on the phone instead of leaving a bare number", () => {
    // "3 kg" under a name says nothing about whether it is the count or the
    // alert level, on the screen where confusing them means ordering wrong.
    expect(src).toContain("Alert at {qty(ingredient.low_stock_threshold)}");
  });

  it("and marks the unit cost as per-unit", () => {
    expect(src).toContain('{formatCurrency(ingredient.cost_per_unit)} /{" "}');
  });
});

describe("row actions", () => {
  it("Edit is a labelled button, not a bare pencil", () => {
    // An aria-label reads fine to a screen reader and tells a sighted manager
    // nothing.
    expect(src).not.toContain("mgc_edit_line");
    // Whitespace-agnostic, so a reformat or a CRLF checkout cannot fail it.
    expect(src).toMatch(/>\s*Edit\s*<\/button>/);
  });

  it("Adjust is filled and Edit is outlined", () => {
    const actions = src.slice(src.indexOf("function RowActions"));
    expect(actions).toContain("bg-surface-container text-on-surface-variant");
    expect(actions).toContain("border border-outline-variant");
  });

  it("both layouts use the same pair", () => {
    expect(src.match(/<RowActions/g)).toHaveLength(2);
  });
});
