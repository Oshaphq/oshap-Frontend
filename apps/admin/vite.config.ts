import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import generateFirebaseSw from "./generateFirebaseSw";

// Vite resolves .env files relative to each app directory, so a monorepo-root
// .env.local — which is what .env.example and the README tell you to create —
// was never loaded. Every locally-run app silently fell back to the mock, and
// the only symptom was data that looked plausible. Point envDir at the repo
// root so the documented setup actually works.
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "VITE_");

  const fcmConfig: Record<string, string> = {
    apiKey: env.VITE_FCM_API_KEY ?? "",
    authDomain: env.VITE_FCM_AUTH_DOMAIN ?? "",
    projectId: env.VITE_FCM_PROJECT_ID ?? "",
    storageBucket: env.VITE_FCM_STORAGE_BUCKET ?? "",
    messagingSenderId: env.VITE_FCM_MESSAGING_SENDER_ID ?? "",
    appId: env.VITE_FCM_APP_ID ?? "",
  };

  const swScript = generateFirebaseSw(fcmConfig);

  return {
    envDir: repoRoot,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "fcm-sw",
        configureServer(server) {
          server.middlewares.use(
            "/firebase-messaging-sw.js",
            (_req, res) => {
              res.setHeader("Content-Type", "application/javascript");
              res.setHeader("Service-Worker-Allowed", "/");
              res.end(swScript);
            },
          );
        },
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "firebase-messaging-sw.js",
            source: swScript,
          });
        },
      },
    ],
    server: {
      port: 5174,
    },
  };
});
