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
      "/orders",
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

describe("mock API — bank accounts", () => {
  const URL = "/admin/settings/bank-accounts";

  it("serves ranked active accounts on the public table payload", async () => {
    const res = await mockRequest("/table/T1", "GET", null, q(), false);
    const accounts = (res.body as { bank_accounts: Array<{ is_default: boolean }> })
      .bank_accounts;

    expect(accounts.length).toBeGreaterThan(1);
    // Default first — the whole point of the ordering.
    expect(accounts[0]!.is_default).toBe(true);
  });

  it("keeps is_default exclusive", async () => {
    const before = await mockRequest(URL, "GET", null, q(), true);
    const target = (before.body as Array<{ id: string; is_default: boolean }>).find(
      (a) => !a.is_default,
    )!;

    await mockRequest(`${URL}/${target.id}`, "PATCH", { is_default: true }, q(), true);

    const after = await mockRequest(URL, "GET", null, q(), true);
    const defaults = (after.body as Array<{ id: string; is_default: boolean }>).filter(
      (a) => a.is_default,
    );
    expect(defaults).toHaveLength(1);
    expect(defaults[0]!.id).toBe(target.id);
  });

  it("hides inactive accounts from guests but keeps them in admin", async () => {
    const list = await mockRequest(URL, "GET", null, q(), true);
    const target = (list.body as Array<{ id: string; is_default: boolean }>).find(
      (a) => !a.is_default,
    )!;

    await mockRequest(`${URL}/${target.id}`, "PATCH", { is_active: false }, q(), true);

    const table = await mockRequest("/table/T1", "GET", null, q(), false);
    const guestIds = (table.body as { bank_accounts: Array<{ id: string }> }).bank_accounts.map(
      (a) => a.id,
    );
    expect(guestIds).not.toContain(target.id);

    const admin = await mockRequest(URL, "GET", null, q(), true);
    expect((admin.body as Array<{ id: string }>).map((a) => a.id)).toContain(target.id);

    await mockRequest(`${URL}/${target.id}`, "PATCH", { is_active: true }, q(), true);
  });

  it("404s on an unknown account", async () => {
    const res = await mockRequest(`${URL}/nope`, "PATCH", { bank_name: "x" }, q(), true);
    expect(res.status).toBe(404);
  });
});

describe("mock API — payment feedback loop", () => {
  // The ranking only improves if verify/reject actually move the counters, and
  // that only works if the claim recorded which account was used.
  async function claimAgainst(accountId: string) {
    const menu = await mockRequest("/menu", "GET", null, q(), false);
    const item = (menu.body as Array<{ name: string; price: number }>)[0]!;
    const order = await mockRequest(
      "/orders",
      "POST",
      {
        table: "T7",
        restaurant_id: HOME_RESTAURANT,
        items: [{ name: item.name, qty: 1, price: item.price }],
      },
      q(),
      false,
    );
    const orderId = (order.body as { order_id: string }).order_id;
    await mockRequest(
      "/payment/confirm",
      "POST",
      { order_id: orderId, bank_account_id: accountId },
      q(),
      false,
    );
  }

  async function accountById(id: string) {
    const res = await mockRequest("/admin/settings/bank-accounts", "GET", null, q(), true);
    return (res.body as Array<{ id: string; success_count?: number; failure_count?: number }>)
      .find((a) => a.id === id)!;
  }

  it("credits the account a verified payment went into", async () => {
    const before = await accountById("bank-002");
    await claimAgainst("bank-002");
    await mockRequest("/admin/verify", "POST", { table_id: "T7" }, q(), true);

    const after = await accountById("bank-002");
    expect(after.success_count).toBe((before.success_count ?? 0) + 1);
  });

  it("penalises the account when the payment is rejected, and unpays the order", async () => {
    const before = await accountById("bank-002");
    await claimAgainst("bank-002");

    const res = await mockRequest("/admin/reject", "POST", { table_id: "T7" }, q(), true);
    expect(res.status).toBe(200);
    expect((res.body as { rejected: number }).rejected).toBeGreaterThan(0);

    const after = await accountById("bank-002");
    expect(after.failure_count).toBe((before.failure_count ?? 0) + 1);

    // The food was served, so the order returns to unpaid rather than to the kitchen.
    const table = await mockRequest("/table/T7", "GET", null, q(), false);
    expect((table.body as { unpaid_order: unknown }).unpaid_order).toBeTruthy();
  });

  it("404s rejecting a table with nothing pending", async () => {
    const res = await mockRequest("/admin/reject", "POST", { table_id: "T9" }, q(), true);
    expect(res.status).toBe(404);
  });
});

