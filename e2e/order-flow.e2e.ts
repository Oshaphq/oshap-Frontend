import { test, expect, type Page } from "@playwright/test";

/**
 * The path a guest actually takes: scan, browse, choose, order.
 *
 * These assert on what a person sees — dish names, prices, the words on
 * buttons — rather than on component internals, so a refactor that keeps the
 * screen working keeps the tests passing. Prices are the exception worth
 * asserting precisely: the modifier pricing rule is the part most likely to
 * break silently, and a wrong total is invisible until someone is asked to
 * pay it.
 */

/**
 * Scanning a table QR lands here.
 *
 * The parameter is the table's **uuid**, not its name — that is what a QR
 * encodes and what `GET /table/{id}` resolves. Table names repeat across
 * restaurants, and the real backend rejects one with a 422, so testing with
 * "T1" would exercise a path production no longer has.
 */
async function openMenu(page: Page, table = "tbl-t1") {
  await page.goto(`/menu?table=${table}`);
  await expect(page.getByText("Chicken Shawarma")).toBeVisible();
}

/** The sticky bar at the bottom, which only exists once something is in it. */
/**
 * The cart sheet names itself from its visible heading — "Your Order (N)".
 * It used to carry `aria-label="Your cart"`, which contradicted the heading on
 * screen; adopting `Sheet` made the accessible name the heading, so the
 * locator follows the words a guest can actually read.
 */
async function openCart(page: Page) {
  await page.getByRole("button", { name: /View Cart/i }).click();
  await expect(page.getByRole("dialog", { name: /Your Order/i })).toBeVisible();
}

/** The card for one dish, so actions can be scoped to it. */
function dishCard(page: Page, name: string) {
  return page.locator("article").filter({ hasText: name }).first();
}

