import { api } from './client.js';

/**
 * §15 — admin FAQ management.
 *
 * FAQs are soft-managed via `isActive`: the public `/api/faqs`
 * endpoint only returns active rows. Admin CRUD over
 * `/api/admin/faqs[/:id]`, every mutation audit-logged.
 */

export interface AdminFaq {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  isActive: boolean;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFaqPayload {
  question: string;
  answer: string;
  category?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface AdminFaqListResponse {
  items: AdminFaq[];
  total: number;
}

export interface AdminFaqListQuery {
  page?: number;
  pageSize?: number;
}

/**
 * GET /api/admin/faqs — paginated. `pageSize` capped at 200
 * server-side.
 */
export function listAdminFaqs(
  query: AdminFaqListQuery = {},
): Promise<AdminFaqListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  const qs = params.toString();
  return api(`/admin/faqs${qs ? `?${qs}` : ''}`);
}

/** POST /api/admin/faqs — create. */
export function createAdminFaq(payload: AdminFaqPayload): Promise<AdminFaq> {
  return api('/admin/faqs', { method: 'POST', body: payload });
}

/** PATCH /api/admin/faqs/:id — update. */
export function updateAdminFaq(id: string, payload: AdminFaqPayload): Promise<AdminFaq> {
  return api(`/admin/faqs/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload });
}

/** DELETE /api/admin/faqs/:id — deactivate (hidden from public). */
export function deactivateAdminFaq(id: string): Promise<AdminFaq> {
  return api(`/admin/faqs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}