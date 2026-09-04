import { api } from './client.js';

/**
 * §13 / §15 — admin user management.
 *
 * Wraps `/api/admin/users[/:id]`. The backend controller uses
 * `@Roles('ADMIN')` + JWT access guard; only admins can hit it.
 *
 * What this client exposes:
 *   listAdminUsers — paginated + searchable over email / name.
 *   updateAdminUserRole — only mutation allowed (PATCH the `role`
 *     field). Audit-logged on the backend (`USER_ROLE_CHANGED`).
 *
 * What this client does NOT expose (and why):
 *   - Block/unblock — the backend has no `isBlocked` field on
 *     User (per Prisma schema). See PHASE15G_FOLLOW_UPS.md (FU-10)
 *     for the gap.
 *   - Bookings count + total spent — would need a join + aggregate
 *     in the list query. Same FU-10.
 *   - Reset password / force logout — explicit decision in §13 to
 *     ship v1 with role-only mutations; the user self-service
 *     flows cover password reset, and the refresh-token rotation
 *     already invalidates other sessions on password change.
 */

export type AdminUserRole = 'CUSTOMER' | 'ADMIN';

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: AdminUserRole;
  /** ISO-8601 or null — null means the user hasn't verified yet. */
  emailVerifiedAt: string | null;
  /** §15 / §18 — admin-managed block flag. */
  isBlocked: boolean;
  /** Free-text reason set by the admin on block (null when unblocked). */
  blockReason: string | null;
  /** ISO-8601 timestamp of the most recent block (null when unblocked). */
  blockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Total bookings (all statuses). */
  bookingsCount: number;
  /** Sum of booking.total for PAID/CONFIRMED/COMPLETED — integer EGP piasters. */
  totalSpentEgp: number;
}

export interface AdminUserListQuery {
  page?: number;
  pageSize?: number;
  /** Case-insensitive contains match against email OR name. */
  search?: string;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
}

/**
 * GET /api/admin/users — paginated, optional search.
 *
 * `pageSize` is capped at 200 server-side.
 */
export function listAdminUsers(
  query: AdminUserListQuery = {},
): Promise<AdminUserListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.search && query.search.trim()) params.set('search', query.search.trim());
  const qs = params.toString();
  return api(`/admin/users${qs ? `?${qs}` : ''}`);
}

/**
 * PATCH /api/admin/users/:id — change a user's role.
 *
 * Only the role field is mutable via this endpoint (per §13 —
 * admin can promote/demote but cannot edit profile fields,
 * which the user owns). The backend writes an AuditLog row
 * capturing `from` and `to` role.
 */
export function updateAdminUserRole(
  id: string,
  role: AdminUserRole,
): Promise<{ id: string; role: AdminUserRole }> {
  return api(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { role },
  });
}

/**
 * §15 / §18 — admin-managed user block.
 *
 * On `blocked: true` the backend revokes every active refresh
 * token for this user (force-logout on every device) and writes
 * a `USER_BLOCKED` audit row. The next request from the user
 * returns 403 from JwtAccessGuard / JwtRefreshGuard regardless
 * of any still-valid access token.
 *
 * On `blocked: false` the user's block flag is cleared. Their
 * existing refresh tokens were already revoked when the block
 * was set, so they'll need to log in again to get a new session.
 *
 * The backend rejects attempts to block the calling admin's own
 * account (400) — the frontend also disables the UI.
 */
export function setAdminUserBlocked(
  id: string,
  blocked: boolean,
  reason?: string,
): Promise<{
  id: string;
  isBlocked: boolean;
  blockReason: string | null;
  blockedAt: string | null;
}> {
  return api(`/admin/users/${encodeURIComponent(id)}/block`, {
    method: 'PATCH',
    body: { blocked, ...(reason ? { reason } : {}) },
  });
}

export function exportUsersCsv(search?: string): string {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const qs = params.toString();
  return `/api/admin/users/csv${qs ? `?${qs}` : ''}`;
}
