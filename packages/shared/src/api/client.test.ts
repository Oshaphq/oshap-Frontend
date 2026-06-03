import { describe, it, expect, afterEach } from "vitest";
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
