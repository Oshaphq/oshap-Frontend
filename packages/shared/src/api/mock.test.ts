import { describe, it, expect } from "vitest";
import { mockRequest } from "./mock";

const HOME_RESTAURANT = "00000000-0000-0000-0000-000000000001";
const q = (s = "") => new URLSearchParams(s);

describe("mock API — customer", () => {
  it("GET /menu returns only available items", async () => {
    const res = await mockRequest("/menu", "GET", null, q(), false);
    expect(res.status).toBe(200);
    const items = res.body as Array<{ available: boolean }>;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.available)).toBe(true);
  });

  it("POST /order computes the total and creates a retrievable CREATED order", async () => {
    const body = {
      table: "T1",
      restaurant_id: HOME_RESTAURANT,
      items: [
        { name: "Test Item A", qty: 2, price: 1000 },
        { name: "Test Item B", qty: 1, price: 500 },
      ],
    };
    const res = await mockRequest("/orders", "POST", body, q(), false);
    expect(res.status).toBe(200);
    const created = res.body as { success: boolean; order_id: string; total: number };
    expect(created.success).toBe(true);
    expect(created.total).toBe(2500);
    expect(created.order_id).toBeTruthy();

    const detail = await mockRequest(`/orders/${created.order_id}`, "GET", null, q(), false);
    expect(detail.status).toBe(200);
    const order = detail.body as { id: string; total: number; status: string };
    expect(order.id).toBe(created.order_id);
    expect(order.total).toBe(2500);
    expect(order.status).toBe("CREATED");
  });

  it("POST /order with no items returns a 400 error envelope", async () => {
    const res = await mockRequest(
      "/orders",
      "POST",
      { table: "T1", restaurant_id: HOME_RESTAURANT, items: [] },
      q(),
      false,
    );
    expect(res.status).toBe(400);
    expect((res.body as { error: string }).error).toBeTruthy();
  });

  it("GET /table/:id for an unknown table returns 404", async () => {
    const res = await mockRequest("/table/ZZZ-NOPE", "GET", null, q(), false);
    expect(res.status).toBe(404);
    expect((res.body as { error: string }).error).toBeTruthy();
  });
});

describe("mock API — admin CRUD", () => {
  it("creates a menu item, then lists it back", async () => {
    const create = await mockRequest(
      "/admin/menu",
      "POST",
      { name: "Vitest Dish", price: 1234, category: "Test" },
      q(),
      true,
    );
    expect(create.status).toBe(201);
    expect((create.body as { name: string }).name).toBe("Vitest Dish");

    const list = await mockRequest("/admin/menu", "GET", null, q(), true);
    const names = (list.body as Array<{ name: string }>).map((i) => i.name);
    expect(names).toContain("Vitest Dish");
  });
});

describe("mock API — multi-branch scoping", () => {
  it("returns an empty table list for a non-home branch", async () => {
    const res = await mockRequest("/admin/tables", "GET", null, q("branch_id=rest-002"), true);
    expect(res.status).toBe(200);
    expect((res.body as { tables: unknown[] }).tables).toEqual([]);
  });

  it("returns tables for the home branch (no branch_id)", async () => {
    const res = await mockRequest("/admin/tables", "GET", null, q(), true);
    expect(res.status).toBe(200);
    expect((res.body as { tables: unknown[] }).tables.length).toBeGreaterThan(0);
  });
});

describe("mock API — bank accounts", () => {
  const BANK_URL = "/admin/settings/bank-accounts";

  it("exposes the active account on the public table payload", async () => {
    const res = await mockRequest("/table/T1", "GET", null, q(), false);
    const restaurant = (res.body as { restaurant: { bank_account: unknown } })
      .restaurant;
    expect(restaurant.bank_account).toMatchObject({
      account_number: expect.any(String),
      is_active: true,
    });
  });

  it("keeps exactly one account active when a new one is activated", async () => {
    const created = await mockRequest(
      BANK_URL,
      "POST",
      {
        bank_name: "Vitest Bank",
        account_number: "9999999999",
        account_name: "Vitest Ltd",
        is_active: true,
      },
      q(),
      true,
    );
    expect(created.status).toBe(200);
    const newId = (created.body as { id: string }).id;

    const list = await mockRequest(BANK_URL, "GET", null, q(), true);
    const accounts = list.body as Array<{ id: string; is_active: boolean }>;
    expect(accounts.filter((a) => a.is_active)).toHaveLength(1);
    expect(accounts.find((a) => a.is_active)?.id).toBe(newId);
  });

  it("re-denormalizes the newly active account onto the restaurant", async () => {
    const res = await mockRequest("/table/T1", "GET", null, q(), false);
    const restaurant = (res.body as {
      restaurant: { bank_account: { bank_name: string } | null };
    }).restaurant;
    expect(restaurant.bank_account?.bank_name).toBe("Vitest Bank");
  });

  it("promotes another account when the active one is removed", async () => {
    const before = await mockRequest(BANK_URL, "GET", null, q(), true);
    const active = (before.body as Array<{ id: string; is_active: boolean }>).find(
      (a) => a.is_active,
    )!;

    const del = await mockRequest(`${BANK_URL}/${active.id}`, "DELETE", null, q(), true);
    expect(del.status).toBe(200);

    const after = await mockRequest(BANK_URL, "GET", null, q(), true);
    const remaining = after.body as Array<{ is_active: boolean }>;
    expect(remaining.length).toBeGreaterThan(0);
    expect(remaining.filter((a) => a.is_active)).toHaveLength(1);
  });

  it("404s on an unknown account id", async () => {
    const res = await mockRequest(`${BANK_URL}/nope`, "PATCH", { bank_name: "x" }, q(), true);
    expect(res.status).toBe(404);
  });
});
