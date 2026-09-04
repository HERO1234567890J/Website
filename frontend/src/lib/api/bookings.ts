import { api } from './client.js';

/**
 * §8 / §10 / §11 — bookings.
 *
 * `createBooking` posts to `/api/bookings`. The endpoint is
 * §28-friendly (guest checkout allowed) but `consentAcceptedAt`
 * is REQUIRED on every call (§8 — T&C + Privacy consent must be
 * stored with a timestamp).
 *
 * `Idempotency-Key` is REQUIRED as a request header — the backend
 * uses it to short-circuit duplicate submits (double-click, page
 * reload, retry). Generate it client-side with `crypto.randomUUID()`
 * per Phase 15A §6.1; the same key on a retry returns the existing
 * booking instead of creating a new one.
 */

export type BookingOrigin = 'TOUR' | 'CUSTOM_TRIP';

export interface CreateBookingPayload {
  origin: BookingOrigin;
  /** Required when origin === 'TOUR' — the Tour.id (UUID). */
  tourId?: string;
  /** Required when origin === 'TOUR' — the TourDate.id (UUID). */
  tourDateId?: string;
  /** Required when origin === 'CUSTOM_TRIP' — the TripRequest.id. */
  tripRequestId?: string;
  travelerCount: number;
  travelerNames?: string[];
  specialRequests?: string;
  pickupLocation?: string;
  /** §8 — ISO-8601 timestamp of when the user ticked the consent box. */
  consentAcceptedAt: string;
  /** Promo code (Phase 15E wires the UI; server still re-validates). */
  promoCode?: string;
  // Guest fields (§28) — required when the request is unauthenticated.
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
}

export interface BookingResponse {
  id: string;
  userId: string | null;
  guestEmail: string;
  guestName: string;
  origin: BookingOrigin;
  tourId: string | null;
  tourDateId: string | null;
  tripRequestId: string | null;
  travelerCount: number;
  /** Server-authoritative — integer EGP piasters per §8. */
  subtotal: number;
  discountAmount: number;
  total: number;
  currency: string;
  consentAcceptedAt: string;
  status:
    | 'DRAFT'
    | 'PENDING'
    | 'PAYMENT_PENDING'
    | 'PAID'
    | 'CONFIRMED'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'FAILED'
    | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
}

/**
 * Generate a UUID for the `Idempotency-Key` header. Falls back to
 * a timestamp+random hybrid for older browsers without crypto.randomUUID.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Last-resort fallback. Still 36 chars, still unique per call.
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createBooking(
  payload: CreateBookingPayload,
  idempotencyKey: string,
): Promise<BookingResponse> {
  return api('/bookings', {
    method: 'POST',
    body: payload,
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    skipRefresh: true, // 401 here is a real auth issue, not a stale token
  });
}

/**
 * §28 — list the current user's bookings (authenticated). Used by
 * /account (15E).
 */
export function listMyBookings(): Promise<BookingResponse[]> {
  return api('/bookings');
}

export function getBooking(id: string): Promise<BookingResponse> {
  return api(`/bookings/${encodeURIComponent(id)}`);
}

export function cancelBooking(
  id: string,
  reason?: string,
): Promise<BookingResponse> {
  return api(`/bookings/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}
