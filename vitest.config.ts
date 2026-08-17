import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // jsdom: the mock API and client touch window/localStorage/WebSocket.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "packages/**/src/**/*.{test,spec}.{ts,tsx}",
      "apps/**/src/**/*.{test,spec}.{ts,tsx}",
    ],
    // The mock layer adds a 150–350ms artificial latency per request.
    testTimeout: 15000,
    // Neutralize .env.local, which Vite loads here too. These suites decide
    // their own mode: most rely on an absent base URL to get the mock, while
    // the envelope tests call vi.stubEnv to opt into the real-fetch path. A
    // developer pointing their apps at the live backend would otherwise flip
    // the first group onto the network and fail them on "Not signed in" — a
    // test result that depends on a gitignored file is worse than none.
    // Don't set VITE_MOCK_API=true here: the flag outranks the base URL, so it
    // would strand the envelope tests in the mock they exist to bypass.
    env: {
      VITE_API_BASE_URL: "",
      VITE_MOCK_API: "",
    },
  },
});
