import { describe, it, expect, afterEach, vi } from "vitest";
import { ApiError, NetworkError } from "./client";
import { describeError, errorMessage } from "./errors";

// Each case below is a failure that actually happened this week and was
// reported to a person as something else.
describe("describeError — telling failures apart", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls an unreachable server unreachable, not a rejection", () => {
    // A CORS wall and an offline server both arrive as a bare TypeError. The
    // customer app showed an empty menu for two days because of this.
    const d = describeError(new TypeError("Failed to fetch"), "load the menu");
    expect(d.kind).toBe("unreachable");
    expect(d.canRetry).toBe(true);
    expect(d.isOurFault).toBe(true);
    expect(d.message).toContain("load the menu");
  });

  it("treats a wrapped NetworkError the same way", () => {
    expect(describeError(new NetworkError()).kind).toBe("unreachable");
  });

  it("reports being offline before blaming the server", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const d = describeError(new TypeError("Failed to fetch"));
    expect(d.kind).toBe("offline");
    expect(d.message).toContain("nothing was sent");
  });

  it("does not swallow an aborted request as a network failure", () => {
    // AbortError is a caller's own doing and must not surface as an outage.
    const d = describeError(new Error("aborted"));
    expect(d.kind).not.toBe("unreachable");
  });

  it("names a 403 as a plan limit rather than a mystery", () => {
    // Every payment button on a Lite restaurant returned 403 and looked broken.
    const d = describeError(new ApiError(403, "Insufficient permissions", null));
    expect(d.kind).toBe("forbidden");
    expect(d.canRetry).toBe(false);
    expect(d.isOurFault).toBe(false);
  });

  it("keeps a 422's field name, which is the whole point of it", () => {
    const d = describeError(new ApiError(422, "owner_phone: Field required", null));
    expect(d.kind).toBe("invalid");
    expect(d.message).toBe("owner_phone: Field required");
    expect(d.isOurFault).toBe(false);
  });

  it("says a 500 is not the user's doing", () => {
    // The server's own words here are "Something went wrong", which tells the
    // reader nothing and implies they might have caused it.
    const d = describeError(
      new ApiError(500, "Something went wrong", null),
      "create the restaurant",
    );
    expect(d.kind).toBe("server");
    expect(d.isOurFault).toBe(true);
    expect(d.message).toContain("isn't something you did");
    expect(d.message).not.toContain("Something went wrong");
  });

  it("discards useless server messages but keeps useful ones", () => {
    expect(
      describeError(new ApiError(409, "That phone number already has an account", null))
        .message,
    ).toBe("That phone number already has an account");

    expect(
      describeError(new ApiError(409, "error", null)).message,
    ).not.toBe("error");
  });

  it("marks a 401 as ended rather than failed", () => {
    const d = describeError(new ApiError(401, "Missing bearer token", null));
    expect(d.kind).toBe("unauthenticated");
    expect(d.canRetry).toBe(false);
  });

  it("tells someone to wait on a 429 instead of hammering", () => {
    const d = describeError(new ApiError(429, "", null));
    expect(d.kind).toBe("server");
    expect(d.canRetry).toBe(true);
    expect(d.message).toMatch(/wait/i);
  });
});

describe("errorMessage — one line for a toast", () => {
  it("leads with the server's sentence when it is the useful part", () => {
    // A validation message is already a complete thought; prefixing it with
    // "Check the details." would bury it.
    expect(errorMessage(new ApiError(422, "price: not a number", null))).toBe(
      "price: not a number",
    );
  });

  it("supplies context when the server's message would not stand alone", () => {
    const msg = errorMessage(new TypeError("Failed to fetch"), "save settings");
    expect(msg).toContain("Can't reach Oshap");
    expect(msg).toContain("save settings");
  });
});

/**
 * The platform dashboard sat blank while `GET /platform/restaurants` returned
 * 500, and told the operator to "check your connection". Their connection was
 * fine; 15 restaurants were sitting in the database. `QueryError` defaulted to
 * that copy and not one of its thirteen call sites passed the actual error, so
 * every failure in both apps was reported as a network problem.
 */
describe("a server fault is never blamed on the network", () => {
  it("does not mention the user's connection on a 500", () => {
    const d = describeError(
      new ApiError(500, "Something went wrong", null),
      "load the restaurants",
    );
    expect(d.kind).toBe("server");
    expect(d.isOurFault).toBe(true);
    expect(d.message.toLowerCase()).not.toContain("your connection");
    expect(d.message.toLowerCase()).not.toContain("check your");
  });

  // Only the genuinely offline case may say it, because only then is it true.
  it("says it when the browser really is offline", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: false },
      configurable: true,
    });
    try {
      const d = describeError(new ApiError(500, "Something went wrong", null));
      expect(d.kind).toBe("offline");
      expect(d.message.toLowerCase()).toContain("connection");
    } finally {
      if (original) Object.defineProperty(globalThis, "navigator", original);
    }
  });

  it("still offers a retry when nothing is known about the failure", () => {
    const d = describeError(undefined);
    expect(d.canRetry).toBe(true);
    expect(d.title).toBe("Something went wrong");
  });
});

describe("a 403 says which kind of no it is", () => {
  /**
   * Seen in service: a waiter opened the kitchen board and got
   * **"Not available on this plan"** as the heading, with the server's own
   * *"Insufficient permissions"* underneath. The heading and the message
   * contradicted each other, and it sends an owner to check their subscription
   * over what is really a staff permission.
   */
  const forbidden = (message: string) =>
    describeError(new ApiError(403, message, null));

  it("names the plan only when the server does", () => {
    expect(forbidden("Upgrade your plan to use branches").title).toBe(
      "Not available on this plan",
    );
  });

  it.each([
    "Insufficient permissions",
    "Your role does not allow this",
    "Forbidden",
  ])("does not blame the plan for %o", (message) => {
    expect(forbidden(message).title).toBe("You can't open this");
  });

  it("passes the server's own words through either way", () => {
    expect(forbidden("Insufficient permissions").message).toBe(
      "Insufficient permissions",
    );
  });

  it("covers both causes when the server says nothing useful", () => {
    const d = forbidden("");
    expect(d.message).toContain("plan");
    expect(d.message).toContain("role");
  });

  it("is never retryable — waiting changes neither a plan nor a role", () => {
    expect(forbidden("Insufficient permissions").canRetry).toBe(false);
    expect(forbidden("Insufficient permissions").isOurFault).toBe(false);
  });
});
