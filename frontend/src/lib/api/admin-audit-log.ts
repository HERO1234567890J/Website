import { api } from './client.js';

/**
 * §15 — read-only audit log viewer.
 *
 * Base URL /api/admin/audit-log. No mutations live here — the
 * write-only AuditLogService stays untouched.
 */

export interface AuditLogEntry {
  id: string;
  adminUserId: string;
  admin: { email: string; name: string | null; role: string };
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  adminUserId?: string;
}

/** GET /api/admin/audit-log — newest first, with selectable filters. */
export function listAdminAuditLog(
  query: AuditLogQuery = {},
): Promise<{ items: AuditLogEntry[]; total: number }> {
  const qs = new URLSearchParams();
  qs.set('page', String(query.page ?? 1));
  qs.set('pageSize', String(query.pageSize ?? 100));
  for (const key of ['action', 'entityType', 'entityId', 'adminUserId'] as const) {
    const v = query[key];
    if (v) qs.set(key, v);
  }
  return api(`/admin/audit-log?${qs.toString()}`);
}