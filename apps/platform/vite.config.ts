import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 5173 customer, 5174 admin, 5175 is the mock WS relay (ws-relay.js) — use 5176.
    port: 5176,
  },
});
