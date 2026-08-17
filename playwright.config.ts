import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end coverage for the customer ordering flow.
 *
 * Runs the customer app against the in-memory mock, so it needs no backend,
 * no database and no network. That's what makes it runnable in CI today —
 * and also its limit: it proves the UI works, not that our reading of the
 * API contract is right. Only running against the real backend does that.
 *
 * Specs live in /e2e, outside the globs in vitest.config.ts, so `npm test`
 * and `npm run test:e2e` never try to run each other's files.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts/,
  // Serial, deliberately. Every context talks to its own copy of the in-memory
  // mock, but they share one preview server, and under parallel cold loads the
  // menu request was coming back empty often enough to make the suite lie. A
  // seven-test suite that takes a minute and always tells the truth beats a
  // faster one that needs a re-run to be believed.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "mobile-chrome",
      use: {
        // Guests order from a phone. Testing at desktop width would miss the
        // bottom sheets and the cart bar, which are the whole interface here.
        ...devices["Pixel 7"],
        // Defaults to Playwright's bundled Chromium, which is what CI uses.
        // Set PLAYWRIGHT_CHANNEL=msedge (or chrome) to drive an already
        // installed browser instead — the bundled download is a large fetch
        // from a CDN that some networks block, and being unable to run the
        // suite at all is a worse outcome than running it on a near-identical
        // engine.
        channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
      },
    },
  ],

  webServer: {
    // Build once and serve the output, rather than running the dev server.
    // Vite transforms on demand, so parallel cold navigations queue behind
    // each other and time out; preview serves static files and is also the
    // artifact that actually ships. The build is the slow part, so give it
    // room.
    command: "npm run build:customer && npm run preview:customer",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Forced, not inherited. The repo's .env.local points at the deployed
      // backend, and VITE_MOCK_API outranks the base URL in isMockMode() —
      // without this the suite would build against a real, empty database.
      // It has to be set for the *build*, since Vite inlines import.meta.env
      // at build time rather than reading it when the page loads.
      VITE_MOCK_API: "true",
    },
  },
});
