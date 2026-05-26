/**
 * Fetch wrapper for the Oshap FastAPI backend.
 *
 * Responsibilities:
 *   - Reads base URL from VITE_API_BASE_URL.
 *   - Serializes JSON requests and parses JSON responses.
 *   - Throws `ApiError` on non-2xx responses with the server's error message.
 *   - Attaches the admin PIN header for admin-scoped calls.
 *   - Falls back to mock API when VITE_MOCK_API=true or VITE_API_BASE_URL is not set.
 *
 * The backend dev (FastAPI) sees these requests as standard JSON, plus
 * `x-admin-pin` on admin endpoints.
 */

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Admin PIN — module-scoped + sessionStorage backed
// ---------------------------------------------------------------------------

const PIN_STORAGE_KEY = "oshap-admin-pin";
let adminPin: string | null = null;

function readPinFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(PIN_STORAGE_KEY);
}

export function setAdminPin(pin: string | null): void {
  adminPin = pin;
  if (typeof window === "undefined") return;
  if (pin) {
    window.sessionStorage.setItem(PIN_STORAGE_KEY, pin);
  } else {
    window.sessionStorage.removeItem(PIN_STORAGE_KEY);
  }
}

export function getAdminPin(): string | null {
  if (adminPin) return adminPin;
  adminPin = readPinFromStorage();
  return adminPin;
}

// ---------------------------------------------------------------------------
// Mock mode detection
// ---------------------------------------------------------------------------

function isMockMode(): boolean {
  if (typeof window === "undefined") return false;
  const mockFlag = import.meta.env.VITE_MOCK_API;
  const hasBaseUrl = !!import.meta.env.VITE_API_BASE_URL;
  return mockFlag === "true" || mockFlag === true || !hasBaseUrl;
}

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  if (isMockMode()) return "mock://api";
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Add it to your .env file (see .env.example).",
    );
  }
  return url.replace(/\/$/, "");
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Adds the `x-admin-pin` header. Throws if no PIN is set. */
  admin?: boolean;
  /** Pass FormData directly; skips JSON serialization. */
  formData?: FormData;
  signal?: AbortSignal;
}

function buildSearchParams(
  query: RequestOptions["query"],
): URLSearchParams {
  const sp = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      sp.set(key, String(value));
    }
  }
  return sp;
}

function buildUrl(path: string, query: RequestOptions["query"]): string {
  const url = new URL(getBaseUrl() + path);
  const sp = buildSearchParams(query);
  sp.forEach((v, k) => url.searchParams.set(k, v));
  return url.toString();
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (isMockMode()) {
    return mockRequest(
      path,
      options.method ?? "GET",
      options.body ?? null,
      buildSearchParams(options.query),
      options.admin ?? false,
    ) as Promise<T>;
  }

  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  if (options.admin) {
    const pin = getAdminPin();
    if (!pin) {
      throw new ApiError(401, "Admin PIN not set", null);
    }
    headers["x-admin-pin"] = pin;
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload: unknown = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const message =
      (isJson &&
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof (payload as { error: unknown }).error === "string" &&
        (payload as { error: string }).error) ||
      response.statusText ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}

// ---------------------------------------------------------------------------
// Mock import — dynamic to keep the real path tree-shakeable
// ---------------------------------------------------------------------------

async function mockRequest(
  path: string,
  method: string,
  body: unknown,
  query: URLSearchParams,
  admin: boolean,
): Promise<unknown> {
  const { mockRequest: handler } = await import("./mock");
  const match = await handler(path, method, body, query, admin);
  if (match.status >= 400) {
    throw new ApiError(
      match.status,
      typeof match.body === "object" && match.body !== null && "error" in match.body
        ? String((match.body as { error: string }).error)
        : `Mock error ${match.status}`,
      match.body,
    );
  }
  return match.body;
}
