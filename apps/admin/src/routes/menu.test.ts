import { describe, it, expect } from "vitest";
import { listNames } from "./menu";

/**
 * The bulk-delete confirmation names dishes rather than counting them.
 * "Delete 6 items?" is a number a tired person says yes to; seeing the names is
 * what catches the row that got ticked by accident.
 */
describe("listNames", () => {
  it.each([
    [[], ""],
    [["Suya"], "Suya"],
    [["Suya", "Jollof"], "Suya and Jollof"],
    [["Suya", "Jollof", "Puff"], "Suya, Jollof and 1 more"],
    [["Suya", "Jollof", "Puff", "Moi Moi"], "Suya, Jollof and 2 more"],
  ])("%o reads as %o", (names, expected) => {
    expect(listNames(names)).toBe(expected);
  });

  it("stays short however long the selection is", () => {
    const many = Array.from({ length: 40 }, (_, i) => `Dish ${i}`);
    // A toast that lists forty dishes is a toast nobody reads.
    expect(listNames(many)).toBe("Dish 0, Dish 1 and 38 more");
  });
});
