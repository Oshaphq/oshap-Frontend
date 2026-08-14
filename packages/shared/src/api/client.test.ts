import { describe, it, expect, afterEach, vi } from "vitest";
import { request, ApiError, setActiveBranchId, getActiveBranchId } from "./client";

// With neither VITE_API_BASE_URL nor VITE_MOCK_API set, the client runs against
// the in-memory mock — so these exercise the real request() path end to end.

describe("client request() — error envelope", () => {
  it("throws an ApiError carrying the status and server message on 4xx", async () => {
    const err = await request("/order", {
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
