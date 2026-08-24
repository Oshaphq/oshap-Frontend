import { describe, it, expect } from "vitest";
import {
  formatApiDate,
  formatApiDateTime,
  formatApiTime,
  parseApiDate,
} from "./datetime";

/**
 * From the pilot: a waiter call placed seconds earlier showed as "1h". The
 * server sent a naive datetime, the browser read it as local time, and Lagos is
 * UTC+1 — so the error was exactly one hour, every time.
 */
describe("a timestamp with no zone is read as UTC, not as local time", () => {
  it("reads a naive datetime the way the server meant it", () => {
    expect(parseApiDate("2026-08-23T10:00:00").toISOString()).toBe(
      "2026-08-23T10:00:00.000Z",
    );
  });

  it("agrees with the same instant written properly", () => {
    expect(parseApiDate("2026-08-23T10:00:00").getTime()).toBe(
      parseApiDate("2026-08-23T10:00:00Z").getTime(),
    );
  });

  it("shows no elapsed time for something that just happened", () => {
    // The bug in one assertion: naive `now`, parsed as local, read an hour old.
    const naive = new Date().toISOString().replace("Z", "");
    const drift = Math.abs(Date.now() - parseApiDate(naive).getTime());
    expect(drift).toBeLessThan(2000);
  });
});

describe("timestamps that already say what they mean are left alone", () => {
  it.each([
    ["2026-08-23T10:00:00Z", "2026-08-23T10:00:00.000Z"],
    ["2026-08-23T10:00:00.500Z", "2026-08-23T10:00:00.500Z"],
    ["2026-08-23T11:00:00+01:00", "2026-08-23T10:00:00.000Z"],
    ["2026-08-23T11:00:00+0100", "2026-08-23T10:00:00.000Z"],
    ["2026-08-23T05:00:00-05:00", "2026-08-23T10:00:00.000Z"],
  ])("%s", (input, expected) => {
    expect(parseApiDate(input).toISOString()).toBe(expected);
  });

  it("leaves a date-only string alone — those are already UTC", () => {
    // Appending a marker to one produces an invalid date, not a corrected one.
    expect(parseApiDate("2026-08-23").toISOString()).toBe("2026-08-23T00:00:00.000Z");
  });
});

describe("the formatters go through the same guard", () => {
  // These exist so call sites stop writing `new Date(x).toLocaleString()`,
  // which is how one zoneless-timestamp bug reached five screens. If they ever
  // stop parsing correctly, so does every screen at once.
  const naive = "2026-08-23T22:30:00";
  const zoned = "2026-08-23T22:30:00Z";

  it("formatApiDateTime reads a naive timestamp as UTC", () => {
    expect(formatApiDateTime(naive)).toBe(formatApiDateTime(zoned));
  });

  it("formatApiTime reads a naive timestamp as UTC", () => {
    expect(formatApiTime(naive)).toBe(formatApiTime(zoned));
  });

  it("formatApiDate keeps a late-evening order on the right day", () => {
    // The sharper half of the bug: an hour's drift moves a 23:30 order onto the
    // previous date, so a whole history row files under the wrong day.
    expect(formatApiDate(naive)).toBe(formatApiDate(zoned));
  });
});
