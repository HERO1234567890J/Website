import { api } from './client.js';
import { getSiteContentBatch, type SiteContentRow } from './site-content.js';

/**
 * §15 / §27 — admin site-content editor.
 *
 * Reads go through the public batch endpoint (server returns the
 * requested-locale row or the default-locale fallback). Writes use
 * PUT /api/admin/site-content/:key/:locale (audit-logged).
 */

/** GET /api/admin/site-content/keys — all keys present in the DB. */
export function listAdminSiteContentKeys(): Promise<string[]> {
  return api('/admin/site-content/keys');
}

export interface AdminSiteContentPayload {
  content: Record<string, unknown>;
}

/** PUT /api/admin/site-content/:key/:locale — upsert one row. */
export function putAdminSiteContent(
  key: string,
  locale: string,
  content: Record<string, unknown>,
): Promise<SiteContentRow> {
  return api(`/admin/site-content/${encodeURIComponent(key)}/${encodeURIComponent(locale)}`, {
    method: 'PUT',
    body: { content },
  });
}

/** Re-export so the Settings editor can load rows in one round trip. */
export { getSiteContentBatch };
export type { SiteContentRow };