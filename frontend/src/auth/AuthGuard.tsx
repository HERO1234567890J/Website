import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type UserRole } from './AuthContext';

export interface AuthGuardProps {
  /**
   * Required role. Omit (or pass undefined) to require *any* authenticated
   * user — use that for /account. Pass 'ADMIN' for /admin.
   */
  role?: UserRole;
  /** Path to redirect to when unauthenticated / wrong role. Default '/login'. */
  redirectTo?: string;
  children: ReactNode;
}

/**
 * Phase 15A — route guard for protected pages.
 *
 * - Boot is in flight (`isBooting`) → render a placeholder so the page
 *   doesn't flash a login redirect on hard refresh.
 * - Unauthenticated users → `<Navigate to="/login?next=<current>" replace />`
 * - Authenticated but wrong role → same redirect.
 * - Authorized → renders children unchanged.
 */
export function AuthGuard({ role, redirectTo = '/login', children }: AuthGuardProps) {
  const { user, isBooting } = useAuth();
  const location = useLocation();

  if (isBooting) {
    return (
      <div style={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }}>
        <span aria-hidden style={{ color: 'var(--ink-soft)', opacity: 0.6 }}>Loading…</span>
      </div>
    );
  }

  const next = encodeURIComponent(location.pathname + location.search);

  if (!user || (role && user.role !== role)) {
    return <Navigate to={`${redirectTo}?next=${next}`} replace />;
  }

  return <>{children}</>;
}
