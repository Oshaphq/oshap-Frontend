import { describe, it, expect } from "vitest";
import { mockRequest } from "./mock";
import { formatCurrency } from "../utils/currency";

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

describe("mock API — restaurant seed resilience", () => {
  // Persisted mock state is written by whatever version of the seed was live at
  // the time. A wholesale restore permanently hides fields added later, because
  // JSON simply has no key for them — that shipped twice (logo_url, address)
  // before the merge went in.
  it("serves seed fields that predate the persisted state", async () => {
    const stale = {
      restaurant: {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Aji's Kitchen",
        // no address, no logo_url — as if written before those existed
      },
    };
    localStorage.setItem("oshap-mock-state", JSON.stringify(stale));

    const { syncFromStorage } = await import("./mock");
    syncFromStorage();

    const res = await mockRequest("/table/T1", "GET", null, q(), false);
    const restaurant = (res.body as {
      restaurant: { address?: string | null; logo_url?: string | null };
    }).restaurant;

    expect(restaurant.address).toBeTruthy();
    expect(restaurant.logo_url).toBeTruthy();

    localStorage.removeItem("oshap-mock-state");
  });
});

describe("mock API — money is kobo", () => {
  // The 100x bug is silent: kobo and naira are both plain numbers, and a menu
  // seeded in naira renders as a plausible-looking price. Asserting the raw
  // value AND the rendered string means reverting either half fails.
  it("serves menu prices in kobo, and they render as the intended naira", async () => {
    const res = await mockRequest("/menu", "GET", null, q(), false);
    const items = res.body as Array<{ name: string; price: number }>;
    const shawarma = items.find((i) => i.name === "Chicken Shawarma");

    expect(shawarma).toBeDefined();
    expect(shawarma!.price).toBe(250_000);
    expect(formatCurrency(shawarma!.price)).toMatch(/2,500/);
  });

  it("keeps order totals in kobo", async () => {
    const menu = await mockRequest("/menu", "GET", null, q(), false);
    const item = (menu.body as Array<{ name: string; price: number }>)[0]!;

    const res = await mockRequest(
      "/order",
      "POST",
      {
        table: "T1",
        restaurant_id: HOME_RESTAURANT,
        items: [{ name: item.name, qty: 2, price: item.price }],
      },
      q(),
      false,
    );

    expect((res.body as { total: number }).total).toBe(item.price * 2);
  });
});
