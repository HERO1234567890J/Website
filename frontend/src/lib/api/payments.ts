import { api } from './client.js';

/**
 * §11 / §28 — payments.
 *
 * `createPaymentIntent` posts to `/api/payments/intent` with an
 * `Idempotency-Key` header (same pattern as `/api/bookings`). The
 * server reads `amount` and `currency` from the booking row
 * (`booking.total`, `booking.currency`) — the client never
 * supplies them (§8 / §11 hard rule).
 *
 * §28 / §35 — the endpoint accepts BOTH a JWT (registered user)
 * AND a guest call carrying `guestEmail`. The backend verifies
 * guestEmail against the booking's stored `guestEmail` and
 * ThrottlerModule rate-limits 10/min/IP so brute-force
 * enumeration of (bookingId, email) pairs is impractical.
 * `skipRefresh: true` here is intentional — 401 on this endpoint
 * is a real auth problem, not a stale token.
 */

export interface PaymentIntentResponse {
  paymentId: string;
  /** Hosted payment page URL — currently a stub returning a mock
   *  URL until EasyCash's real hosted URL is wired. */
  redirectUrl: string;
  expiresAt?: string;
}

export function createPaymentIntent(
  bookingId: string,
  returnUrl: string,
  cancelUrl: string,
  idempotencyKey: string,
  guestEmail?: string,
): Promise<PaymentIntentResponse> {
  return api('/payments/intent', {
    method: 'POST',
    body: {
      bookingId,
      returnUrl,
      cancelUrl,
      ...(guestEmail ? { guestEmail } : {}),
    },
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    skipRefresh: true,
  });
}
