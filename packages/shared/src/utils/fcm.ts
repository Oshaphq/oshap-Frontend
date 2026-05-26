import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Messaging } from "firebase/messaging";

let _app: FirebaseApp | null = null;
let _messaging: Messaging | null = null;

export function getFCMConfig(): FirebaseOptions {
  if (typeof window === "undefined") {
    return {} as FirebaseOptions;
  }

  return {
    apiKey: import.meta.env.VITE_FCM_API_KEY,
    authDomain: import.meta.env.VITE_FCM_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FCM_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FCM_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FCM_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FCM_APP_ID,
  };
}

export function getVapidKey(): string {
  if (typeof window === "undefined") return "";
  return import.meta.env.VITE_FCM_VAPID_KEY ?? "";
}

export async function requestPermissionAndGetToken(
  messaging: Messaging,
  vapidKey: string,
): Promise<string | null> {
  if (!("Notification" in window)) {
    console.warn("[FCM] Notifications not supported in this browser.");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("[FCM] Notification permission denied.");
    return null;
  }

  const { getToken } = await import("firebase/messaging");
  return getToken(messaging, { vapidKey });
}

export async function initFCM(
  restaurantId: string,
  deviceLabel?: string,
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const config = getFCMConfig();
  if (!config.apiKey || !config.projectId) {
    console.warn("[FCM] Firebase config incomplete — check VITE_FCM_* env vars.");
    return null;
  }

  const { initializeApp } = await import("firebase/app");
  const { getMessaging } = await import("firebase/messaging");

  _app = initializeApp(config);
  _messaging = getMessaging(_app);

  const vapidKey = getVapidKey();
  if (!vapidKey) {
    console.warn("[FCM] VAPID key not set — cannot retrieve FCM token.");
    return null;
  }

  const token = await requestPermissionAndGetToken(_messaging, vapidKey);
  if (!token) return null;

  const { registerDevice } = await import("../api/devices");
  try {
    await registerDevice({
      fcm_token: token,
      restaurant_id: restaurantId,
      device_label: deviceLabel,
    });
    console.log("[FCM] Device token registered successfully.");
  } catch (err) {
    console.error("[FCM] Failed to register device token:", err);
    return null;
  }

  return token;
}

export function getMessagingInstance(): Messaging | null {
  return _messaging;
}