test.describe("customer ordering", () => {
  test("shows the menu for the scanned table", async ({ page }) => {
    await openMenu(page);

    // Seeded prices, in naira — the kobo conversion is the thing being
    // checked here. ₦25.00 would mean the units regressed.
    await expect(page.getByText("₦2,500").first()).toBeVisible();
    await expect(page.getByText("Jollof Rice & Chicken")).toBeVisible();
  });

  test("adds a plain dish straight to the cart", async ({ page }) => {
    await openMenu(page);

    // Coca-Cola has no modifier groups, so it skips the option sheet.
    const coke = dishCard(page, "Coca-Cola");
    await coke.getByRole("button", { name: /Add Coca-Cola to cart/i }).click();

    // The card swaps to a stepper once the dish is in the cart.
    await expect(coke.getByRole("button", { name: /Increase/i })).toBeVisible();
  });

  test("requires a choice before a configurable dish can be added", async ({
    page,
  }) => {
    await openMenu(page);

    await dishCard(page, "Jollof Rice & Chicken")
      .getByRole("button", { name: /Choose options/i })
      .click();

    const sheet = page.getByRole("dialog", { name: /Choose options/i });
    await expect(sheet).toBeVisible();

    // Protein and Spice level are both required, so the button names what's
    // missing rather than sitting disabled without explanation.
    const cta = sheet.getByRole("button", { name: /^Choose /i });
    await expect(cta).toBeVisible();
    await expect(cta).toBeDisabled();

    await sheet.getByRole("radio", { name: /Turkey/ }).click();
    await sheet.getByRole("radio", { name: /^Mild/ }).click();

    // Both satisfied — the button becomes the real action, priced.
    await expect(sheet.getByRole("button", { name: /^Add ·/ })).toBeEnabled();
  });

  test("prices modifiers into the line without double-counting", async ({
    page,
  }) => {
    await openMenu(page);

    await dishCard(page, "Jollof Rice & Chicken")
      .getByRole("button", { name: /Choose options/i })
      .click();

    const sheet = page.getByRole("dialog", { name: /Choose options/i });
    await sheet.getByRole("radio", { name: /Turkey/ }).click();
    await sheet.getByRole("radio", { name: /^Mild/ }).click();
    await sheet.getByRole("checkbox", { name: /Extra plantain/ }).click();

    // ₦3,500 base + ₦500 turkey + ₦500 plantain = ₦4,500. If the cart added
    // the deltas and the server added them again, this would read ₦5,500.
    await expect(sheet.getByRole("button", { name: "Add · ₦4,500" })).toBeVisible();
    await sheet.getByRole("button", { name: /^Add ·/ }).click();

    await openCart(page);
    const cart = page.getByRole("dialog", { name: /Your Order/i });
    // Every chosen option is listed, in group order — the required spice
    // choice included, since the guest is paying for that line as configured.
    await expect(
      cart.getByText("Turkey · Mild · Extra plantain"),
    ).toBeVisible();
    // Twice: once on the line, once as the cart total. Asserting both agree
    // is stronger than picking one — a mismatch between them is exactly what
    // a pricing regression looks like.
    await expect(cart.getByText("₦4,500")).toHaveCount(2);
  });

  test("keeps the same dish on separate lines when the options differ", async ({
    page,
  }) => {
    await openMenu(page);
    const card = dishCard(page, "Jollof Rice & Chicken");

    for (const protein of ["Turkey", "Beef"]) {
      await card.getByRole("button", { name: /Choose options/i }).click();
      const sheet = page.getByRole("dialog", { name: /Choose options/i });
      await sheet.getByRole("radio", { name: new RegExp(protein) }).click();
      await sheet.getByRole("radio", { name: /^Mild/ }).click();
      await sheet.getByRole("button", { name: /^Add ·/ }).click();
    }

    await openCart(page);
    const cart = page.getByRole("dialog", { name: /Your Order/i });

    // Two rows, not one row of quantity 2 — they're different food.
    await expect(cart.getByText("Turkey · Mild")).toBeVisible();
    await expect(cart.getByText("Beef · Mild")).toBeVisible();
  });

  test("places an order and shows it under the table's orders", async ({
    page,
  }) => {
    await openMenu(page, "tbl-t4");

    await dishCard(page, "Coca-Cola")
      .getByRole("button", { name: /Add Coca-Cola to cart/i })
      .click();
    await openCart(page);
    await page
      .getByRole("dialog", { name: /Your Order/i })
      .getByRole("button", { name: /Place Order/i })
      .click();

    await expect(page).toHaveURL(/\/checkout/);

    // Every charge is named before the guest commits. Coca-Cola is ₦500;
    // the seeded restaurant adds 5% service (₦25) and 7.5% VAT on the
    // result (₦39.38), so ₦564.38. Asserting the figure and not just the
    // labels is what catches this screen quietly reverting to printing the
    // subtotal twice and calling the second one Total.
    await expect(page.getByText("Item total")).toBeVisible();
    await expect(page.getByText("Service charge")).toBeVisible();
    await expect(page.getByText("VAT")).toBeVisible();
    await expect(page.getByText("₦564.38")).toBeVisible();

    await page.getByRole("button", { name: "Confirm Order" }).click();

    await expect(page).toHaveURL(/\/orders/, { timeout: 15_000 });
    // `exact`, because the "Coca-Cola added" toast from the ADD step lives for
    // 1800ms and everything between here and there is mocked. On a fast runner
    // the toast is still up when this asserts, and a loose match resolves to
    // both it and the order line — so this fails precisely when CI is quick.
    await expect(page.getByText("Coca-Cola", { exact: true })).toBeVisible();
  });

  test("survives a reload with the cart intact", async ({ page }) => {
    // `tbl-t7`, not `T7`. A QR code encodes the uuid and `GET /table/{id}`
    // 422s on a name — this line passed only because the menu used to load
    // without a restaurant id at all, so a failed table lookup went unnoticed.
    await openMenu(page, "tbl-t7");

    await dishCard(page, "Zobo")
      .getByRole("button", { name: /Choose options/i })
      .click();
    const sheet = page.getByRole("dialog", { name: /Choose options/i });
    await sheet.getByRole("radio", { name: /Large/ }).click();
    await sheet.getByRole("button", { name: /^Add ·/ }).click();

    await page.reload();

    // A guest who locks their phone mid-order should not lose the cart.
    await openCart(page);
    await expect(
      page.getByRole("dialog", { name: /Your Order/i }).getByText("Large"),
    ).toBeVisible();
  });
});
