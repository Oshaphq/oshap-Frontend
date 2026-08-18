import { defineConfig, devices } from "@playwright/test";

/**
 * Production smoke check — runs against the DEPLOYED apps and the real API.
 *
 * Separate from playwright.config.ts on purpose. That suite runs the customer
 * app against the in-memory mock: it proves our UI works, and by construction
 * cannot see a contract break, because the mock is something we wrote.
 *
 * Three breaks reached production in two days — a CORS allowlist that excluded
 * every deployed origin, a table identifier that changed shape, and a
 * subscription tier enum the backend had never heard of. Every one was found by
 * a person hitting it. None could have been caught by a test that talks to a
 * mock, and the first could only ever be caught in a browser, since CORS is
 * enforced there and nowhere else.
 *
 * This suite creates real data on production and deletes it again. It is
 * deliberately NOT part of `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "./smoke",
  testMatch: /.*\.smoke\.ts/,
  // Serial: the contract test creates a tenant and the browser tests read
  // shared state. Parallelism here buys nothing and risks cross-talk.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // One retry absorbs a cold container or a dropped connection. More than
  // that would start hiding the flakiness this is meant to surface.
  retries: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 60_000,

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // A real phone profile: guests scan from mobile, and the bottom sheets
    // only exist at that width.
    ...devices["Pixel 7"],
    // Matches playwright.config.ts: defaults to the bundled Chromium that CI
    // installs, but PLAYWRIGHT_CHANNEL=msedge (or chrome) drives an already
    // installed browser, so a blocked CDN download doesn't make the suite
    // unrunnable.
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
});
