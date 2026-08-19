import { test, expect, request as pwRequest } from "@playwright/test";
import { TIER_ORDER } from "../apps/platform/src/tiers.data";

/**
 * Production smoke check. See playwright.smoke.config.ts for why this exists
 * separately from the mock-backed E2E suite.
 *
 * Configure with environment variables — nothing here is hardcoded to one
 * deployment, so the same suite can point at staging:
 *
 *   OSHAP_API_URL           https://oshap-cerebrum.useshappay.com
 *   OSHAP_CUSTOMER_URL      https://oshap.useshappay.com
 *   OSHAP_ADMIN_URL         https://admin.oshap.useshappay.com
 *   OSHAP_PLATFORM_TOKEN    the operator access code
 *
 * The token is required only by the contract test, which creates a throwaway
 * tenant and deletes it. Without it that test skips rather than fails, so the
 * browser checks still run for anyone without operator access.
 */

const API = (process.env.OSHAP_API_URL ?? "https://oshap-cerebrum.useshappay.com").replace(/\/$/, "");
const CUSTOMER = (process.env.OSHAP_CUSTOMER_URL ?? "https://oshap.useshappay.com").replace(/\/$/, "");
const ADMIN = (process.env.OSHAP_ADMIN_URL ?? "https://admin.oshap.useshappay.com").replace(/\/$/, "");
const PLATFORM_TOKEN = process.env.OSHAP_PLATFORM_TOKEN;

const V1 = `${API}/api/v1`;

/** Cheapest plan that includes table ordering, per the pricing strategy. */
const ORDERING_TIER = "STANDARD" as const;

/** Unmistakably test data, and greppable if a cleanup ever fails. */
const stamp = Date.now().toString().slice(-6);
const TENANT_NAME = `ZZ SMOKE ${stamp}`;
const OWNER_PHONE = `0803${stamp.padStart(7, "0").slice(0, 7)}`;
const OWNER_PASSWORD = "smoke-check-password";

test.describe("deployed apps can reach the API", () => {
  // This is the CORS check, and it only works in a browser. A fetch from Node
  // sends no Origin and triggers no preflight, so it passes happily while
  // every real visitor is blocked — which is exactly what happened.
  for (const [label, origin] of [
    ["customer", CUSTOMER],
    ["admin", ADMIN],
  ] as const) {
    test(`${label} origin is allowed by the API`, async ({ page }) => {
      // All this needs is a page ON that origin, so the fetch below carries
      // the right Origin header. `commit` resolves as soon as the response
      // starts, without waiting for a ~800KB SPA to boot — waiting for the
      // full load made this flaky, and none of it is what is under test.
      await page.goto(`${origin}/`, { waitUntil: "commit", timeout: 45_000 });

      // Ask the API directly rather than watching what the app happens to
      // request. The admin login screen legitimately calls nothing before
      // sign-in, so "did it make a call" is a flaky proxy for the thing
      // actually under test: whether this origin is allowed at all.
      const result = await page.evaluate(async (api) => {
        try {
          const res = await fetch(`${api}/api/v1/menu`, {
            headers: { "content-type": "application/json" },
          });
          return { ok: true, status: res.status, error: "" };
        } catch (err) {
          return { ok: false, status: 0, error: String(err) };
        }
      }, API);

      expect(
        result.ok,
        `${label} origin (${origin}) cannot reach ${API}. Almost certainly a CORS allowlist that omits it. ${result.error}`,
      ).toBe(true);
      expect(result.status).toBeLessThan(500);
    });
  }

  test("customer app is built against the real API, not the mock", async ({ page }) => {
    const hosts = new Set<string>();
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/v1")) hosts.add(new URL(url).origin);
    });

    await page.goto(`${CUSTOMER}/menu?table=smoke-probe`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await page.waitForTimeout(2_000);

    // A deployment built without VITE_API_BASE_URL silently serves the
    // in-memory mock: a full seeded menu, a working cart, and not one byte
    // exchanged with a server. It has shipped that way once already.
    expect([...hosts], "no requests reached the configured API origin").toContain(API);
  });
});

