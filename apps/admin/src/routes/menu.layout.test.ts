import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Layout facts from the Figma extract, guarded at source.
 *
 * jsdom applies no CSS, so a stacked header, a filled button and an outlined
 * one all look the same to a render test. The class list is where these live.
 */
const read = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), "utf8");

const src = read("apps/admin/src/routes/menu.tsx");
const banner = read("apps/admin/src/components/LowStockBanner.tsx");
const header = src.slice(src.indexOf("<header"), src.indexOf("</header>"));

describe("the menu header stacks", () => {
  it("the title has its own line above the toolbar", () => {
    expect(header).toContain("flex flex-col");
    expect(header).not.toContain("justify-between");
  });

  it("and the toolbar still wraps rather than overflowing", () => {
    // Five actions never fit one phone-width row.
    expect(header).toContain("flex-wrap");
  });

  it("the toolbar is not pushed to the right edge", () => {
    expect(header).not.toContain("justify-end");
  });
});

describe("row actions: one filled group, one outlined destructive", () => {
  const row = src.slice(
    src.indexOf('onClick={onToggle}'),
    src.indexOf("</div>", src.indexOf("onClick={onDelete}")),
  );

  it("Delete is the only bordered button", () => {
    // It is the one that cannot be undone, so it is the odd one out.
    expect(row.match(/border border-error/g)).toHaveLength(1);
    expect(row).not.toContain("border border-outline-variant");
  });

  it("Edit no longer wears the primary outline", () => {
    expect(row).not.toContain("border border-primary");
  });

  it("the neutral four are filled", () => {
    // Not ``: that also matches inside `hover:bg-surface-container-high`.
    expect(row.match(/(?<!hover:)bg-surface-container(?!-)/g)).toHaveLength(4);
  });
});

describe("state reads as a pill", () => {
  it("availability is a chip, not a dot beside grey text", () => {
    expect(src).toContain('{item.available ? "Available" : "Unavailable"}');
    expect(src).not.toContain("w-2 h-2 rounded-full");
  });

  it("unavailable is neutral, not an error", () => {
    // A dish taken off the menu is a choice, not a fault.
    const pill = src.slice(
      src.indexOf("shrink-0 px-s py-0.5 rounded-4xl"),
      src.indexOf('{item.available ? "Available" : "Unavailable"}'),
    );
    expect(pill).toContain("bg-surface-container-high");
    expect(pill).not.toContain("error");
  });

  it("the stock badge is a sibling of the header row, not buried in it", () => {
    // Nested in the name column it shared width with a 64px thumbnail.
    const body = src.indexOf('<div className="p-md flex flex-col gap-s">');
    const stock = src.indexOf("{isStockEditing ? (");
    const nameCol = src.indexOf('<div className="flex flex-col gap-xs min-w-0">');
    expect(stock).toBeGreaterThan(body);
    expect(stock).toBeGreaterThan(nameCol);
    expect(src.slice(body, stock)).toContain("Available");
  });
});

describe("the low stock banner gives its width to the chips", () => {
  it("the icon sits on the heading line", () => {
    expect(banner).toContain("flex items-center gap-s text-label-l4");
  });

  it("and the list is no longer indented behind it", () => {
    expect(banner).not.toContain("flex items-start gap-s p-md");
  });

  it("chips are pills", () => {
    expect(banner).toContain("rounded-4xl");
  });
});
