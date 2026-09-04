import { useCallback, useState } from 'react';
import { useAuth, type User } from '@/auth/AuthContext';
import { ApiError } from '@/lib/api/client';

/**
 * Phase 15A — auth flow hook.
 *
 * Thin wrapper over the `useAuth()` context that adds per-action
 * loading + error state (so Login / Signup pages can show spinners
 * and inline error messages without each page rebuilding the
 * state machine). Network calls live in AuthProvider; this hook
 * never fetches anything itself.
 */
export interface UseAuthFlowResult {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetError: () => void;
}

/** Map any thrown value to a user-facing string. */
function toMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string | string[] } | null;
    if (body && typeof body === 'object') {
      const m = body.message;
      if (Array.isArray(m) && m.length > 0) return m[0];
      if (typeof m === 'string' && m) return m;
    }
    if (err.status === 401) return 'Invalid email or password.';
    if (err.status === 409) return 'An account with that email already exists.';
    if (err.status === 429) return 'Too many attempts. Please try again later.';
    if (err.status >= 500) return 'Server error. Please try again.';
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function useAuthFlow(): UseAuthFlowResult {
  const { user, login: ctxLogin, register: ctxRegister, logout: ctxLogout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetError = useCallback(() => setError(null), []);

  const run = useCallback(
    async (action: () => Promise<void>, fallbackMsg: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        await action();
      } catch (err) {
        setError(toMessage(err, fallbackMsg));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const login = useCallback(
    (email: string, password: string) =>
      run(() => ctxLogin(email, password), 'Could not sign in.'),
    [ctxLogin, run],
  );

  const register = useCallback(
    (name: string, email: string, password: string) =>
      run(() => ctxRegister(name, email, password), 'Could not create your account.'),
    [ctxRegister, run],
  );

  const logout = useCallback(() => run(() => ctxLogout(), 'Could not sign out.'), [ctxLogout, run]);

  return { user, isLoading, error, login, register, logout, resetError };
}
