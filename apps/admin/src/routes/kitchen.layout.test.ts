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

/**
 * A waiter opening the board and being told they can't.
 *
 * `GET /admin/menu` is owner and manager only. The board asked for it on every
 * role and blanked itself on any error, so a waiter got "You can't open this"
 * on the one screen they need most — Served is tapped from it. Nothing in the
 * API testing caught it, because the API was right; the screen was wrong.
 */
describe("the kitchen board and the menu it does not always need", () => {
  it("only fetches the menu for the roles that split by it", () => {
    expect(src).toContain("useAdminMenu({ enabled: isStationRole })");
  });

  it("only the tickets can empty the screen", () => {
    // A menu failure costs the drinks/food split, which is recoverable. A
    // blank board during service is not.
    expect(src).not.toContain("kitchenQuery.isError || menuQuery.isError");
    expect(src).toContain("if (kitchenQuery.isError) {");
  });

  it("does not wait on a menu it never asked for", () => {
    expect(src).toContain("(isStationRole && menuQuery.isLoading)");
  });

  it("shows every ticket when it cannot split, rather than none", () => {
    // With an empty lookup every `.some()` is false, so a bartender whose menu
    // failed saw an empty board and no error — which looks like a quiet night.
    expect(src).toContain("const canSplit = !isStationRole || menuLookup.size > 0");
    expect(src).toContain("if (!user || !canSplit) return true;");
    expect(src).toContain("if (!user || !canSplit) return o;");
  });

  it("and says so instead of quietly mixing the two", () => {
    expect(src).toContain("isStationRole && !canSplit");
    expect(src).toContain("Showing every ticket");
  });
});
