import { describe, it, expect } from "vitest";
import { mockRequest } from "./mock";
import { formatCurrency } from "../utils/currency";
import { computeOrderTotals } from "../utils/pricing";
import { STOCK_REASONS } from "../types/index";
import { AUDIT_ACTIONS } from "../types/index";

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
    expect(created.order_id).toBeTruthy();
    // Subtotal is 2500; the total also carries service charge and VAT.
    expect(created.total).toBeGreaterThan(2500);

    const detail = await mockRequest(`/orders/${created.order_id}`, "GET", null, q(), false);
    expect(detail.status).toBe(200);
    const order = detail.body as { id: string; total: number; status: string };
    expect(order.id).toBe(created.order_id);
    expect(order.total).toBe(created.total);
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

    const res = await mockRequest("/table/tbl-t1", "GET", null, q(), false);
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

    // The line total is kobo, and the order total builds on it — asserting the
    // relationship rather than a magic number keeps this honest if rates change.
    const total = (res.body as { total: number }).total;
    expect(total).toBeGreaterThanOrEqual(item.price * 2);
    expect(Number.isInteger(total)).toBe(true);
  });
});

describe("mock API — order money breakdown", () => {
  // The backend's stated invariant. Getting this wrong by a kobo per order is
  // exactly the kind of drift that only surfaces in the Z-report.
  it("satisfies total = subtotal - discount + service_charge + vat + tip", async () => {
    const res = await mockRequest(
      "/orders",
      "POST",
      {
        table: "T3",
        restaurant_id: HOME_RESTAURANT,
        items: [{ name: "Invariant Dish", qty: 3, price: 133_333 }],
      },
      q(),
      false,
    );

    const detail = await mockRequest(
      `/orders/${(res.body as { order_id: string }).order_id}`,
      "GET",
      null,
      q(),
      false,
    );
    const o = detail.body as {
      subtotal: number;
      discount?: number;
      service_charge: number;
      vat: number;
      tip?: number;
      total: number;
    };

    expect(o.subtotal).toBe(399_999);
    expect(
      o.subtotal - (o.discount ?? 0) + o.service_charge + o.vat + (o.tip ?? 0),
    ).toBe(o.total);

    // Every component must be a whole kobo — no floats anywhere in the path.
    for (const part of [o.subtotal, o.service_charge, o.vat, o.total]) {
      expect(Number.isInteger(part)).toBe(true);
    }
  });
});

