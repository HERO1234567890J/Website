import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  registerRefreshHandler,
  registerUnauthorizedHandler,
  setAccessToken as setAccessTokenInModule,
  type ApiError,
} from '@/lib/api/client';

/**
 * Auth state container — Phase 15A.
 *
 * Architecture (Phase 15A §6.1/§6.2):
 *   - Access token lives in React state (memory only — never
 *     localStorage; spec §18).
 *   - Refresh token is delivered by the backend as an httpOnly
 *     secure cookie. The browser sends it automatically on
 *     same-origin requests (Vite proxy in dev, nginx in prod).
 *   - This provider registers a refresh handler with the api()
 *     client so 401s transparently rotate the access token.
 *
 * Boot flow:
 *   - On mount, fire `POST /api/auth/refresh` silently. If the
 *     cookie is still valid, the user stays logged in across page
 *     reloads. If not, the user is anonymous until they log in.
 *   - `isBooting` is true while this silent refresh is in flight;
 *     the AuthGuard uses it to avoid a flash-of-login redirect on
 *     hard refresh.
 *
 * Login / register / logout are thin wrappers around api() that
 * mutate the local state on success. They set `skipRefresh: true`
 * so a bad password doesn't try to refresh and the refresh call
 * itself doesn't recurse.
 */

export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export interface AuthSuccessResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface AuthState {
  user: User | null;
  /** In-memory access token. Never persisted to localStorage. */
  accessToken: string | null;
  /** True while the silent refresh-on-mount is in flight. */
  isBooting: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Manual refresh — exposed mainly for tests / future hooks. */
  refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const handlersRegistered = useRef(false);

  // ─── register api() handlers + sync token to module-level ─────────
  //
  // The refresh + unauthorized handlers are registered synchronously
  // during the first render of the provider (guarded by useRef). This
  // guarantees the api() client has handlers BEFORE any child useEffect
  // fires, eliminating the auth-race that would otherwise happen on
  // pages that call api() during their own mount.

  if (!handlersRegistered.current) {
    handlersRegistered.current = true;
    registerRefreshHandler(async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
        });
        if (!res.ok) return false;
        const data = (await res.json()) as AuthSuccessResponse;
        setAccessToken(data.accessToken);
        setUser(data.user);
        return true;
      } catch {
        return false;
      }
    });
    registerUnauthorizedHandler(() => {
      setUser(null);
      setAccessToken(null);
      // Hard redirect on session expiry so any in-memory state (form
      // drafts, etc.) is wiped by the reload. Preserves the path so
      // the user lands back where they started after re-auth.
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.assign(`/login?next=${next}`);
    });
  }

  useEffect(() => {
    setAccessTokenInModule(accessToken);
  }, [accessToken]);

  // ─── silent refresh on mount ───────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
        });
        if (!res.ok) return;
        const data = (await res.json()) as AuthSuccessResponse;
        if (cancelled) return;
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch {
        // Network error — leave the user unauthenticated.
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── public actions ────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<AuthSuccessResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipRefresh: true,
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await api<AuthSuccessResponse>('/auth/register', {
        method: 'POST',
        body: { name, email, password },
        skipRefresh: true,
      });
      setAccessToken(data.accessToken);
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST', skipRefresh: true });
    } catch (err) {
      // Even if the server-side revoke fails (e.g. session already
      // expired), we always clear local state — the user is logged
      // out from the client's perspective.
      if (!(err instanceof Error) || (err as ApiError).status >= 500) {
        // 4xx is fine to ignore (already unauth); re-throw 5xx.
        if (err instanceof Error && (err as ApiError).status >= 500) throw err;
      }
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) return false;
      const data = (await res.json()) as AuthSuccessResponse;
      setAccessToken(data.accessToken);
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  // ─── context value ─────────────────────────────────────────────────

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      isBooting,
      login,
      register,
      logout,
      refresh,
    }),
    [user, accessToken, isBooting, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
