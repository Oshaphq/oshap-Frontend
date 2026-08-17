/**
 * Fetch wrapper for the Oshap FastAPI backend.
 *
 * Responsibilities:
 *   - Reads base URL from VITE_API_BASE_URL.
 *   - Serializes JSON requests and parses JSON responses.
 *   - Throws `ApiError` on non-2xx responses with the server's error message.
 *   - Attaches `Authorization: Bearer` for admin-scoped calls, refreshing the
 *     access token once on a 401 before giving up.
 *   - Falls back to mock API when VITE_MOCK_API=true or VITE_API_BASE_URL is not set.
 */

import type { Restaurant } from "../types/index";

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

export const ADMIN_UNAUTHORIZED_EVENT = "oshap:admin-unauthorized";

// ---------------------------------------------------------------------------
// Auth tokens + restaurant context — module-scoped + sessionStorage backed
//
// Staff auth is a short-lived JWT access token (15 min) plus a longer refresh
// token (7 days), sent as `Authorization: Bearer`. sessionStorage rather than
// localStorage so a closed tab ends the session; the refresh token is what
// spares the user from re-entering a password every 15 minutes.
// ---------------------------------------------------------------------------

const ACCESS_TOKEN_STORAGE_KEY = "oshap-access-token";
const REFRESH_TOKEN_STORAGE_KEY = "oshap-refresh-token";
const RESTAURANT_STORAGE_KEY = "oshap-admin-restaurant";
const PLATFORM_TOKEN_STORAGE_KEY = "oshap-platform-token";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let adminRestaurant: Restaurant | null = null;
let platformToken: string | null = null;

function readSession(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(key);
}

function writeSession(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  if (value) window.sessionStorage.setItem(key, value);
  else window.sessionStorage.removeItem(key);
}

function readRestaurantFromStorage(): Restaurant | null {
  const raw = readSession(RESTAURANT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Restaurant;
  } catch {
    return null;
  }
}

