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
  },
});
