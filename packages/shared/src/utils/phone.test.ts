import { describe, it, expect } from "vitest";
import {
  InvalidPhoneError,
  formatPhone,
  isMalformedPhone,
  looksLikePhone,
  normalizePhone,
  tryNormalizePhone,
} from "./phone";

// These pin the client to the backend's app/services/phone.py. Phone is the
// unique identity of a staff account, so any disagreement between the two
// creates people who can't log in or duplicates of people who already exist.
describe("normalizePhone", () => {
  it("collapses every form a person might type to one canonical value", () => {
    for (const input of [
      "08031234567",
      "0803 123 4567",
      "0803-123-4567",
      "8031234567",
      "2348031234567",
      "+2348031234567",
      "+234 803 123 4567",
      "(0803) 123 4567",
    ]) {
      expect(normalizePhone(input)).toBe("+2348031234567");
    }
  });

  it("accepts the 7, 8 and 9 prefixes Nigerian mobiles actually use", () => {
    expect(normalizePhone("07031234567")).toBe("+2347031234567");
    expect(normalizePhone("08131234567")).toBe("+2348131234567");
    expect(normalizePhone("09061234567")).toBe("+2349061234567");
  });

  it("rejects anything that isn't a Nigerian mobile", () => {
    for (const bad of [
      "0123456789",      // wrong prefix
      "0803123456",      // too short
      "080312345678",    // too long
      "+14155552671",    // wrong country
      "not a phone",
      "",
    ]) {
      expect(() => normalizePhone(bad)).toThrow(InvalidPhoneError);
    }
  });

  it("throws rather than returning empty, so bad input can't be persisted", () => {
    // A null-returning API invites `phone: normalize(x) ?? x`, which silently
    // stores the un-normalized string.
    expect(() => normalizePhone("nonsense")).toThrow();
    expect(tryNormalizePhone("nonsense")).toBeNull();
    expect(tryNormalizePhone("0803 123 4567")).toBe("+2348031234567");
  });
});

describe("looksLikePhone", () => {
  it("separates a phone from an email so login can pick the right column", () => {
    expect(looksLikePhone("08031234567")).toBe(true);
    expect(looksLikePhone("+234 803 123 4567")).toBe(true);
    expect(looksLikePhone("owner@bukka.ng")).toBe(false);
  });

  it("does not require the number to be valid, only phone-shaped", () => {
    // Deciding which column to search is a separate question from whether the
    // value is a real number — mirroring the backend, which validates later.
    expect(looksLikePhone("1234567")).toBe(true);
  });
});

describe("formatPhone", () => {
  it("shows a merchant the local form they recognise", () => {
    expect(formatPhone("+2348031234567")).toBe("0803 123 4567");
  });

  it("passes anything unexpected through untouched", () => {
    expect(formatPhone("garbage")).toBe("garbage");
  });
});

describe("isMalformedPhone", () => {
  it("catches a number that is one digit short", () => {
    // The case that sent a manager back to retype their password: a 10-digit
    // local number normalizes to +234 plus nine digits, and needs ten.
    expect(isMalformedPhone("0810818337")).toBe(true);
    expect(isMalformedPhone("08108183370")).toBe(false);
  });

  it("accepts every shape normalizePhone accepts", () => {
    for (const ok of [
      "08108183370",
      "0810 818-3370",
      "+2348108183370",
      "2348108183370",
      "  08108183370  ",
    ]) {
      expect(isMalformedPhone(ok)).toBe(false);
    }
  });

  it("never refuses an email", () => {
    // The whole reason this is gated on looksLikePhone: staff sign in with
    // either, and an address must not be rejected for failing to be a number.
    expect(isMalformedPhone("manager@bukka.ng")).toBe(false);
    expect(isMalformedPhone("a@b.co")).toBe(false);
  });

  it("rejects a Nigerian number with an impossible prefix", () => {
    // +234 mobiles begin 7, 8 or 9.
    expect(isMalformedPhone("0110818337")).toBe(true);
  });

  it("passes a too-short numeric string through to the server", () => {
    // Under seven characters is not phone-shaped, so it is treated as an
    // identifier of some other kind rather than a broken number — which is
    // exactly how the backend routes it.
    expect(isMalformedPhone("08108")).toBe(false);
  });

  it("tolerates empty and whitespace input", () => {
    expect(isMalformedPhone("")).toBe(false);
    expect(isMalformedPhone("   ")).toBe(false);
  });
});
