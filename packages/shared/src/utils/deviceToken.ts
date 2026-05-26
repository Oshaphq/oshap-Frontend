/**
 * Returns a stable anonymous device token for the current browser tab.
 * Generated once per tab and stored in sessionStorage so each QR scan
 * (new tab / new device) gets its own token.
 */
const KEY = "oshap-device-token";

export function getDeviceToken(): string {
  if (typeof window === "undefined") return "";

  let token = window.sessionStorage.getItem(KEY);
  if (!token) {
    token = crypto.randomUUID();
    window.sessionStorage.setItem(KEY, token);
  }
  return token;
}
