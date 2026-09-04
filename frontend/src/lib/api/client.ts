/**
 * Minimal fetch wrapper for the backend API.
 *
 *   Base URL: same-origin `/api` (Vite dev proxy in dev, nginx in prod
 *   per Phase 15A §6.7 — both serve the SPA and API from one origin,
 *   so the refresh-token cookie flows natively).
 *
 *   - Injects `Content-Type: application/json` by default.
 *   - On 401 (except for /api/auth/* endpoints), transparently calls
 *     `POST /api/auth/refresh` once and retries the original request.
 *     Only one refresh is in flight at a time — concurrent 401s share
 *     the same in-flight promise to avoid a stampede.
 *   - On refresh failure: invokes the registered unauthorized handler
 *     (wired by AuthProvider to clear state + redirect to /login).
 *   - Throws `ApiError` on non-2xx so callers can branch on status.
 *
 *   Access token lives in module-level memory (set by AuthProvider via
 *   `setAccessToken`); refresh token lives in an httpOnly cookie set by
 *   the backend. Neither touches localStorage per §18 + Phase 15A §6.2.
 */

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API status ${status}`);
  }
}

export interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /**
   * Skip the 401 → refresh → retry cycle. Set this on the auth endpoints
   * themselves (`/api/auth/login|register|logout|refresh`) so a bad
   * password doesn't try to refresh and so the refresh call itself
   * doesn't recurse.
   */
  skipRefresh?: boolean;
}

// ─── module-level auth state ─────────────────────────────────────────

let accessToken: string | null = null;
type RefreshHandler = () => Promise<boolean>;
type UnauthorizedHandler = () => void;

let refreshHandler: RefreshHandler | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function registerRefreshHandler(handler: RefreshHandler): void {
  refreshHandler = handler;
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

// ─── refresh + retry ─────────────────────────────────────────────────

async function performRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      if (refreshHandler) return await refreshHandler();
      // No handler registered yet (AuthProvider hasn't mounted). Fall
      // back to a direct refresh — the AuthProvider's own silent
      // refresh on mount will reconcile state if it later succeeds.
      const res = await fetch(API_BASE + '/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function readErrorBody(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return res.text().catch(() => null);
  }
}

function buildHeaders(extra: HeadersInit | undefined, tokenOverride?: string | null): HeadersInit {
  const token = tokenOverride !== undefined ? tokenOverride : accessToken;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra),
  };
}

async function doFetch<T>(path: string, options: ApiOptions): Promise<T> {
  const { body, headers, skipRefresh: _skipRefresh, ...rest } = options;
  const init: RequestInit = {
    ...rest,
    credentials: 'same-origin',
    headers: buildHeaders(headers),
    body: body === undefined ? undefined : JSON.stringify(body),
  };
  const res = await fetch(API_BASE + path, init);
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    throw new ApiError(res.status, await readErrorBody(res));
  }
  return (await res.json()) as T;
}

// ─── public api ──────────────────────────────────────────────────────

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { skipRefresh } = options;
  try {
    return await doFetch<T>(path, options);
  } catch (err) {
    // Only attempt refresh on HTTP 401 with a registered handler.
    // Network errors throw TypeError — never trigger refresh.
    if (!(err instanceof ApiError) || err.status !== 401 || skipRefresh || refreshHandler === null) {
      throw err;
    }
    const refreshed = await performRefresh();
    if (!refreshed) {
      // Refresh failed — fire the unauthorized handler so the
      // AuthProvider can clear state + redirect to /login.
      unauthorizedHandler?.();
      throw err;
    }
    // Retry the original request exactly once with the new access token.
    return await doFetch<T>(path, options);
  }
}
