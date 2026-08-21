import { defineConfig } from "vitest/config";

export default defineConfig({
  // Set here rather than left to tsconfig discovery. esbuild reads the nearest
  // `tsconfig.json`, and the app ones are solution-style files that only hold
  // references — so `jsx` lives in `tsconfig.app.json` where esbuild never
  // looks, and a .tsx test under apps/ silently compiled to the classic runtime
  // and failed with "React is not defined". Package tests worked, which made it
  // look like a test bug rather than a config gap.
  esbuild: { jsx: "automatic" },
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