test.describe("the API contract still matches what we send", () => {
  test.skip(!PLATFORM_TOKEN, "OSHAP_PLATFORM_TOKEN not set — skipping the contract check");

  test("the backend accepts every subscription tier the platform app offers", async () => {
    const api = await pwRequest.newContext();
    const rejected: string[] = [];
    const created: string[] = [];

    try {
      for (const tier of TIER_ORDER) {
        const stampT = `${Date.now()}`.slice(-6);
        const res = await api.post(`${V1}/platform/restaurants`, {
          headers: { "x-platform-token": PLATFORM_TOKEN! },
          data: {
            name: `ZZ TIER ${tier} ${stampT}`,
            owner_name: "Tier Check",
            owner_phone: `0803${stampT.padStart(7, "0").slice(0, 7)}`,
            subscription_tier: tier,
            table_count: 1,
          },
        });
        if (res.status() === 201) created.push((await res.json()).data.id);
        else rejected.push(`${tier} -> ${res.status()} ${(await res.text()).slice(0, 120)}`);
        await new Promise((r) => setTimeout(r, 600));
      }

      // The platform app offers these tiers in its own UI. A tier it can show
      // but not create is a broken onboarding form, and the only symptom is a
      // 422 the operator sees as "failed to create restaurant".
      expect(
        rejected,
        "tiers the backend refuses: " + rejected.join(" | "),
      ).toEqual([]);
    } finally {
      for (const id of created) {
        await api.delete(`${V1}/platform/restaurants/${id}`, {
          headers: { "x-platform-token": PLATFORM_TOKEN! },
        });
        await new Promise((r) => setTimeout(r, 300));
      }
      await api.dispose();
    }
  });

  test("a tenant can be created, claimed, and take a priced order", async () => {
    const api = await pwRequest.newContext();
    let restaurantId: string | null = null;

    try {
      // --- create -------------------------------------------------------
      const created = await api.post(`${V1}/platform/restaurants`, {
        headers: { "x-platform-token": PLATFORM_TOKEN! },
        data: {
          name: TENANT_NAME,
          owner_name: "Smoke Check",
          owner_phone: OWNER_PHONE,
          // Ordering is a Standard feature — Lite is menu-only, by design.
          // Running this on Lite would assert that a plan can do something it
          // is explicitly not sold as doing.
          subscription_tier: ORDERING_TIER,
          table_count: 2,
        },
      });
      expect(created.status(), await created.text()).toBe(201);
      const tenant = (await created.json()).data;
      restaurantId = tenant.id;

      expect(tenant.owner_phone, "phone was not normalized to E.164").toMatch(/^\+234\d{10}$/);
      expect(tenant.owner_setup_url, "no setup link returned").toBeTruthy();

      // --- claim --------------------------------------------------------
      const token = new URL(tenant.owner_setup_url).searchParams.get("token");
      const claimed = await api.post(`${V1}/auth/setup/complete`, {
        data: { token, password: OWNER_PASSWORD },
      });
      expect(claimed.status(), await claimed.text()).toBe(200);
      const session = (await claimed.json()).data;
      expect(session.access_token).toBeTruthy();
      const auth = { authorization: `Bearer ${session.access_token}` };

      // --- the two identifiers ------------------------------------------
      const tablesRes = await api.get(`${V1}/admin/tables`, { headers: auth });
      expect(tablesRes.status()).toBe(200);
      const table = ((await tablesRes.json()).data.tables ?? [])[0];
      expect(table, "no tables were provisioned").toBeTruthy();
      expect(table.id, "table id is not a uuid").toMatch(/^[0-9a-f-]{36}$/i);
      expect(table.table_id, "table label missing").toBeTruthy();

      // Path params take the uuid; bodies and queries take the name. Getting
      // this backwards fails silently in one direction, so assert both.
      const byUuid = await api.get(`${V1}/table/${table.id}`);
      expect(byUuid.status(), "GET /table/{uuid} should resolve").toBe(200);
      const info = (await byUuid.json()).data;
      expect(info.table_id).toBe(table.table_id);

      // --- order --------------------------------------------------------
      const menu = await api.post(`${V1}/admin/menu`, {
        headers: auth,
        data: { name: "Smoke Dish", price: 100_000, category: "Meals" },
      });
      expect(menu.status(), await menu.text()).toBeLessThan(400);
      const menuItemId = (await menu.json()).data?.id;

      const order = await api.post(`${V1}/orders`, {
        data: {
          table: table.table_id,
          restaurant_id: restaurantId,
          items: [{ name: "Smoke Dish", qty: 2, price: 100_000, menu_item_id: menuItemId }],
        },
      });
      expect(order.status(), await order.text()).toBe(200);
      const orderId = (await order.json()).data.order_id;

      // --- the guest can see what they are paying ------------------------
      const detail = await api.get(`${V1}/orders/${orderId}`);
      expect(detail.status()).toBe(200);
      const d = (await detail.json()).data;

      for (const field of ["subtotal", "discount", "service_charge", "vat", "tip", "total"]) {
        expect(d, `OrderDetail is missing ${field}`).toHaveProperty(field);
      }
      expect(d.subtotal).toBe(200_000);
      // The invariant the whole money layer rests on.
      expect(d.subtotal - d.discount + d.service_charge + d.vat + d.tip).toBe(d.total);
    } finally {
      // Always, even on failure — otherwise a red run leaves a tenant behind
      // and the next one has to work around it.
      if (restaurantId && PLATFORM_TOKEN) {
        await api.delete(`${V1}/platform/restaurants/${restaurantId}`, {
          headers: { "x-platform-token": PLATFORM_TOKEN },
        });
      }
      await api.dispose();
    }
  });
});

