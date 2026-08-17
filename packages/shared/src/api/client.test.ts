import { describe, it, expect, afterEach, vi } from "vitest";
import {
  request,
  ApiError,
  setActiveBranchId,
  getActiveBranchId,
  setAuthTokens,
  getAccessToken,
} from "./client";

// With neither VITE_API_BASE_URL nor VITE_MOCK_API set, the client runs against
// the in-memory mock — so these exercise the real request() path end to end.

describe("client request() — error envelope", () => {
  it("throws an ApiError carrying the status and server message on 4xx", async () => {
    const err = await request("/orders", {
      method: "POST",
      body: { table: "T1", restaurant_id: "x", items: [] },
    }).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).message).toBeTruthy();
  });
});

describe("client request() — active branch scoping", () => {
  afterEach(() => setActiveBranchId(null));

  it("round-trips the active branch through storage", () => {
    setActiveBranchId("rest-002");
    expect(getActiveBranchId()).toBe("rest-002");
    setActiveBranchId(null);
    expect(getActiveBranchId()).toBeNull();
  });

  it("appends branch_id to admin GETs (non-home branch comes back empty)", async () => {
    setActiveBranchId("rest-002");
    const res = await request<{ tables: unknown[] }>("/admin/tables", { admin: true });
    expect(res.tables).toEqual([]);
  });

  it("does not scope when no branch is active", async () => {
    setActiveBranchId(null);
    const res = await request<{ tables: unknown[] }>("/admin/tables", { admin: true });
    expect(res.tables.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Real-fetch path. The suites above deliberately run against the mock, which
// returns bare payloads — so only these can exercise the envelope handling the
// FastAPI backend actually produces.
// ---------------------------------------------------------------------------

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 400 ? "Bad Request" : "OK",
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? "application/json" : null,
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function stubBackend(status: number, body: unknown) {
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000");
  const fetchMock = vi.fn(async () => jsonResponse(status, body));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("client request() — backend response envelope", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("unwraps { success, message, code, data } to the inner payload", async () => {
    stubBackend(200, {
      success: true,
      message: "Menu fetched",
      code: 200,
      data: [{ id: "m-001", name: "Chicken Shawarma" }],
    });

    const res = await request<Array<{ id: string }>>("/menu");

    expect(Array.isArray(res)).toBe(true);
    expect(res).toEqual([{ id: "m-001", name: "Chicken Shawarma" }]);
  });

  it("passes a bare (un-enveloped) payload through untouched", async () => {
    stubBackend(200, [{ id: "m-001" }]);

    const res = await request<Array<{ id: string }>>("/menu");

    expect(res).toEqual([{ id: "m-001" }]);
  });

  it("does not mistake a payload that merely has a `data` key for an envelope", async () => {
    stubBackend(200, { data: "not-an-envelope" });

    const res = await request<{ data: string }>("/menu");

    expect(res).toEqual({ data: "not-an-envelope" });
  });

  it("surfaces the envelope's `message` on an error response", async () => {
    stubBackend(400, {
      success: false,
      message: "Table T1 is closed",
      code: 400,
      data: {},
    });

    const err = await request("/orders", {
      method: "POST",
      body: { table: "T1" },
    }).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).message).toBe("Table T1 is closed");
  });

  it("falls back to statusText when no recognizable message key is present", async () => {
    stubBackend(400, { unexpected: "shape" });

    const err = await request("/menu").catch((e) => e);

    expect((err as ApiError).message).toBe("Bad Request");
  });
});

describe("client request() — API version prefix", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function requestedUrl(fetchMock: ReturnType<typeof vi.fn>): string {
    return String(fetchMock.mock.calls[0]![0]);
  }

  it("prepends API_PREFIX so call sites can stay bare", async () => {
    const fetchMock = stubBackend(200, []);

    await request("/menu");

    expect(requestedUrl(fetchMock)).toBe("http://localhost:8000/api/v1/menu");
  });

  it("keeps query params after the prefixed path", async () => {
    const fetchMock = stubBackend(200, []);

    await request("/menu", { query: { restaurant_id: "r-1" } });

    expect(requestedUrl(fetchMock)).toBe(
      "http://localhost:8000/api/v1/menu?restaurant_id=r-1",
    );
  });

  // Guards the migration: .env files predating API_PREFIX carried the suffix,
  // and double-prefixing would 404 everything exactly as silently as before.
  it.each([
    ["http://localhost:8000/api", "legacy /api suffix"],
    ["http://localhost:8000/api/v1", "legacy /api/v1 suffix"],
    ["http://localhost:8000/api/v1/", "legacy suffix with trailing slash"],
  ])("strips a %s from the configured base URL", async (baseUrl) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("VITE_API_BASE_URL", baseUrl);
    const fetchMock = vi.fn(async () => jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await request("/menu");

    expect(requestedUrl(fetchMock)).toBe("http://localhost:8000/api/v1/menu");
  });
});

// ---------------------------------------------------------------------------
// Token refresh. Access tokens last 15 minutes, so expiry mid-session is
// routine — these cover the paths that decide whether a waiter keeps working
// or gets bounced to the login screen mid-service.
// ---------------------------------------------------------------------------

describe("client request() — refresh on 401", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    sessionStorage.clear();
    setAuthTokens(null);
  });

  function signIn() {
    setAuthTokens({ access_token: "expired", refresh_token: "refresh-ok" });
  }

  /** 401 once, then succeed — with the refresh call answered in between. */
  function stubExpiredThenRefreshed(refreshOk = true) {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000");
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const target = String(url);
      if (target.includes("/auth/refresh")) {
        return refreshOk
          ? jsonResponse(200, { access_token: "fresh", token_type: "bearer", expires_in: 900 })
          : jsonResponse(401, { message: "Refresh token expired" });
      }
      const auth = (init?.headers as Record<string, string> | undefined)?.["Authorization"];
      return auth === "Bearer fresh"
        ? jsonResponse(200, [{ id: "m-001" }])
        : jsonResponse(401, { message: "Token expired" });
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
    return fetchMock;
  }

  it("refreshes and retries, so the caller never sees the 401", async () => {
    signIn();
    const fetchMock = stubExpiredThenRefreshed();

    const res = await request<Array<{ id: string }>>("/admin/menu", { admin: true });

    expect(res).toEqual([{ id: "m-001" }]);
    // original 401 -> refresh -> retry
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getAccessToken()).toBe("fresh");
  });

  it("sends the NEW token on the retry, not the expired one", async () => {
    signIn();
    const fetchMock = stubExpiredThenRefreshed();

    await request("/admin/menu", { admin: true });

    const retry = fetchMock.mock.calls[2]!;
    const headers = (retry[1] as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer fresh");
  });

  // A dashboard mounts several queries at once, so an expired token produces a
  // burst of simultaneous 401s. Without single-flight each would refresh, and
  // every response after the first would race to overwrite the stored token.
  it("refreshes once for concurrent 401s, not once per request", async () => {
    signIn();
    const fetchMock = stubExpiredThenRefreshed();

    await Promise.all([
      request("/admin/menu", { admin: true }),
      request("/admin/tables", { admin: true }),
      request("/admin/kitchen", { admin: true }),
    ]);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("gives up and clears the session when the refresh token is also dead", async () => {
    signIn();
    stubExpiredThenRefreshed(false);

    const err = await request("/admin/menu", { admin: true }).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect(getAccessToken()).toBeNull();
  });

  it("does not attempt a refresh for unauthenticated customer calls", async () => {
    const fetchMock = stubExpiredThenRefreshed();

    await request("/menu").catch(() => {});

    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes("/auth/refresh")),
    ).toBe(false);
  });
});

