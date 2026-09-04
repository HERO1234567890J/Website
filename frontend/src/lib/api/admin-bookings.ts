import { api } from './client.js';

/**
 * §8 / §10 / §15 — admin booking inbox.
 *
 * Wraps `/api/admin/bookings[/:id]`. The backend controller uses
 * the booking state-machine (`./state-machine.ts` on the backend)
 * to enforce legal transitions; the frontend just sends the target
 * status and a reason. Anything illegal throws 400 from the server.
 *
 * Money: `subtotal` / `discountAmount` / `total` are integer EGP
 * piasters per §8.
 */

export type AdminBookingStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';

export type AdminBookingOrigin = 'TOUR' | 'CUSTOM_TRIP';

export interface AdminBookingTourRef {
  id: string;
  slug: string;
  title: string;
}

export interface AdminBookingTourDateRef {
  id: string;
  startDate: string;
  endDate: string;
}

export interface AdminBookingUserRef {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Single booking row — list endpoint includes the lightweight tour /
 * tourDate / user joins; the detail endpoint returns this same
 * shape (without joins) per `BookingsService.getById`.
 */
export interface AdminBooking {
  id: string;
  userId: string | null;
  guestEmail: string;
  guestName: string;
  guestPhone: string | null;
  origin: AdminBookingOrigin;
  tourId: string | null;
  tourDateId: string | null;
  tripRequestId: string | null;
  travelerCount: number;
  travelerNames: string[];
  specialRequests: string | null;
  pickupLocation: string | null;
  /** Integer EGP piasters (per §8). */
  subtotal: number;
  /** Integer EGP piasters (per §8). */
  discountAmount: number;
  /** Integer EGP piasters (per §8). */
  total: number;
  currency: string;
  promoCodeId: string | null;
  /** ISO-8601 timestamp from JSON serialization (§8 — consent stored). */
  consentAcceptedAt: string;
  status: AdminBookingStatus;
  createdAt: string;
  updatedAt: string;
  /** Lightweight joins — only populated on the list endpoint. */
  tour?: AdminBookingTourRef | null;
  tourDate?: AdminBookingTourDateRef | null;
  user?: AdminBookingUserRef | null;
  latestPayment?: { gateway: string; status: string; amount: number } | null;
}

export interface AdminBookingListResponse {
  items: AdminBooking[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminBookingListQuery {
  page?: number;
  pageSize?: number;
  status?: AdminBookingStatus | '';
  /** Matches against guestEmail, guestName, or exact UUID. */
  search?: string;
}

export interface AdminBookingPatch {
  status: AdminBookingStatus;
  reason?: string;
}

/**
 * GET /api/admin/bookings — paginated, optional status + search.
 *
 * `pageSize` is capped at 200 server-side; the frontend defaults to
 * 25 so the table stays readable.
 */
export function listAdminBookings(
  query: AdminBookingListQuery = {},
): Promise<AdminBookingListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.status) params.set('status', query.status);
  if (query.search && query.search.trim()) params.set('search', query.search.trim());
  const qs = params.toString();
  return api(`/admin/bookings${qs ? `?${qs}` : ''}`);
}

/**
 * GET /api/admin/bookings/:id — full booking row (no joins).
 *
 * The list endpoint already returns the joined tour / tourDate /
 * user refs alongside each row, so this is mainly used to fetch
 * the fields the list doesn't surface (travelerNames,
 * specialRequests, pickupLocation, consentAcceptedAt) when
 * opening the detail modal.
 */
export function getAdminBooking(id: string): Promise<AdminBooking> {
  return api(`/admin/bookings/${encodeURIComponent(id)}`);
}

/**
 * PATCH /api/admin/bookings/:id — state-machine transition.
 *
 * The backend rejects illegal transitions (400). `reason` is
 * optional and ends up in the AuditLog row.
 */
export function updateAdminBooking(
  id: string,
  patch: AdminBookingPatch,
): Promise<AdminBooking> {
  return api(`/admin/bookings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  });
}

export interface BookingsStats {
  totalCount: number;
  revenueEgp: number;
  pendingPaymentCount: number;
  cancelledCount: number;
}

export function getBookingsStats(): Promise<BookingsStats> {
  return api('/admin/bookings/stats');
}
