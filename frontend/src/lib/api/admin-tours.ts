import { api } from './client.js';

/**
 * §7 / §15 — admin tour CRUD.
 *
 * Wraps `/api/admin/tours[/:id]`. The backend controller already
 * writes an AuditLog row on every mutation (§15) and the JWT/Roles
 * guards reject non-admins — the frontend just sends the payloads.
 *
 * Money: `startingPrice` is integer EGP piasters per §8.
 *
 * Scope of this client (15G.2):
 *   list / detail / create / update / unpublish + publish toggle.
 * Date sub-CRUD and the image-upload pipeline are deferred — see
 * `PHASE15G_FOLLOW_UPS.md` (FU-3, FU-4).
 */
export interface AdminTourCategory {
  id: string;
  slug: string;
  name: string;
}

export interface AdminTourDestination {
  id: string;
  slug: string;
  name: string;
}

export interface AdminTour {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  category: AdminTourCategory;
  destinationId: string | null;
  destination: AdminTourDestination | null;
  /** Integer EGP piasters (per §8). */
  startingPrice: number;
  currency: string;
  durationDays: number;
  /** Bunny Storage ID or external URL — null until image pipeline lands (FU-3). */
  coverImageId: string | null;
  itinerary: unknown | null;
  included: string[];
  excluded: string[];
  meetingInfo: string | null;
  cancellationPolicy: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTourPayload {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  destinationId?: string | null;
  /** Integer EGP piasters (per §8). */
  startingPrice: number;
  currency?: string;
  durationDays: number;
  coverImageId?: string | null;
  itinerary?: unknown;
  included?: string[];
  excluded?: string[];
  meetingInfo?: string | null;
  cancellationPolicy?: string | null;
  isPublished?: boolean;
}

export type AdminTourPatch = Partial<AdminTourPayload>;

export interface AdminTourListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'PUBLISHED' | 'DRAFT';
}

export interface AdminTourListResponse {
  items: AdminTour[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * GET /api/admin/tours — paginated, optional search + status filter.
 */
export function listAdminTours(query: AdminTourListQuery = {}): Promise<AdminTourListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.search && query.search.trim()) params.set('search', query.search.trim());
  if (query.status) params.set('status', query.status);
  const qs = params.toString();
  return api(`/admin/tours${qs ? `?${qs}` : ''}`);
}

export function getAdminTour(id: string): Promise<AdminTour> {
  return api(`/admin/tours/${encodeURIComponent(id)}`);
}

export function createAdminTour(payload: AdminTourPayload): Promise<AdminTour> {
  return api('/admin/tours', {
    method: 'POST',
    body: payload,
  });
}

export function updateAdminTour(id: string, patch: AdminTourPatch): Promise<AdminTour> {
  return api(`/admin/tours/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  });
}

/**
 * Soft-delete — sets `isPublished = false`. Historical bookings
 * keep their FK so audit + reports stay intact. A future "restore"
 * can flip `isPublished = true` via the regular PATCH.
 */
export function unpublishAdminTour(id: string): Promise<AdminTour> {
  return api(`/admin/tours/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