describe("mock API — bulk menu import/export", () => {
  function csvFile(body: string): File {
    return new File([body], "menu.csv", { type: "text/csv" });
  }

  async function importCsv(body: string, dryRun: boolean) {
    const form = new FormData();
    form.append("file", csvFile(body));
    return mockRequest(
      "/admin/menu/import",
      "POST",
      form,
      q(dryRun ? "dry_run=true" : ""),
      true,
    );
  }

  it("exports a header plus one row per item, with external_id populated", async () => {
    const res = await mockRequest("/admin/menu/export", "GET", null, q(), true);
    const lines = (res.body as string).split("\n");

    expect(lines[0]).toContain("external_id");
    expect(lines.length).toBeGreaterThan(1);
    // Every row must carry an id, or re-importing duplicates instead of updating.
    expect(lines[1]!.split(",")[0]).toBeTruthy();
  });

  it("dry run reports what would happen without writing anything", async () => {
    const before = await mockRequest("/admin/menu", "GET", null, q(), true);
    const countBefore = (before.body as unknown[]).length;

    const res = await importCsv(
      "name,category,price\nDry Run Dish,Meals,250000",
      true,
    );

    expect((res.body as { created: number }).created).toBe(1);

    const after = await mockRequest("/admin/menu", "GET", null, q(), true);
    expect((after.body as unknown[]).length).toBe(countBefore);
  });

  it("creates rows without an external_id and updates rows with one", async () => {
    const created = await importCsv(
      "name,category,price\nImported Dish,Grills,300000",
      false,
    );
    expect((created.body as { created: number }).created).toBe(1);

    const list = await mockRequest("/admin/menu", "GET", null, q(), true);
    const item = (list.body as Array<{ id: string; name: string; price: number }>).find(
      (m) => m.name === "Imported Dish",
    )!;
    expect(item.price).toBe(300_000);

    const updated = await importCsv(
      `external_id,name,category,price\n${item.id},Imported Dish,Grills,350000`,
      false,
    );
    expect((updated.body as { updated: number }).updated).toBe(1);

    const after = await mockRequest("/admin/menu", "GET", null, q(), true);
    const changed = (after.body as Array<{ id: string; price: number }>).find(
      (m) => m.id === item.id,
    )!;
    expect(changed.price).toBe(350_000);
  });

  // Partial success is the point: one bad row must not reject the other 79.
  it("reports per-row errors while still importing the good rows", async () => {
    const res = await importCsv(
      [
        "name,category,price",
        "Good Dish,Sides,50000",
        "Bad Price Dish,Sides,not-a-number",
        ",Sides,50000",
      ].join("\n"),
      true,
    );

    const body = res.body as {
      created: number;
      errors: Array<{ row: number; field?: string; message: string }>;
    };

    expect(body.created).toBe(1);
    expect(body.errors).toHaveLength(2);
    // Row numbers count the header, so they match the spreadsheet.
    expect(body.errors[0]!.row).toBe(3);
    expect(body.errors[0]!.field).toBe("price");
    expect(body.errors[1]!.row).toBe(4);
  });

  it("rejects an external_id that matches nothing rather than silently creating", async () => {
    const res = await importCsv(
      "external_id,name,category,price\nnope-123,Ghost,Meals,10000",
      true,
    );
    const body = res.body as { created: number; errors: Array<{ field?: string }> };

    expect(body.created).toBe(0);
    expect(body.errors[0]!.field).toBe("external_id");
  });

  it("survives quoted fields containing commas", async () => {
    const res = await importCsv(
      'name,category,price,description\n"Rice, Chicken & Plantain",Meals,400000,"Served hot, with sauce"',
      true,
    );
    expect((res.body as { created: number; errors: unknown[] }).created).toBe(1);
    expect((res.body as { errors: unknown[] }).errors).toHaveLength(0);
  });
});

describe("mock API — cash payments", () => {
  async function unpaidOrderAt(tableId: string) {
    const menu = await mockRequest("/menu", "GET", null, q(), false);
    const item = (menu.body as Array<{ name: string; price: number }>)[0]!;
    const res = await mockRequest(
      "/orders",
      "POST",
      {
        table: tableId,
        restaurant_id: HOME_RESTAURANT,
        items: [{ name: item.name, qty: 2, price: item.price }],
      },
      q(),
      false,
    );
    return res.body as { order_id: string; total: number };
  }

  it("settles the bill outright — no claim left to verify", async () => {
    const order = await unpaidOrderAt("T11");

    const res = await mockRequest(
      "/admin/orders/cash",
      "POST",
      { order_ids: [order.order_id] },
      q(),
      true,
    );

    expect(res.status).toBe(200);
    expect((res.body as { confirmed: number }).confirmed).toBe(1);

    const detail = await mockRequest(
      `/orders/${order.order_id}`,
      "GET",
      null,
      q(),
      false,
    );
    const body = detail.body as {
      status: string;
      payment: { status: string; method: string } | null;
    };
    expect(body.status).toBe("CONFIRMED");
    // VERIFIED, not CLAIMED — a staff member was holding the money.
    expect(body.payment?.status).toBe("VERIFIED");
    expect(body.payment?.method).toBe("CASH");
  });

  it("clears the table's unpaid bill", async () => {
    const order = await unpaidOrderAt("T12");
    await mockRequest(
      "/admin/orders/cash",
      "POST",
      { order_ids: [order.order_id] },
      q(),
      true,
    );

    const table = await mockRequest("/table/T12", "GET", null, q(), false);
    expect((table.body as { unpaid_order: unknown }).unpaid_order).toBeNull();
  });

  it("is idempotent — recording twice does not double-confirm", async () => {
    const order = await unpaidOrderAt("T2");
    await mockRequest("/admin/orders/cash", "POST", { order_ids: [order.order_id] }, q(), true);

    const again = await mockRequest(
      "/admin/orders/cash",
      "POST",
      { order_ids: [order.order_id] },
      q(),
      true,
    );

    expect(again.status).toBe(404);
  });

  it("400s when no orders are given", async () => {
    const res = await mockRequest("/admin/orders/cash", "POST", { order_ids: [] }, q(), true);
    expect(res.status).toBe(400);
  });
});
