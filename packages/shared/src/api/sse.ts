import { API_PREFIX, getAccessToken, getBaseUrl } from "./client";

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

  // Intercept for mock API environment
  if (typeof window !== "undefined" && (window as any).__MOCK_EVENT_SOURCE__) {
    return new (window as any).__MOCK_EVENT_SOURCE__(url.toString());
  }

  return new EventSource(url.toString());
}