// The payloads below are copied verbatim from the deployed API at
// oshap-cerebrum.useshappay.com, not invented — this is the one suite that
// can be checked against the real thing without a database behind it.
describe("client request() — validation errors name the field", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("names the field from a 422 instead of the bare 'Field required'", async () => {
    stubBackend(422, {
      success: false,
      code: 422,
      message: "Field required",
      data: {
        errors: [
          {
            type: "missing",
            loc: ["body", "restaurant_id"],
            msg: "Field required",
            input: { table: "T1" },
          },
        ],
      },
    });

    const err = (await request("/orders", {
      method: "POST",
      body: { table: "T1" },
    }).catch((e) => e)) as ApiError;

    expect(err.status).toBe(422);
    expect(err.message).toBe("restaurant_id: Field required");
  });

  it("lists several fields, capping the tail", async () => {
    stubBackend(422, {
      success: false,
      code: 422,
      message: "Field required",
      data: {
        errors: [
          { loc: ["body", "name"], msg: "Field required" },
          { loc: ["body", "price"], msg: "Field required" },
          { loc: ["body", "category"], msg: "Field required" },
          { loc: ["body", "unit"], msg: "Field required" },
          { loc: ["body", "qty"], msg: "Field required" },
        ],
      },
    });

    const err = (await request("/admin/menu", { method: "POST", body: {} }).catch(
      (e) => e,
    )) as ApiError;

    expect(err.message).toBe(
      "name: Field required; price: Field required; category: Field required (and 2 more)",
    );
  });

  it("reaches past array indexes to the field that actually failed", async () => {
    stubBackend(422, {
      success: false,
      code: 422,
      message: "Input should be a valid integer",
      data: {
        errors: [
          {
            loc: ["body", "items", 0, "price"],
            msg: "Input should be a valid integer",
          },
        ],
      },
    });

    const err = (await request("/orders", { method: "POST", body: {} }).catch(
      (e) => e,
    )) as ApiError;

    expect(err.message).toBe("price: Input should be a valid integer");
  });

  it("names a missing header, skipping the location segment", async () => {
    stubBackend(422, {
      success: false,
      code: 422,
      message: "Field required",
      data: {
        errors: [
          { loc: ["header", "x-platform-token"], msg: "Field required" },
        ],
      },
    });

    const err = (await request("/platform/restaurants").catch(
      (e) => e,
    )) as ApiError;

    expect(err.message).toBe("x-platform-token: Field required");
  });

  it("handles a bare FastAPI 422 with issues on `detail`", async () => {
    stubBackend(422, {
      detail: [{ loc: ["body", "email"], msg: "value is not a valid email" }],
    });

    const err = (await request("/auth/login", {
      method: "POST",
      body: {},
    }).catch((e) => e)) as ApiError;

    expect(err.message).toBe("email: value is not a valid email");
  });

  it("still prefers the plain message when there are no validation issues", async () => {
    stubBackend(404, {
      success: false,
      code: 404,
      message: "Table not found",
      data: {},
    });

    const err = (await request("/table/T1").catch((e) => e)) as ApiError;

    expect(err.message).toBe("Table not found");
  });

  it("does not mistake an unrelated `detail` string for validation issues", async () => {
    stubBackend(401, { detail: "Invalid platform token" });

    const err = (await request("/platform/restaurants").catch(
      (e) => e,
    )) as ApiError;

    expect(err.message).toBe("Invalid platform token");
  });
});

describe("client — a production build never falls back to the mock", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("throws instead of silently mocking when the base URL is missing", async () => {
    // Exactly the state the deployed customer app shipped in: PROD build,
    // no VITE_API_BASE_URL. It rendered a seeded menu and took orders that
    // reached nothing, with no error anywhere to reveal it.
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_MOCK_API", "");
    vi.stubEnv("PROD", true);

    const err = await request("/menu").catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("VITE_API_BASE_URL");
  });

  it("still honours an explicit opt-in, so E2E and demos keep working", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_MOCK_API", "true");
    vi.stubEnv("PROD", true);

    const items = await request<unknown[]>("/menu");
    expect(Array.isArray(items)).toBe(true);
  });

  it("keeps the convenience in a dev build with nothing configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_MOCK_API", "");
    vi.stubEnv("PROD", false);

    const items = await request<unknown[]>("/menu");
    expect(Array.isArray(items)).toBe(true);
  });
});
