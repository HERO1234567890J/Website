import { api } from './client.js';

/**
 * §14 / §15 — admin review moderation.
 *
 * New reviews land as PENDING; only PUBLISHED rows are returned by
 * the public tour review list. Admins approve or reject from this
 * inbox. Reject optionally carries a reason that lands on the
 * AuditLog row's metadata (REVIEW_REJECTED → { reason }).
 */

export type AdminReviewStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED';

export interface AdminReviewUserRef {
  name: string | null;
  email: string;
}

export interface AdminReviewTourRef {
  id: string;
  slug: string;
  title: string;
}

export interface AdminReview {
  id: string;
  /** 1..5 — backend enforces via DB check + DTO. */
  rating: number;
  title: string | null;
  body: string;
  status: AdminReviewStatus;
  /** ISO-8601 — when the customer submitted. */
  createdAt: string;
  /** ISO-8601 — set when the admin approves; null otherwise. */
  publishedAt: string | null;
  user: AdminReviewUserRef;
  tour: AdminReviewTourRef;
}

export interface AdminReviewListResponse {
  items: AdminReview[];
  total: number;
}

export interface AdminReviewListQuery {
  page?: number;
  pageSize?: number;
  /** Server-side status filter — omit for "all statuses". */
  status?: AdminReviewStatus | '';
}

/**
 * GET /api/admin/reviews — paginated, optional status filter.
 *
 * `pageSize` is capped at 200 server-side.
 */
export function listAdminReviews(
  query: AdminReviewListQuery = {},
): Promise<AdminReviewListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.status) params.set('status', query.status);
  const qs = params.toString();
  return api(`/admin/reviews${qs ? `?${qs}` : ''}`);
}

/**
 * PATCH /api/admin/reviews/:id/approve — PENDING → PUBLISHED.
 *
 * 409 Conflict from the backend if the review is not PENDING
 * (already moderated).
 */
export function approveAdminReview(id: string): Promise<AdminReview> {
  return api(`/admin/reviews/${encodeURIComponent(id)}/approve`, {
    method: 'PATCH',
  });
}

/**
 * PATCH /api/admin/reviews/:id/reject — PENDING → REJECTED.
 *
 * Reason is optional; when present, it's recorded on the
 * AuditLog row's metadata (REVIEW_REJECTED → { reason }).
 */
export function rejectAdminReview(id: string, reason?: string): Promise<AdminReview> {
  return api(`/admin/reviews/${encodeURIComponent(id)}/reject`, {
    method: 'PATCH',
    body: { ...(reason ? { reason } : undefined) },
  });
}