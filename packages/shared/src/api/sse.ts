import { API_PREFIX, getAccessToken, getBaseUrl } from "./client";

/** Honours the mock EventSource the test harness installs, if there is one. */
function open(url: URL): EventSource {
  if (typeof window !== "undefined" && (window as any).__MOCK_EVENT_SOURCE__) {
    return new (window as any).__MOCK_EVENT_SOURCE__(url.toString());
  }
  return new EventSource(url.toString());
}

/**
 * EventSource cannot send headers, so the stream authenticates with the access
 * token as a query param — which is what the backend expects on `/events`.
 *
 * Note this also adds `API_PREFIX`: the SSE URL was built from the origin alone
 * and so missed the `/api/v1` mount that every other request gets.
 */
export function createEventSource(path: string): EventSource {
  const url = new URL(getBaseUrl() + API_PREFIX + path);

  const token = getAccessToken();
  if (token) url.searchParams.set("access_token", token);

  return open(url);
}

/**
 * The guest-facing stream. Deliberately separate from `createEventSource`:
 * the customer app has no access token and must never acquire one, so a
 * variant that cannot attach a staff credential is safer than a flag on the
 * one that can.
 *
 * Scoped by the table's uuid, which is unguessable and already the key to the
 * public `GET /table/{id}`. The stream carries no order data of its own — only
 * an event type, as a prompt to refetch — so it cannot widen what a guest can
 * already read.
 */
export function createPublicEventSource(
  path: string,
  query?: Record<string, string | undefined>,
): EventSource {
  const base = getBaseUrl();

  // The mock client hands out a `mock://` origin, which no real EventSource can
  // open. Whether that throws on construction or fails asynchronously is
  // browser-dependent, and the async form would retry every 5s for the length
  // of a meal. Fail deterministically instead, so the caller can give up once.
  if (base.startsWith("mock://") && !(window as any).__MOCK_EVENT_SOURCE__) {
    throw new Error("No event stream in mock mode");
  }

  const url = new URL(base + API_PREFIX + path);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) url.searchParams.set(key, value);
  }

  return open(url);
}