test.describe("plans grant what they are sold as granting", () => {
  test.skip(!PLATFORM_TOKEN, "OSHAP_PLATFORM_TOKEN not set");

  // Tier gating is what makes the plans real rather than three labels. These
  // assert the boundary from both sides: a Lite restaurant must get everything
  // Lite is sold as including, and must not get what it isn't.
  test("Lite gets its own feature set, and not Standard's", async () => {
    const api = await pwRequest.newContext();
    let id: string | null = null;

    try {
      const stampL = `${Date.now()}`.slice(-6);
      const res = await api.post(`${V1}/platform/restaurants`, {
        headers: { "x-platform-token": PLATFORM_TOKEN! },
        data: {
          name: `ZZ LITE ${stampL}`,
          owner_name: "Lite Check",
          owner_phone: `0803${stampL.padStart(7, "0").slice(0, 7)}`,
          subscription_tier: "LITE",
          table_count: 2,
        },
      });
      expect(res.status(), await res.text()).toBe(201);
      const tenant = (await res.json()).data;
      id = tenant.id;

      const token = new URL(tenant.owner_setup_url).searchParams.get("token");
      const claimed = await api.post(`${V1}/auth/setup/complete`, {
        data: { token, password: "lite-check-password" },
      });
      const auth = {
        authorization: `Bearer ${(await claimed.json()).data.access_token}`,
      };

      // Lite is sold as "QR code menu" — and a QR code is per table. Without
      // table management a Lite restaurant cannot produce the codes that are
      // the entire product.
      for (const path of ["/admin/menu", "/admin/settings", "/admin/tables"]) {
        const r = await api.get(`${V1}${path}`, { headers: auth });
        expect(r.status(), `Lite should include ${path}`).toBeLessThan(400);
      }

      // Kitchen dashboard and tickets start at Standard.
      const kitchen = await api.get(`${V1}/admin/kitchen`, { headers: auth });
      expect(kitchen.status(), "kitchen should be Standard and above").toBe(403);
    } finally {
      if (id) {
        await api.delete(`${V1}/platform/restaurants/${id}`, {
          headers: { "x-platform-token": PLATFORM_TOKEN! },
        });
      }
      await api.dispose();
    }
  });
});