/** Stores the pair returned by login. */
export function setAuthTokens(tokens: {
  access_token: string;
  refresh_token: string;
} | null): void {
  accessToken = tokens?.access_token ?? null;
  refreshToken = tokens?.refresh_token ?? null;
  writeSession(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  writeSession(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  if (!tokens) setAdminRestaurant(null);
}

/** Replaces just the access token, after a refresh. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
  writeSession(ACCESS_TOKEN_STORAGE_KEY, token);
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  accessToken = readSession(ACCESS_TOKEN_STORAGE_KEY);
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (refreshToken) return refreshToken;
  refreshToken = readSession(REFRESH_TOKEN_STORAGE_KEY);
  return refreshToken;
}

export function clearAuthTokens(): void {
  setAuthTokens(null);
}

export function setAdminRestaurant(restaurant: Restaurant | null): void {
  adminRestaurant = restaurant;
  if (typeof window === "undefined") return;
  if (restaurant) {
    window.sessionStorage.setItem(
      RESTAURANT_STORAGE_KEY,
      JSON.stringify(restaurant),
    );
  } else {
    window.sessionStorage.removeItem(RESTAURANT_STORAGE_KEY);
  }
}

export function getAdminRestaurant(): Restaurant | null {
  if (adminRestaurant) return adminRestaurant;
  adminRestaurant = readRestaurantFromStorage();
  return adminRestaurant;
}

export function getAdminRestaurantId(): string | null {
  return getAdminRestaurant()?.id ?? null;
}

export function getAdminRestaurantName(): string | null {
  return getAdminRestaurant()?.name ?? null;
}

// ---------------------------------------------------------------------------
// Platform operator token — module-scoped + sessionStorage backed
// ---------------------------------------------------------------------------

function readPlatformTokenFromStorage(): string | null {
  return readSession(PLATFORM_TOKEN_STORAGE_KEY);
}

export function setPlatformToken(token: string | null): void {
  platformToken = token;
  if (typeof window === "undefined") return;
  if (token) {
    window.sessionStorage.setItem(PLATFORM_TOKEN_STORAGE_KEY, token);
  } else {
    window.sessionStorage.removeItem(PLATFORM_TOKEN_STORAGE_KEY);
  }
}

export function getPlatformToken(): string | null {
  if (platformToken) return platformToken;
  platformToken = readPlatformTokenFromStorage();
  return platformToken;
}

// ---------------------------------------------------------------------------
// Active branch (multi-branch owners) — localStorage backed.
// When set, it is appended as `branch_id` to admin GET requests so the
// dashboard, kitchen, history, menu and analytics scope to that branch.
// Empty/null means "all branches" (the owner's default scope).
// ---------------------------------------------------------------------------

const ACTIVE_BRANCH_STORAGE_KEY = "oshap-active-branch";
let activeBranchId: string | null = null;

function readActiveBranchFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
}

export function setActiveBranchId(branchId: string | null): void {
  activeBranchId = branchId || null;
  if (typeof window === "undefined") return;
  if (activeBranchId) {
    window.localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, activeBranchId);
  } else {
    window.localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
  }
}

export function getActiveBranchId(): string | null {
  if (activeBranchId) return activeBranchId;
  activeBranchId = readActiveBranchFromStorage();
  return activeBranchId;
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
// Base URL + API version
// ---------------------------------------------------------------------------

/**
 * API mount point and version, owned by the client rather than folded into
 * `VITE_API_BASE_URL`.
 *
 * Keeping it here means a deploy that sets only the origin still works, instead
 * of 404-ing every endpoint with nothing in the failure to explain why. Moving
 * to v2 becomes a one-line change here rather than an env-var migration across
 * three Vercel projects.
 *
 * `VITE_API_BASE_URL` is therefore the **origin only** — e.g. `http://localhost:8000`.
 */
export const API_PREFIX = "/api/v1";

let warnedLegacyBaseUrl = false;

/**
 * Tolerates base URLs left over from when the prefix lived in the env var.
 * Without this, a stale `…/api` value silently produces `/api/api/v1/...` —
 * reintroducing exactly the invisible misconfiguration `API_PREFIX` exists to
 * prevent.
 */
function stripLegacyApiSuffix(url: string): string {
  const stripped = url.replace(/\/api(\/v\d+)?$/, "");
  if (stripped !== url && !warnedLegacyBaseUrl) {
    warnedLegacyBaseUrl = true;
    console.warn(
      `VITE_API_BASE_URL should be the origin only (e.g. "${stripped}"). ` +
        `The "${url.slice(stripped.length)}" suffix is now supplied by the API ` +
        `client as API_PREFIX and has been ignored.`,
    );
  }
  return stripped;
}

export function getBaseUrl(): string {
  if (isMockMode()) return "mock://api";
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Add it to your .env file (see .env.example).",
    );
  }
  return stripLegacyApiSuffix(url.replace(/\/$/, ""));
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Adds `Authorization: Bearer`. Throws if there is no access token. */
  admin?: boolean;
  /** Skips the refresh-and-retry on 401. Used by auth calls themselves. */
  skipAuthRefresh?: boolean;
  /** Adds the `x-platform-token` header. Throws if no token is set. */
  platform?: boolean;
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
  const url = new URL(getBaseUrl() + API_PREFIX + path);
  const sp = buildSearchParams(query);
  sp.forEach((v, k) => url.searchParams.set(k, v));
  return url.toString();
}

// ---------------------------------------------------------------------------
// Response envelope
//
// The FastAPI backend wraps every response as:
//   { success: boolean, message: string, code: number, data: <payload> }
// The in-memory mock returns bare payloads. Unwrap tolerantly so both work —
// callers stay typed against the inner payload either way.
// ---------------------------------------------------------------------------

function unwrapEnvelope(payload: unknown): unknown {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    "code" in payload &&
    "data" in payload
  ) {
    return (payload as { data: unknown }).data;
  }
  return payload;
}

interface ValidationIssue {
  loc?: unknown[];
  msg?: string;
}

/**
 * Pulls the field name out of a Pydantic `loc` — `["body", "restaurant_id"]`,
 * or `["body", "items", 0, "price"]` for a nested one. The leading segment is
 * where the value came from rather than what it was called, so it's skipped;
 * the last remaining string is the field.
 */
function fieldFromLoc(loc: unknown[]): string | null {
  const SOURCES = new Set(["body", "query", "header", "path", "cookie"]);
  for (let i = loc.length - 1; i >= 0; i--) {
    const part = loc[i];
    if (typeof part === "string" && !SOURCES.has(part)) return part;
  }
  return null;
}

/**
 * Turns a 422 into something that names the field.
 *
 * The backend's top-level `message` on a validation failure is the first
 * issue's text alone — "Field required" — which tells a merchant nothing about
 * *which* field, while the answer sits in `data.errors[].loc`. Reported as
 * `restaurant_id: Field required`.
 */
function extractValidationMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;

  // Their envelope nests the issues under `data.errors`; a bare FastAPI
  // response (no envelope) puts the same array straight on `detail`.
  const nested = record.data as Record<string, unknown> | undefined;
  const candidates = [
    nested && typeof nested === "object" ? nested.errors : undefined,
    record.detail,
  ];

  const issues = candidates.find(
    (value): value is ValidationIssue[] =>
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((item) => typeof item === "object" && item !== null),
  );
  if (!issues) return null;

  const described = issues
    .map((issue) => {
      const message = typeof issue.msg === "string" ? issue.msg : null;
      const field = Array.isArray(issue.loc) ? fieldFromLoc(issue.loc) : null;
      if (!message) return field;
      return field ? `${field}: ${message}` : message;
    })
    .filter((line): line is string => Boolean(line));

  if (described.length === 0) return null;

  // Long lists become unreadable in a toast, and past the first few the
  // merchant is going to fix them one at a time anyway.
  const shown = described.slice(0, 3).join("; ");
  const rest = described.length - 3;
  return rest > 0 ? `${shown} (and ${rest} more)` : shown;
}

/**
 * Server error messages arrive under different keys depending on the source:
 * `message` from the backend envelope, `error` from the mock, `detail` from
 * FastAPI's own validation errors.
 *
 * Validation issues are checked first: they name the offending field, which
 * the generic top-level message does not.
 */
function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;

  const validation = extractValidationMessage(payload);
  if (validation) return validation;

  for (const key of ["message", "error", "detail"] as const) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";

  // Scope admin reads to the active branch (if any) via a `branch_id` param.
  const query: NonNullable<RequestOptions["query"]> = { ...options.query };
  if (options.admin && method === "GET") {
    const branchId = getActiveBranchId();
    if (branchId) query.branch_id = branchId;
  }

  if (isMockMode()) {
    return mockRequest(
      path,
      method,
      options.body ?? null,
      buildSearchParams(query),
      options.admin ?? false,
    ) as Promise<T>;
  }

  let body: BodyInit | undefined;
  const baseHeaders: Record<string, string> = {};

  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    baseHeaders["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  if (options.platform) {
    const token = getPlatformToken();
    if (!token) {
      throw new ApiError(401, "Platform token not set", null);
    }
    baseHeaders["x-platform-token"] = token;
  }

  // Headers are rebuilt per attempt so a retry after refresh picks up the new
  // access token rather than resending the expired one.
  const send = async () => {
    const headers = { ...baseHeaders };

    if (options.admin) {
      const token = getAccessToken();
      if (!token) {
        throw new ApiError(401, "Not signed in", null);
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body,
      signal: options.signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const payload: unknown = isJson
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    return { response, payload, isJson };
  };

  let { response, payload, isJson } = await send();

  // Access tokens last 15 minutes, so expiry during an ordinary session is
  // normal rather than exceptional. Trade one silent refresh for kicking a
  // waiter back to the login screen mid-service.
  if (response.status === 401 && options.admin && !options.skipAuthRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      ({ response, payload, isJson } = await send());
    }
  }

  if (!response.ok) {
    if (response.status === 401 && options.admin) {
      handleAdminUnauthorized();
    }
    const message =
      (isJson ? extractErrorMessage(payload) : null) ||
      response.statusText ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, payload);
  }

  return unwrapEnvelope(payload) as T;
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Exchanges the refresh token for a new access token.
 *
 * Single-flight on purpose: a dashboard mounts several queries at once, so an
 * expired token produces a burst of simultaneous 401s. Without this they would
 * each fire their own refresh, and every response after the first would be
 * racing to overwrite the stored token.
 *
 * Uses `fetch` directly rather than `request()` — routing it back through would
 * recurse on its own 401.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const token = getRefreshToken();
  if (!token) return null;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(buildUrl("/auth/refresh", undefined), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: token }),
      });
      if (!res.ok) return null;

      const parsed = unwrapEnvelope(await res.json().catch(() => null));
      const next =
        typeof parsed === "object" && parsed !== null
          ? (parsed as { access_token?: unknown }).access_token
          : null;

      if (typeof next !== "string" || !next) return null;
      setAccessToken(next);
      return next;
    } catch {
      // Network failure — treated the same as a rejected refresh. The caller
      // surfaces the original 401 and the user signs in again.
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function handleAdminUnauthorized(): void {
  clearAuthTokens();
  setAdminRestaurant(null);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED_EVENT));
  }
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
    if (match.status === 401 && admin) {
      handleAdminUnauthorized();
    }
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
