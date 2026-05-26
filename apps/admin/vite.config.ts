import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import generateFirebaseSw from "./generateFirebaseSw";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

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
