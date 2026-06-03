import { getBaseUrl } from "./client";

export function createEventSource(path: string): EventSource {
  const url = `${getBaseUrl()}${path}`;
  
  // Intercept for mock API environment
  if (typeof window !== "undefined" && (window as any).__MOCK_EVENT_SOURCE__) {
    return new (window as any).__MOCK_EVENT_SOURCE__(url);
  }
  
  return new EventSource(url);
}
