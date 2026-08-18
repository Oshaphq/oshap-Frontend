import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite resolves .env files relative to each app directory, so a monorepo-root
// .env.local — which is what .env.example and the README tell you to create —
// was never loaded. Every locally-run app silently fell back to the mock, and
// the only symptom was data that looked plausible. Point envDir at the repo
// root so the documented setup actually works.
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));


export default defineConfig({
  envDir: repoRoot,
  plugins: [react(), tailwindcss()],
  server: {
    // 5173 customer, 5174 admin, 5175 is the mock WS relay (ws-relay.js) — use 5176.
    port: 5176,
  },
});
