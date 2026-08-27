import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const read = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), "utf8").replace(/\r/g, "");

const index = read("apps/admin/src/routes/settings.tsx");
const general = read("apps/admin/src/routes/settings/general.tsx");
const branding = read("apps/admin/src/routes/settings/branding.tsx");
const checklist = read("apps/admin/src/components/SetupChecklist.tsx");

/**
 * Settings is a list of places now, not a row of tabs. Seven sections never
 * fitted across a phone.
 */
describe("the settings index", () => {
  it("lists every section", () => {
    for (const to of [
      "/settings/general",
      "/settings/bank",
      "/settings/staff",
      "/settings/tables",
      "/settings/branding",
      "/settings/notifications",
      "/settings/branches",
    ]) {
      expect(index).toContain(`to="${to}"`);
    }
  });

  it("has a screen behind every row", () => {
    const files = readdirSync(resolve(process.cwd(), "apps/admin/src/routes/settings"));
    for (const f of [
      "general.tsx",
      "bank.tsx",
      "staff.tsx",
      "tables.tsx",
      "branding.tsx",
      "notifications.tsx",
      "branches.tsx",
    ]) {
      expect(files).toContain(f);
    }
  });

  it("keeps staff and branches owner-only", () => {
    // A manager running one venue has no business adding accounts or closing
    // another branch.
    expect(index).toContain("{isOwner && <StaffRow />}");
    expect(index).toContain("{isOwner && <BranchesRow />}");
  });

  it("sends a wrong URL to the list, not to General", () => {
    expect(index).toContain('<Navigate to="/settings" replace />');
  });

  it("is not a tab bar any more", () => {
    expect(index).not.toContain("NavLink");
  });
});

/**
 * The page was 400 lines holding six unrelated errands behind one Save, and
 * that button re-sent every field — so a half-finished image edit could ride
 * along with a tax change.
 */
describe("each screen saves only its own fields", () => {
  it("General no longer touches the logo, cover or colour", () => {
    for (const key of ["logo_url", "cover_image_url", "primary_color"]) {
      expect(general).not.toContain(key);
    }
  });

  it("General keeps the name, hours and the two rates", () => {
    for (const key of [
      "name:",
      "operating_hours:",
      "vat_rate:",
      "service_charge_rate:",
    ]) {
      expect(general).toContain(key);
    }
  });

  it("Branding sends only the three that make the menu look like the venue", () => {
    const save = branding.slice(
      branding.indexOf("updateSettings.mutate("),
      branding.indexOf("onSuccess: () => toast.success(\"Branding updated\")"),
    );
    expect(save).toContain("logo_url:");
    expect(save).toContain("cover_image_url:");
    expect(save).toContain("primary_color:");
    expect(save).not.toContain("vat_rate");
    expect(save).not.toContain("name:");
  });
});

describe("the setup checklist still points at pages that hold the thing", () => {
  it("sends the logo step to Branding", () => {
    expect(checklist).toContain('to: "/settings/branding"');
  });

  it("sends the bank step to Bank accounts", () => {
    expect(checklist).toContain('to: "/settings/bank"');
  });

  it("no longer sends anyone to General for either", () => {
    // Both used to, and neither lives there now.
    expect(checklist).not.toContain("Add your logo and address");
    expect(checklist.match(/to: "\/settings\/general"/g)).toHaveLength(1);
  });
});

/**
 * Role routing is fixed server-side on purpose: a kitchen account that
 * received payment alerts and hid them would still have had the day's takings
 * on the pass.
 */
describe("notification routing is shown, not offered", () => {
  const notifications = read("apps/admin/src/routes/settings/notifications.tsx");

  it("renders no control that would imply it is editable", () => {
    expect(notifications).not.toContain("<input");
    expect(notifications).not.toContain("onChange");
    expect(notifications).not.toContain("mutate");
  });

  it("covers every routed type", () => {
    for (const type of [
      "waiter_called",
      "pos_requested",
      "new_order",
      "order_ready",
      "payment_claimed",
      "low_stock",
    ]) {
      expect(notifications).toContain(`${type}:`);
    }
  });

  it("says why it cannot be changed", () => {
    expect(notifications).toContain("takings");
  });
});