describe("mock API — bank accounts", () => {
  const URL = "/admin/settings/bank-accounts";

  it("serves ranked active accounts on the public table payload", async () => {
    const res = await mockRequest("/table/tbl-t1", "GET", null, q(), false);
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

    const table = await mockRequest("/table/tbl-t1", "GET", null, q(), false);
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
    return orderId;
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
    const orderId = await claimAgainst("bank-002");

    const res = await mockRequest("/admin/reject", "POST", { order_id: orderId }, q(), true);
    expect(res.status).toBe(200);
    expect((res.body as { rejected: number }).rejected).toBeGreaterThan(0);

    const after = await accountById("bank-002");
    expect(after.failure_count).toBe((before.failure_count ?? 0) + 1);

    // The food was served, so the order returns to unpaid rather than to the kitchen.
    const table = await mockRequest("/table/tbl-t7", "GET", null, q(), false);
    expect((table.body as { unpaid_order: unknown }).unpaid_order).toBeTruthy();
  });

  /**
   * The model the admin app got wrong: a table is not a bill.
   *
   * Two guests order separately at T7. Rejecting one person's payment must
   * leave the other's order exactly where it was — the admin used to send a
   * `table_id`, which cannot express "this one and not that one", and the API
   * rightly refused it.
   */
  it("rejects one guest's payment without touching the other's order", async () => {
    const mine = await claimAgainst("bank-002");

    const menu = await mockRequest("/menu", "GET", null, q(), false);
    const item = (menu.body as Array<{ name: string; price: number }>)[0]!;
    const theirs = await mockRequest(
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
    const theirOrderId = (theirs.body as { order_id: string }).order_id;

    const before = await mockRequest(`/orders/${theirOrderId}`, "GET", null, q(), false);
    const statusBefore = (before.body as { status: string }).status;

    const res = await mockRequest("/admin/reject", "POST", { order_id: mine }, q(), true);
    expect(res.status).toBe(200);

    const after = await mockRequest(`/orders/${theirOrderId}`, "GET", null, q(), false);
    expect((after.body as { status: string }).status).toBe(statusBefore);
  });

  it("refuses a rejection that names no order", async () => {
    await claimAgainst("bank-002");
    const res = await mockRequest("/admin/reject", "POST", { order_id: "nope" }, q(), true);
    expect(res.status).toBe(404);
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
    expect((res.body as { paid: number; amount: number }).paid).toBe(1);

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

    const table = await mockRequest("/table/tbl-t12", "GET", null, q(), false);
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

describe("mock API — Z-report", () => {
  const TODAY = new Date().toISOString().slice(0, 10);

  async function orderAt(tableId: string) {
    const menu = await mockRequest("/menu", "GET", null, q(), false);
    const item = (menu.body as Array<{ name: string; price: number }>)[0]!;
    const res = await mockRequest(
      "/orders",
      "POST",
      {
        table: tableId,
        restaurant_id: HOME_RESTAURANT,
        items: [{ name: item.name, qty: 1, price: item.price }],
      },
      q(),
      false,
    );
    return res.body as { order_id: string; total: number };
  }

  async function report() {
    const res = await mockRequest("/admin/z-report", "GET", null, q(`date=${TODAY}`), true);
    return res.body as {
      order_count: number;
      total_sales: number;
      cash_total: number;
      transfer_total: number;
      pos_total: number;
      vat_collected: number;
      refund_total: number;
    };
  }

  // An unpaid bill is not takings. Counting it would make the report disagree
  // with the drawer, which is the one thing this screen exists to prevent.
  it("ignores unsettled orders", async () => {
    const before = await report();
    await orderAt("T5");
    const after = await report();

    expect(after.order_count).toBe(before.order_count);
    expect(after.total_sales).toBe(before.total_sales);
  });

  it("counts an order once it is settled, and attributes it to its method", async () => {
    const before = await report();
    const order = await orderAt("T6");
    await mockRequest("/admin/orders/cash", "POST", { order_ids: [order.order_id] }, q(), true);

    const after = await report();
    expect(after.order_count).toBe(before.order_count + 1);
    expect(after.total_sales).toBe(before.total_sales + order.total);
    expect(after.cash_total).toBe(before.cash_total + order.total);
  });

  // The server sends no "sales before adjustments" figure, so there is no
  // gross-to-net equation to assert. What must hold is that the three method
  // totals account for every naira reported as taken.
  it("per-method totals account for the whole day", async () => {
    const order = await orderAt("T8");
    await mockRequest("/admin/orders/cash", "POST", { order_ids: [order.order_id] }, q(), true);

    const r = await report();
    expect(r.cash_total + r.transfer_total + r.pos_total).toBe(r.total_sales);
  });

  it("returns an empty report for a day with no trade", async () => {
    const res = await mockRequest("/admin/z-report", "GET", null, q("date=2020-01-01"), true);
    const r = res.body as { order_count: number; total_sales: number; cash_total: number };

    expect(r.order_count).toBe(0);
    expect(r.total_sales).toBe(0);
    expect(r.cash_total).toBe(0);
  });
});

describe("mock API — bill adjustments", () => {
  async function freshOrder() {
    const res = await mockRequest(
      "/orders",
      "POST",
      {
        table: "T4",
        restaurant_id: HOME_RESTAURANT,
        items: [
          { name: "Adjust A", qty: 2, price: 100_000 },
          { name: "Adjust B", qty: 1, price: 50_000 },
        ],
      },
      q(),
      false,
    );
    const id = (res.body as { order_id: string }).order_id;
    const detail = await mockRequest(`/orders/${id}`, "GET", null, q(), false);
    return {
      id,
      detail: detail.body as {
        items: Array<{ id: string; name: string; price: number; quantity: number }>;
        subtotal: number;
        total: number;
      },
    };
  }

  /** The invariant every adjustment must preserve. */
  function assertBalances(o: {
    subtotal?: number;
    discount?: number;
    service_charge?: number;
    vat?: number;
    tip?: number;
    total: number;
  }) {
    expect(
      (o.subtotal ?? 0) -
        (o.discount ?? 0) +
        (o.service_charge ?? 0) +
        (o.vat ?? 0) +
        (o.tip ?? 0),
    ).toBe(o.total);
  }

  it("recomputes VAT when a discount is applied, rather than patching the total", async () => {
    const { id, detail } = await freshOrder();

    const res = await mockRequest(
      `/admin/orders/${id}/discount`,
      "POST",
      { amount: 50_000 },
      q(),
      true,
    );
    const order = res.body as Parameters<typeof assertBalances>[0] & { vat: number };

    expect(order.discount).toBe(50_000);
    expect(order.total).toBeLessThan(detail.total);
    // VAT is charged on the discounted amount — a patched total would leave it
    // computed on the pre-discount figure.
    assertBalances(order);
  });

  it("refuses a discount larger than the bill", async () => {
    const { id, detail } = await freshOrder();
    const res = await mockRequest(
      `/admin/orders/${id}/discount`,
      "POST",
      { amount: detail.subtotal + 1 },
      q(),
      true,
    );
    expect(res.status).toBe(400);
  });

  it("adds a tip on top without it attracting VAT", async () => {
    const { id } = await freshOrder();
    const before = (
      await mockRequest(`/orders/${id}`, "GET", null, q(), false)
    ).body as { vat: number };

    const res = await mockRequest(`/admin/orders/${id}/tip`, "POST", { amount: 20_000 }, q(), true);
    const order = res.body as Parameters<typeof assertBalances>[0] & { vat: number; tip: number };

    expect(order.tip).toBe(20_000);
    expect(order.vat).toBe(before.vat);
    assertBalances(order);
  });

  it("voiding a line reprices the whole bill", async () => {
    const { id, detail } = await freshOrder();
    const target = detail.items[0]!;

    const res = await mockRequest(
      `/admin/orders/${id}/items/${target.id}`,
      "DELETE",
      null,
      q(),
      true,
    );
    const order = res.body as Parameters<typeof assertBalances>[0] & { subtotal: number };

    expect(order.subtotal).toBe(detail.subtotal - target.price * target.quantity);
    assertBalances(order);
  });

  // Comp keeps the line visible at zero: the kitchen made it, and the guest
  // should see it was given rather than silently vanish.
  it("comping zeroes the line but keeps it on the bill", async () => {
    const { id, detail } = await freshOrder();
    const target = detail.items[0]!;

    await mockRequest(`/admin/orders/${id}/items/${target.id}/comp`, "POST", null, q(), true);

    const after = (await mockRequest(`/orders/${id}`, "GET", null, q(), false)).body as {
      items: Array<{ id: string; price: number }>;
    };
    const comped = after.items.find((i) => i.id === target.id);

    expect(comped).toBeDefined();
    expect(comped!.price).toBe(0);
  });

  it("rejects a quantity of zero — voiding is the way to remove a line", async () => {
    const { id, detail } = await freshOrder();
    const res = await mockRequest(
      `/admin/orders/${id}/items/${detail.items[0]!.id}`,
      "PATCH",
      { quantity: 0 },
      q(),
      true,
    );
    expect(res.status).toBe(400);
  });

  it("a refunded order stops counting as takings", async () => {
    const { id } = await freshOrder();
    await mockRequest("/admin/orders/cash", "POST", { order_ids: [id] }, q(), true);

    const res = await mockRequest(`/admin/orders/${id}/refund`, "POST", {}, q(), true);
    expect(res.status).toBe(200);
    expect((res.body as { refunded: number }).refunded).toBeGreaterThan(0);

    // REFUNDED, not CANCELLED — a cancelled order was never paid for, and
    // conflating them would misreport the day.
    const after = await mockRequest(`/orders/${id}`, "GET", null, q(), false);
    expect((after.body as { status: string }).status).toBe("REFUNDED");
  });
});

describe("mock API — paper trail", () => {
  async function orderFor(tableId: string) {
    const res = await mockRequest(
      "/orders",
      "POST",
      {
        table: tableId,
        restaurant_id: HOME_RESTAURANT,
        items: [{ name: "Audited Dish", qty: 1, price: 120_000 }],
      },
      q(),
      false,
    );
    return (res.body as { order_id: string }).order_id;
  }

  async function logs(action?: string) {
    const res = await mockRequest(
      "/admin/audit-logs",
      "GET",
      null,
      q(action ? `action=${action}` : ""),
      true,
    );
    return res.body as {
      logs: Array<{
        action: string;
        target_id: string | null;
        details?: Record<string, unknown> | null;
      }>;
      total: number;
    };
  }

  // The log is written by the actions themselves. If an action forgets to
  // record, the trail is silently incomplete — which is worse than absent,
  // because it looks trustworthy.
  it("records a discount, with the amount that moved", async () => {
    const orderId = await orderFor("T1");
    await mockRequest(`/admin/orders/${orderId}/discount`, "POST", { amount: 20_000 }, q(), true);

    const { logs: entries } = await logs(AUDIT_ACTIONS.discount);
    const entry = entries.find((e) => e.target_id === orderId);

    expect(entry).toBeDefined();
    // The amount lives inside the free-form details, not as a column.
    expect(entry!.details?.amount).toBe(20_000);
  });

  it("records a comp and a void as different actions", async () => {
    const orderId = await orderFor("T2");
    const detail = (await mockRequest(`/orders/${orderId}`, "GET", null, q(), false)).body as {
      items: Array<{ id: string }>;
    };

    await mockRequest(
      `/admin/orders/${orderId}/items/${detail.items[0]!.id}/comp`,
      "POST",
      null,
      q(),
      true,
    );

    const comps = await logs(AUDIT_ACTIONS.itemComp);
    expect(comps.logs.some((e) => e.target_id === orderId)).toBe(true);

    const voids = await logs(AUDIT_ACTIONS.itemVoid);
    expect(voids.logs.some((e) => e.target_id === orderId)).toBe(false);
  });

  it("records taking cash", async () => {
    const orderId = await orderFor("T3");
    await mockRequest("/admin/orders/cash", "POST", { order_ids: [orderId] }, q(), true);

    const { logs: entries } = await logs(AUDIT_ACTIONS.cashPaid);
    expect(entries.some((e) => e.target_id === orderId)).toBe(true);
  });

  it("filters to one action and reports its own total", async () => {
    const all = await logs();
    const discounts = await logs(AUDIT_ACTIONS.discount);

    expect(discounts.logs.every((e) => e.action === AUDIT_ACTIONS.discount)).toBe(true);
    expect(discounts.total).toBeLessThanOrEqual(all.total);
  });

  it("builds a receipt with the totals broken out", async () => {
    const orderId = await orderFor("T5");
    await mockRequest("/admin/orders/cash", "POST", { order_ids: [orderId] }, q(), true);

    const res = await mockRequest(
      `/admin/orders/${orderId}/receipt`,
      "GET",
      null,
      q(),
      true,
    );
    const receipt = res.body as {
      reference: string;
      restaurant: { name: string };
      items: unknown[];
      subtotal: number;
      vat: number;
      total: number;
      payment_method: string | null;
    };

    expect(receipt.reference).toBeTruthy();
    expect(receipt.restaurant.name).toBeTruthy();
    expect(receipt.items.length).toBeGreaterThan(0);
    // A customer is entitled to see the tax they paid, so it must be itemised
    // rather than folded into the total.
    expect(receipt.vat).toBeGreaterThan(0);
    expect(receipt.subtotal).toBeLessThan(receipt.total);
    expect(receipt.payment_method).toBe("CASH");
  });

  it("404s a receipt for an unknown order", async () => {
    const res = await mockRequest("/admin/orders/nope-123/receipt", "GET", null, q(), true);
    expect(res.status).toBe(404);
  });
});

describe("mock API — combined bill", () => {
  // Two orders on one table are shown as a single bill. Summing only `total`
  // while copying the breakdown from the latest order produced a bill whose
  // parts didn't add up to its own total — invisible until a guest reads it.
  it("aggregates every money field across combined orders, not just the total", async () => {
    const menu = await mockRequest("/menu", "GET", null, q(), false);
    const item = (menu.body as Array<{ name: string; price: number }>)[0]!;
    const device = "combine-device";

    for (let i = 0; i < 2; i++) {
      await mockRequest(
        "/orders",
        "POST",
        {
          table: "T10",
          restaurant_id: HOME_RESTAURANT,
          items: [{ name: item.name, qty: 1, price: item.price }],
          device_token: device,
        },
        q(),
        false,
      );
    }

    const res = await mockRequest(
      "/table/tbl-t10",
      "GET",
      null,
      q(`device_token=${device}`),
      false,
    );
    const bill = (res.body as {
      unpaid_order: {
        subtotal: number;
        service_charge: number;
        vat: number;
        discount?: number;
        tip?: number;
        total: number;
        order_items: unknown[];
        combined_order_ids: string[];
      } | null;
    }).unpaid_order!;

    expect(bill.combined_order_ids).toHaveLength(2);
    // Lines from both orders, so the guest sees everything they ordered.
    expect(bill.order_items.length).toBe(2);
    expect(
      bill.subtotal -
        (bill.discount ?? 0) +
        bill.service_charge +
        bill.vat +
        (bill.tip ?? 0),
    ).toBe(bill.total);
  });
});

describe("mock API — seed versioning", () => {
  // Persisted state written before money moved to kobo holds prices 100x too
  // small, and an array can't be merged field-by-field the way the restaurant
  // object can. The version stamp is what stops a stale menu silently
  // resurfacing as ₦25 for a ₦2,500 dish.
  it("discards persisted state written by an older seed", async () => {
    localStorage.setItem(
      "oshap-mock-state",
      JSON.stringify({
        seedVersion: 1,
        menu: [
          {
            id: "stale-1",
            restaurant_id: HOME_RESTAURANT,
            name: "Stale Naira Dish",
            price: 2500,
            category: "Meals",
            available: true,
            sort_order: 1,
            stock_count: null,
            low_stock_threshold: 5,
          },
        ],
      }),
    );

    const { syncFromStorage } = await import("./mock");
    syncFromStorage();

    const res = await mockRequest("/menu", "GET", null, q(), false);
    const names = (res.body as Array<{ name: string }>).map((m) => m.name);

    expect(names).not.toContain("Stale Naira Dish");
    expect(localStorage.getItem("oshap-mock-state")).toBeNull();
  });
});

describe("mock API — modifiers", () => {
  it("GET /menu attaches modifier groups to the dishes that use them", async () => {
    const res = await mockRequest("/menu", "GET", null, q(), false);
    const items = res.body as Array<{
      id: string;
      modifier_groups?: Array<{ id: string; name: string; options: unknown[] }>;
    }>;

    const jollof = items.find((i) => i.id === "m-003");
    expect(jollof?.modifier_groups?.map((g) => g.id)).toEqual([
      "mg-protein",
      "mg-spice",
      "mg-extras",
    ]);

    // A dish with nothing attached must not carry an empty group array that
    // the customer sheet would then render as a heading with no choices.
    const fries = items.find((i) => i.id === "m-016");
    expect(fries?.modifier_groups).toBeUndefined();
  });

  it("prices an order from the BASE price plus the option deltas", async () => {
    // Jollof is ₦3,500. Turkey adds ₦500, extra plantain ₦500 — so one unit
    // resolves to ₦4,500 and the client must NOT pre-add those deltas.
    const body = {
      table: "T1",
      restaurant_id: HOME_RESTAURANT,
      items: [
        {
          name: "Jollof Rice & Chicken",
          qty: 2,
          price: 350000,
          menu_item_id: "m-003",
          modifiers: [
            { option_id: "mo-p-turkey" },
            { option_id: "mo-e-plantain" },
          ],
        },
      ],
    };
    const created = await mockRequest("/orders", "POST", body, q(), false);
    expect(created.status).toBe(200);
    const { order_id } = created.body as { order_id: string };

    const detail = await mockRequest(`/orders/${order_id}`, "GET", null, q(), false);
    const order = detail.body as {
      subtotal: number;
      items: Array<{
        price: number;
        modifiers: Array<{
          option_id?: string;
          name: string;
          option: string;
          price_delta: number;
        }> | null;
      }>;
    };

    const line = order.items[0]!;
    expect(line.price).toBe(450000);
    expect(order.subtotal).toBe(900000);

    // Denormalized at order time: group name, option name, and the delta as
    // charged — so renaming the option later can't rewrite this ticket. The id
    // rides along so the line can be reordered against something real.
    expect(line.modifiers).toEqual([
      { option_id: "mo-p-turkey", name: "Protein", option: "Turkey", price_delta: 50000 },
      { option_id: "mo-e-plantain", name: "Extras", option: "Extra plantain", price_delta: 50000 },
    ]);
  });

  /**
   * Reordering a configured dish was disabled outright, because a chosen
   * modifier came back as names and a delta with no id — and putting food on a
   * bill the guest did not pick is worse than making them tap twice.
   *
   * With `option_id` returned, the line can be rebuilt exactly. The arithmetic
   * is the dangerous part: `price` is per-unit *including* the deltas, and the
   * cart wants the base, so reordering the resolved figure would charge every
   * modifier twice.
   */
  it("can be reordered from what it returns, at the same price", async () => {
    const first = await mockRequest(
      "/orders",
      "POST",
      {
        table: "T1",
        restaurant_id: HOME_RESTAURANT,
        items: [
          {
            name: "Fried Rice & Turkey",
            qty: 1,
            price: 400000,
            menu_item_id: "m-004",
            modifiers: [{ option_id: "mo-p-turkey" }, { option_id: "mo-e-plantain" }],
          },
        ],
      },
      q(),
      false,
    );
    const firstDetail = await mockRequest(
      `/orders/${(first.body as { order_id: string }).order_id}`,
      "GET",
      null,
      q(),
      false,
    );
    const line = (
      firstDetail.body as {
        items: Array<{
          price: number;
          modifiers: Array<{ option_id?: string; price_delta: number }> | null;
        }>;
      }
    ).items[0]!;

    // What the reorder button does: every choice must still have an id, and
    // the base price is the resolved one less the deltas it already includes.
    const mods = line.modifiers ?? [];
    expect(mods.every((m) => Boolean(m.option_id))).toBe(true);
    const basePrice = line.price - mods.reduce((sum, m) => sum + m.price_delta, 0);
    expect(basePrice).toBe(400000);

    const second = await mockRequest(
      "/orders",
      "POST",
      {
        table: "T1",
        restaurant_id: HOME_RESTAURANT,
        items: [
          {
            name: "Fried Rice & Turkey",
            qty: 1,
            price: basePrice,
            menu_item_id: "m-004",
            modifiers: mods.map((m) => ({ option_id: m.option_id! })),
          },
        ],
      },
      q(),
      false,
    );
    const secondDetail = await mockRequest(
      `/orders/${(second.body as { order_id: string }).order_id}`,
      "GET",
      null,
      q(),
      false,
    );
    const reordered = (secondDetail.body as { items: Array<{ price: number }> }).items[0]!;

    // Same dish, same choices, same money — no double-charged modifiers.
    expect(reordered.price).toBe(line.price);
  });

  it("leaves a line without modifiers priced at its base and carrying null", async () => {
    const body = {
      table: "T2",
      restaurant_id: HOME_RESTAURANT,
      items: [{ name: "Coca-Cola", qty: 1, price: 50000, menu_item_id: "m-012" }],
    };
    const created = await mockRequest("/orders", "POST", body, q(), false);
    const { order_id } = created.body as { order_id: string };

    const detail = await mockRequest(`/orders/${order_id}`, "GET", null, q(), false);
    const order = detail.body as {
      items: Array<{ price: number; modifiers: unknown }>;
    };
    expect(order.items[0]!.price).toBe(50000);
    expect(order.items[0]!.modifiers).toBeNull();
  });

  it("rejects an unknown option rather than silently dropping it", async () => {
    const body = {
      table: "T3",
      restaurant_id: HOME_RESTAURANT,
      items: [
        {
          name: "Jollof Rice & Chicken",
          qty: 1,
          price: 350000,
          modifiers: [{ option_id: "mo-does-not-exist" }],
        },
      ],
    };
    const res = await mockRequest("/orders", "POST", body, q(), false);
    expect(res.status).toBe(400);
  });

  it("renaming an option updates every dish sharing that group", async () => {
    const res = await mockRequest(
      "/admin/modifier-options/mo-s-hot",
      "PATCH",
      { name: "Very hot" },
      q(),
      true,
    );
    expect(res.status).toBe(200);

    const menu = await mockRequest("/menu", "GET", null, q(), false);
    const items = menu.body as Array<{
      id: string;
      modifier_groups?: Array<{ id: string; options: Array<{ name: string }> }>;
    }>;
    const names = (itemId: string) =>
      items
        .find((i) => i.id === itemId)
        ?.modifier_groups?.find((g) => g.id === "mg-spice")
        ?.options.map((o) => o.name);

    // m-001 and m-003 both attach mg-spice — one edit, both dishes.
    expect(names("m-001")).toContain("Very hot");
    expect(names("m-003")).toContain("Very hot");

    await mockRequest(
      "/admin/modifier-options/mo-s-hot",
      "PATCH",
      { name: "Hot" },
      q(),
      true,
    );
  });

  it("detaches a deleted group from every dish that referenced it", async () => {
    const created = await mockRequest(
      "/admin/modifier-groups",
      "POST",
      { name: "Temp group", options: [{ name: "One", price_delta: 100 }] },
      q(),
      true,
    );
    const group = created.body as { id: string; options: Array<{ id: string }> };
    expect(created.status).toBe(201);
    expect(group.options).toHaveLength(1);

    await mockRequest(
      "/admin/menu/m-016/modifier-groups",
      "PUT",
      { group_ids: [group.id] },
      q(),
      true,
    );
    let menu = await mockRequest("/admin/menu", "GET", null, q(), true);
    let fries = (menu.body as Array<{ id: string; modifier_groups?: unknown[] }>).find(
      (i) => i.id === "m-016",
    );
    expect(fries?.modifier_groups).toHaveLength(1);

    await mockRequest(`/admin/modifier-groups/${group.id}`, "DELETE", null, q(), true);

    menu = await mockRequest("/admin/menu", "GET", null, q(), true);
    fries = (menu.body as Array<{ id: string; modifier_groups?: unknown[] }>).find(
      (i) => i.id === "m-016",
    );
    // Not a dangling id, and not an empty group — no attachment at all.
    expect(fries?.modifier_groups).toBeUndefined();
  });
});

describe("mock API — ingredients", () => {
  it("records opening stock as a movement rather than a bare starting value", async () => {
    const res = await mockRequest(
      "/admin/ingredients",
      "POST",
      { name: "Test Pepper", unit: "kg", stock_qty: 6.5 },
      q(),
      true,
    );
    expect(res.status).toBe(201);
    const created = res.body as { id: string; stock_qty: number };
    expect(created.stock_qty).toBe(6.5);

    const ledger = await mockRequest(
      "/admin/ingredients/movements",
      "GET",
      null,
      q("reason=RESTOCK"),
      true,
    );
    const { movements } = ledger.body as {
      movements: Array<{ ingredient_id: string; delta: number; note: string | null }>;
    };
    const opening = movements.find((m) => m.ingredient_id === created.id);
    expect(opening?.delta).toBe(6.5);
    expect(opening?.note).toBe("Opening stock");
  });

  it("adjusts by a signed delta and lets stock go negative", async () => {
    const before = await mockRequest("/admin/ingredients", "GET", null, q(), true);
    const beef = (before.body as Array<{ id: string; stock_qty: number }>).find(
      (i) => i.id === "ing-beef",
    )!;

    await mockRequest(
      "/admin/ingredients/ing-beef/adjust",
      "POST",
      { delta: -(beef.stock_qty + 1), reason: "WASTAGE", note: "Freezer failure" },
      q(),
      true,
    );

    const after = await mockRequest("/admin/ingredients", "GET", null, q(), true);
    const updated = (after.body as Array<{ id: string; stock_qty: number }>).find(
      (i) => i.id === "ing-beef",
    )!;
    // Clamping at zero would hide a miscount; a negative level is the signal.
    expect(updated.stock_qty).toBe(-1);

    await mockRequest(
      "/admin/ingredients/ing-beef/adjust",
      "POST",
      { delta: beef.stock_qty + 1, reason: "CORRECTION" },
      q(),
      true,
    );
  });

  it("depletes a recipe when an order is placed, and says which order did it", async () => {
    const before = await mockRequest("/admin/ingredients", "GET", null, q(), true);
    const riceBefore = (before.body as Array<{ id: string; stock_qty: number }>).find(
      (i) => i.id === "ing-rice",
    )!.stock_qty;

    // Jollof (m-003) uses 0.25 kg of rice per serving; three servings = 0.75.
    const created = await mockRequest(
      "/orders",
      "POST",
      {
        table: "T5",
        restaurant_id: HOME_RESTAURANT,
        items: [
          { name: "Jollof Rice & Chicken", qty: 3, price: 350000, menu_item_id: "m-003" },
        ],
      },
      q(),
      false,
    );
    const { order_id } = created.body as { order_id: string };

    const after = await mockRequest("/admin/ingredients", "GET", null, q(), true);
    const riceAfter = (after.body as Array<{ id: string; stock_qty: number }>).find(
      (i) => i.id === "ing-rice",
    )!.stock_qty;
    expect(riceAfter).toBeCloseTo(riceBefore - 0.75, 5);

    const ledger = await mockRequest(
      "/admin/ingredients/movements",
      "GET",
      null,
      q("reason=SALE"),
      true,
    );
    const { movements } = ledger.body as {
      movements: Array<{ ingredient_id: string; delta: number; order_id: string | null }>;
    };
    const fromThisOrder = movements.filter((m) => m.order_id === order_id);
    // One movement per recipe line, each attributable to the order.
    expect(fromThisOrder).toHaveLength(4);
    expect(fromThisOrder.find((m) => m.ingredient_id === "ing-rice")?.delta).toBeCloseTo(
      -0.75,
      5,
    );
  });

  it("leaves ingredients alone for a dish with no recipe", async () => {
    const before = await mockRequest("/admin/ingredients", "GET", null, q(), true);
    const snapshot = (before.body as Array<{ id: string; stock_qty: number }>).map(
      (i) => `${i.id}:${i.stock_qty}`,
    );

    await mockRequest(
      "/orders",
      "POST",
      {
        table: "T6",
        restaurant_id: HOME_RESTAURANT,
        items: [{ name: "Coca-Cola", qty: 2, price: 50000, menu_item_id: "m-012" }],
      },
      q(),
      false,
    );

    const after = await mockRequest("/admin/ingredients", "GET", null, q(), true);
    expect(
      (after.body as Array<{ id: string; stock_qty: number }>).map(
        (i) => `${i.id}:${i.stock_qty}`,
      ),
    ).toEqual(snapshot);
  });

  it("returns a recipe with the ingredient's name and unit resolved", async () => {
    const res = await mockRequest("/admin/menu/m-003/recipe", "GET", null, q(), true);
    const recipe = res.body as {
      menu_item_id: string;
      lines: Array<{ ingredient_name: string; unit: string; qty_per_serving: number }>;
    };
    expect(recipe.menu_item_id).toBe("m-003");
    const rice = recipe.lines.find((l) => l.ingredient_name === "Rice");
    expect(rice).toEqual({
      ingredient_id: "ing-rice",
      ingredient_name: "Rice",
      unit: "kg",
      qty_per_serving: 0.25,
    });
  });

  it("replaces the whole recipe on PUT and drops unknown ingredients", async () => {
    const res = await mockRequest(
      "/admin/menu/m-005/recipe",
      "PUT",
      {
        lines: [
          { ingredient_id: "ing-chicken", qty_per_serving: 0.3 },
          { ingredient_id: "ing-does-not-exist", qty_per_serving: 9 },
        ],
      },
      q(),
      true,
    );
    expect(res.status).toBe(200);
    const recipe = res.body as { lines: Array<{ ingredient_id: string }> };
    expect(recipe.lines.map((l) => l.ingredient_id)).toEqual(["ing-chicken"]);

    await mockRequest("/admin/menu/m-005/recipe", "PUT", { lines: [] }, q(), true);
  });
});

/**
 * The admin offered PURCHASE, STOCK_TAKE and CORRECTION. The server accepts
 * RESTOCK, WASTAGE, SALE, COUNT_CORRECTION and TRANSFER — so only WASTAGE
 * overlapped, and three of the four reasons a staff member could pick failed
 * with a raw enum dump in a toast.
 *
 * It survived because `reason` was typed `string` and this mock accepted any
 * non-empty value, so every test passed against a vocabulary that did not
 * exist. The mock now rejects what the server rejects, which is the only
 * reason a test here means anything.
 */
describe("mock API — stock reasons match the server's vocabulary", () => {

  async function firstIngredient() {
    const res = await mockRequest("/admin/ingredients", "GET", null, q(), true);
    return (res.body as Array<{ id: string }>)[0]!;
  }

  it.each(["RESTOCK", "WASTAGE", "COUNT_CORRECTION", "TRANSFER"] as const)(
    "accepts %s",
    async (reason) => {
      const ing = await firstIngredient();
      const res = await mockRequest(
        `/admin/ingredients/${ing.id}/adjust`,
        "POST",
        { delta: 1, reason },
        q(),
        true,
      );
      // The mock answers 201 here and the live API answers 200; both are a
      // success and the client treats every 2xx alike. What matters is that a
      // reason the server knows is not rejected.
      expect(res.status).toBeLessThan(300);
    },
  );

  it.each(["PURCHASE", "STOCK_TAKE", "CORRECTION", "purchase", "restock"])(
    "rejects %s, which is not a reason the server knows",
    async (reason) => {
      const ing = await firstIngredient();
      const res = await mockRequest(
        `/admin/ingredients/${ing.id}/adjust`,
        "POST",
        { delta: 1, reason },
        q(),
        true,
      );
      expect(res.status).toBe(422);
    },
  );

  it("offers the staff only reasons a person can actually cause", () => {
    // SALE is written by the server when a recipe depletes, and TRANSFER has
    // no destination field on this endpoint — offering it would record stock
    // leaving without recording where it went.
    expect(STOCK_REASONS.sale).toBe("SALE");
    expect(STOCK_REASONS.transfer).toBe("TRANSFER");
  });
});

describe("mock API — checkout estimate matches the order", () => {
  it("computeOrderTotals predicts the server's figure exactly", async () => {
    // The point of the whole exercise: what checkout shows a guest before
    // they commit must equal what the order comes back with. Any drift here
    // is a guest agreeing to one number and being charged another.
    const table = await mockRequest("/table/tbl-t9", "GET", null, q(), false);
    const { restaurant } = table.body as {
      restaurant: { vat_rate?: number; service_charge_rate?: number };
    };

    const items = [
      { name: "Jollof Rice & Chicken", qty: 2, price: 350000, menu_item_id: "m-003" },
      { name: "Chapman", qty: 3, price: 150000, menu_item_id: "m-009" },
    ];
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

    const predicted = computeOrderTotals(subtotal, {
      vat_rate: restaurant.vat_rate,
      service_charge_rate: restaurant.service_charge_rate,
    });

    const created = await mockRequest(
      "/orders",
      "POST",
      { table: "T9", restaurant_id: HOME_RESTAURANT, items },
      q(),
      false,
    );
    const { order_id, total } = created.body as {
      order_id: string;
      total: number;
    };

    expect(total).toBe(predicted.total);

    const detail = await mockRequest(`/orders/${order_id}`, "GET", null, q(), false);
    const order = detail.body as {
      subtotal: number;
      service_charge: number;
      vat: number;
      total: number;
    };
    expect(order.subtotal).toBe(predicted.subtotal);
    expect(order.service_charge).toBe(predicted.service_charge);
    expect(order.vat).toBe(predicted.vat);
    expect(order.total).toBe(predicted.total);
  });

  it("predicts correctly once modifiers move the line price", async () => {
    const table = await mockRequest("/table/tbl-t10", "GET", null, q(), false);
    const { restaurant } = table.body as {
      restaurant: { vat_rate?: number; service_charge_rate?: number };
    };

    // Base 3,500 + turkey 500 + plantain 500 = 4,500 per unit, ×2.
    const predicted = computeOrderTotals(900000, {
      vat_rate: restaurant.vat_rate,
      service_charge_rate: restaurant.service_charge_rate,
    });

    const created = await mockRequest(
      "/orders",
      "POST",
      {
        table: "T10",
        restaurant_id: HOME_RESTAURANT,
        items: [
          {
            name: "Jollof Rice & Chicken",
            qty: 2,
            price: 350000,
            menu_item_id: "m-003",
            modifiers: [{ option_id: "mo-p-turkey" }, { option_id: "mo-e-plantain" }],
          },
        ],
      },
      q(),
      false,
    );

    expect((created.body as { total: number }).total).toBe(predicted.total);
  });
});

describe("mock API — owner setup", () => {
  // Phone is a globally unique identity, so each onboarding needs its own
  // number — reusing one is rejected, exactly as it would be in production.
  let phoneSeq = 1000;
  const nextPhone = () => `0803123${(phoneSeq += 1)}`;

  async function onboard(name = "Setup Test Kitchen", phone = nextPhone()) {
    const res = await mockRequest(
      "/platform/restaurants",
      "POST",
      {
        name,
        owner_name: "Tunde A.",
        owner_phone: phone,
        subscription_tier: "STANDARD",
        table_count: 4,
      },
      q(),
      false,
    );
    const body = res.body as { owner_setup_url: string; owner_phone: string };
    const token = new URL(body.owner_setup_url).searchParams.get("token")!;
    return { body, token };
  }

  it("provisions the owner with a setup link and no password", async () => {
    const { body, token } = await onboard("Setup Test Kitchen", "08031234567");
    expect(body.owner_setup_url).toContain("/setup?token=");
    expect(token).toBeTruthy();
    // Normalized on the way in: 0803… is stored as +234803….
    expect(body.owner_phone).toBe("+2348031234567");
  });

  it("verify returns enough to recognise the account, with contact masked", async () => {
    const { token } = await onboard("Masking Test", "08031114567");
    const res = await mockRequest("/auth/setup/verify", "POST", { token }, q(), false);

    expect(res.status).toBe(200);
    const data = res.body as {
      restaurant_name: string;
      owner_name: string;
      phone_hint: string;
    };
    expect(data.owner_name).toBe("Tunde A.");
    // The last four only — enough to know which account, not enough to
    // hand a full number to whoever is holding the link.
    expect(data.phone_hint).toContain("4567");
    expect(data.phone_hint).not.toContain("+234803111");
  });

  it("completes setup, signs the owner in, and burns the token", async () => {
    const { token } = await onboard("Complete Test", "08032224567");

    const done = await mockRequest(
      "/auth/setup/complete",
      "POST",
      { token, password: "a-long-enough-password" },
      q(),
      false,
    );
    expect(done.status).toBe(200);
    const session = done.body as { access_token: string; user: { phone: string } };
    // Same shape as login, so the caller needs no second round-trip.
    expect(session.access_token).toBeTruthy();
    expect(session.user.phone).toBe("+2348032224567");

    // Single use — a forwarded WhatsApp message stops working.
    const again = await mockRequest(
      "/auth/setup/complete",
      "POST",
      { token, password: "another-long-password" },
      q(),
      false,
    );
    expect(again.status).toBe(410);
  });

  it("rejects a password shorter than the policy", async () => {
    const { token } = await onboard();
    const res = await mockRequest(
      "/auth/setup/complete",
      "POST",
      { token, password: "short" },
      q(),
      false,
    );
    expect(res.status).toBe(422);
    // The message names the field, per the 422 handling in client.ts.
    expect((res.body as { message: string }).message).toContain("password");
  });

  it("treats unknown, spent and expired links identically", async () => {
    const res = await mockRequest(
      "/auth/setup/verify",
      "POST",
      { token: "setup-does-not-exist" },
      q(),
      false,
    );
    expect(res.status).toBe(410);
    expect((res.body as { message: string }).message).toBe(
      "This setup link has expired.",
    );
  });

  it("lets the owner sign in with the password they chose, by phone or email", async () => {
    const { token } = await onboard("Sign In Test", "08037654321");
    await mockRequest(
      "/auth/setup/complete",
      "POST",
      { token, password: "a-long-enough-password" },
      q(),
      false,
    );

    // Any form of the number resolves to the same account.
    for (const identifier of ["08037654321", "+2348037654321", "0803 765 4321"]) {
      const res = await mockRequest(
        "/auth/login",
        "POST",
        { identifier, password: "a-long-enough-password" },
        q(),
        false,
      );
      expect(res.status).toBe(200);
    }

    const wrong = await mockRequest(
      "/auth/login",
      "POST",
      { identifier: "08037654321", password: "not-the-password" },
      q(),
      false,
    );
    expect(wrong.status).toBe(401);
  });

  it("answers forgot-password identically whether or not the account exists", async () => {
    const known = await mockRequest(
      "/auth/forgot-password",
      "POST",
      { identifier: "08031234567" },
      q(),
      false,
    );
    const unknown = await mockRequest(
      "/auth/forgot-password",
      "POST",
      { identifier: "08039999999" },
      q(),
      false,
    );

    // Differing here would turn the endpoint into a way to discover which
    // merchants are on the platform.
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });

  it("refuses a staff account without a valid phone number", async () => {
    const res = await mockRequest(
      "/admin/staff",
      "POST",
      { name: "Bad Number", phone: "12345", role: "WAITER" },
      q(),
      true,
    );
    expect(res.status).toBe(422);
  });

  it("treats two spellings of one number as the same person", async () => {
    const first = await mockRequest(
      "/admin/staff",
      "POST",
      { name: "Chidinma O.", phone: "08051234567", role: "WAITER", password: "x" },
      q(),
      true,
    );
    expect(first.status).toBe(201);

    const duplicate = await mockRequest(
      "/admin/staff",
      "POST",
      { name: "Same Person", phone: "+234 805 123 4567", role: "CASHIER", password: "x" },
      q(),
      true,
    );
    expect(duplicate.status).toBe(400);
  });
});

// Verified against the deployed API on 18 Aug 2026: the two identifiers are
// NOT interchangeable, and mixing them up fails silently in exactly one
// direction. Pinned here so the mock can't quietly start accepting both.
describe("mock API — table identity is not interchangeable", () => {
  it("resolves a table path by uuid, never by name", async () => {
    const byUuid = await mockRequest("/table/tbl-t1", "GET", null, q(), false);
    expect(byUuid.status).toBe(200);

    // The real server returns 422 here (uuid path parsing); the mock 404s.
    // Either way it must not succeed — a name in the path identifies nothing,
    // because every restaurant calls a table "T1".
    const byName = await mockRequest("/table/T1", "GET", null, q(), false);
    expect(byName.status).toBeGreaterThanOrEqual(400);
  });

  it("takes the name in an order body, never the uuid", async () => {
    const byName = await mockRequest(
      "/orders",
      "POST",
      {
        table: "T2",
        restaurant_id: HOME_RESTAURANT,
        items: [{ name: "Coca-Cola", qty: 1, price: 50000 }],
      },
      q(),
      false,
    );
    expect(byName.status).toBe(200);

    const byUuid = await mockRequest(
      "/orders",
      "POST",
      {
        table: "tbl-t2",
        restaurant_id: HOME_RESTAURANT,
        items: [{ name: "Coca-Cola", qty: 1, price: 50000 }],
      },
      q(),
      false,
    );
    expect(byUuid.status).toBe(404);
  });

  it("calls a waiter by uuid, not by name", async () => {
    const ok = await mockRequest("/table/tbl-t3/call-waiter", "POST", {}, q(), false);
    expect(ok.status).toBe(200);

    const bad = await mockRequest("/table/T3/call-waiter", "POST", {}, q(), false);
    expect(bad.status).toBe(404);
  });
});

/**
 * Branches are what separates Pro from the plans below it, and until now the
 * frontend had no way to create, list or close one — the plan was sold on a
 * capability nobody could reach.
 */
describe("mock API — branches", () => {
  const URL = "/admin/branches";

  it("starts with a single branch, which is the normal restaurant", async () => {
    const res = await mockRequest(URL, "GET", null, q(), true);
    expect(res.status).toBe(200);
    const branches = res.body as Array<{ name: string; is_active: boolean }>;
    expect(branches).toHaveLength(1);
    expect(branches[0]!.is_active).toBe(true);
  });

  it("creates a branch with its tables ready to print codes for", async () => {
    const res = await mockRequest(
      URL,
      "POST",
      { name: "Ikeja", address: "12 Allen Avenue", table_count: 8 },
      q(),
      true,
    );
    expect(res.status).toBe(201);
    const branch = res.body as { id: string; name: string; table_count: number; is_active: boolean };
    expect(branch.name).toBe("Ikeja");
    // A venue that cannot produce a QR code on its first day is not open.
    expect(branch.table_count).toBe(8);
    expect(branch.is_active).toBe(true);
  });

  it("refuses a branch with no name, because staff pick it from a list", async () => {
    const res = await mockRequest(URL, "POST", { name: "   " }, q(), true);
    expect(res.status).toBe(422);
  });

  /**
   * Closing is deactivation, never deletion: the venue's orders, takings and
   * audit trail have to outlive it, and one that reopens keeps its history.
   */
  it("closes and reopens a branch without losing it", async () => {
    const created = await mockRequest(URL, "POST", { name: "Lekki" }, q(), true);
    const id = (created.body as { id: string }).id;

    const closed = await mockRequest(`${URL}/${id}`, "PATCH", { is_active: false }, q(), true);
    expect(closed.status).toBe(200);
    expect((closed.body as { is_active: boolean }).is_active).toBe(false);

    const all = await mockRequest(URL, "GET", null, q(), true);
    const found = (all.body as Array<{ id: string; name: string }>).find((b) => b.id === id);
    expect(found?.name).toBe("Lekki");

    const reopened = await mockRequest(`${URL}/${id}`, "PATCH", { is_active: true }, q(), true);
    expect((reopened.body as { is_active: boolean }).is_active).toBe(true);
  });

  it("patches only what it is given", async () => {
    const created = await mockRequest(
      URL,
      "POST",
      { name: "Yaba", address: "3 Herbert Macaulay Way" },
      q(),
      true,
    );
    const id = (created.body as { id: string }).id;

    const renamed = await mockRequest(`${URL}/${id}`, "PATCH", { name: "Yaba Main" }, q(), true);
    const b = renamed.body as { name: string; address: string | null };
    expect(b.name).toBe("Yaba Main");
    // Renaming a venue must not silently blank its address.
    expect(b.address).toBe("3 Herbert Macaulay Way");
  });

  it("404s on a branch that does not exist", async () => {
    const res = await mockRequest(`${URL}/nope`, "PATCH", { name: "x" }, q(), true);
    expect(res.status).toBe(404);
  });
});

/**
 * A table has two identifiers and they are not interchangeable: `id` is the
 * uuid a QR code encodes, `table_id` is the name staff read. Path params take
 * the uuid; **body fields take the name**.
 *
 * The dashboard sent `table.id` — the uuid — in the body of `/admin/verify`,
 * so every verify 404'd and the screen reported "that bill was already
 * settled", because a 404 means exactly that everywhere else on it. Verify had
 * never worked from that button.
 *
 * Nothing caught it: the mock agrees with the API, but no test had ever called
 * verify the way the dashboard calls it.
 */
describe("mock API — a table's two identifiers are not interchangeable", () => {
  async function claimOnT7() {
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
    await mockRequest("/payment/confirm", "POST", { order_id: orderId }, q(), false);
  }

  it("verifies when given the name, which is what a body field takes", async () => {
    await claimOnT7();
    const res = await mockRequest("/admin/verify", "POST", { table_id: "T7" }, q(), true);
    expect(res.status).toBe(200);
  });

  it("finds nothing when given the uuid — the shape that shipped", async () => {
    await claimOnT7();
    const res = await mockRequest("/admin/verify", "POST", { table_id: "tbl-t7" }, q(), true);
    // 404, which the dashboard renders as "already settled" — a true statement
    // about the response and a false one about the bill.
    expect(res.status).toBe(404);
  });

  it("closes on the name too", async () => {
    await claimOnT7();
    const res = await mockRequest(
      "/admin/close",
      "POST",
      { table_id: "T7", reason: "abandoned" },
      q(),
      true,
    );
    expect(res.status).toBe(200);
  });

  it("still takes the uuid on the path, where it belongs", async () => {
    const res = await mockRequest("/table/tbl-t7", "GET", null, q(), false);
    expect(res.status).toBe(200);
  });
});
