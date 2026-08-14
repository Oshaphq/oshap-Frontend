import { describe, it, expect, afterEach, vi } from "vitest";
import {
  buildTableUrl,
  getCustomerOrigin,
  isLocalOrigin,
  qrFileName,
} from "./qr";

afterEach(() => vi.unstubAllEnvs());

describe("buildTableUrl", () => {
  it("builds the customer menu deep link the app actually routes on", () => {
    expect(buildTableUrl("T1", "https://order.oshap.app")).toBe(
      "https://order.oshap.app/menu?table=T1",
    );
  });

  // Table IDs are free text — "VIP 1", "Bar 2", "T-G37" are all valid.
  // An unencoded space produces a QR code that silently loses the table.
  it("encodes table ids containing spaces and symbols", () => {
    expect(buildTableUrl("VIP 1", "https://order.oshap.app")).toBe(
      "https://order.oshap.app/menu?table=VIP%201",
    );
    expect(buildTableUrl("Bar&Grill", "https://order.oshap.app")).toBe(
      "https://order.oshap.app/menu?table=Bar%26Grill",
    );
  });

  it("does not double up the slash when the origin has a trailing one", () => {
    vi.stubEnv("VITE_CUSTOMER_APP_URL", "https://order.oshap.app/");
    expect(buildTableUrl("T1")).toBe("https://order.oshap.app/menu?table=T1");
  });
});

describe("getCustomerOrigin", () => {
  it("falls back to the dev customer port when unset", () => {
    vi.stubEnv("VITE_CUSTOMER_APP_URL", "");
    expect(getCustomerOrigin()).toBe("http://localhost:5173");
  });
});

describe("isLocalOrigin", () => {
  it.each([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://0.0.0.0:5173",
  ])("flags %s as unreachable from a guest's phone", (origin) => {
    expect(isLocalOrigin(origin)).toBe(true);
  });

  it.each(["https://order.oshap.app", "https://localhost.oshap.app"])(
    "treats %s as a real public origin",
    (origin) => {
      expect(isLocalOrigin(origin)).toBe(false);
    },
  );
});

describe("qrFileName", () => {
  it("slugifies table ids into safe filenames", () => {
    expect(qrFileName("VIP 1")).toBe("table-vip-1");
    expect(qrFileName("T-G37")).toBe("table-t-g37");
  });

  it("falls back rather than emitting a bare dash for symbol-only ids", () => {
    expect(qrFileName("///")).toBe("table-table");
  });
});
