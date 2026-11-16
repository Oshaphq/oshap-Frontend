import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Same as the other apps: env files live at the repo root, not per app.
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  envDir: repoRoot,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5177,
  },
});
