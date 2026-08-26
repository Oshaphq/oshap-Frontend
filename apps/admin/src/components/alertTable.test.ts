import { describe, it, expect } from "vitest";
import { resolveTableName } from "./AlertCenter";

const tables = [
  { id: "ace5c88a-aa5e-470b-a781-a9611bc1d55e", table_id: "T4" },
  { id: "bb11ccdd-0000-0000-0000-000000000002", table_id: "T1" },
];

/**
 * `table_id` on the event stream is a uuid on some events and a name on others.
 * Measured on the live stream:
 *
 *   waiter_called   table_id: "ace5c88a-aa5e-470b-…"   uuid
 *   new_order       table_id: "T1"                     name
 *   pos_requested   table_id: "T1"                     name
 *
 * Matching only the uuid meant orders and card requests never resolved a name
 * and fell through to "table not recorded" — copy meant for genuinely broken
 * data, on two events that carry it perfectly well.
 */
describe("naming the table from whichever identifier arrived", () => {
  it("resolves a uuid, as waiter_called sends", () => {
    expect(resolveTableName(tables, "ace5c88a-aa5e-470b-a781-a9611bc1d55e")).toBe("T4");
  });

  it("resolves a name, as new_order and pos_requested send", () => {
    expect(resolveTableName(tables, "T1")).toBe("T1");
  });

  it("prefers the uuid when a name could collide with one", () => {
    // Names repeat across restaurants; a uuid never does.
    const odd = [
      { id: "T1", table_id: "T9" },
      { id: "zzzz", table_id: "T1" },
    ];
    expect(resolveTableName(odd, "T1")).toBe("T9");
  });

  it("gives nothing rather than showing a uuid to a waiter", () => {
    expect(resolveTableName(tables, "unknown-id")).toBeNull();
  });

  it.each([[undefined], [[]]])("copes with %o tables", (t) => {
    expect(resolveTableName(t as undefined, "T1")).toBeNull();
  });

  it("copes with an empty reference", () => {
    expect(resolveTableName(tables, "")).toBeNull();
  });
});
